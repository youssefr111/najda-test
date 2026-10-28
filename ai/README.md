# Najda AI model service

One Python service, many models. Adding a model = adding a folder. No code changes for sklearn/XGBoost pipelines.

```
models/
  registry.json                      # which version is active (+ optional shadow versions)
  vitals_severity/
    1.0.0/
      model.joblib                   # ONE fitted sklearn Pipeline (preprocessing inside)
      manifest.json                  # THE CONTRACT: features, types, units, ranges, labels, metrics, hashes
      golden.json                    # inputs + expected labels, generated at export
```

## How a model is called

```
GET  /health                                   (no auth)  loaded models + load failures
GET  /v1/models                                list
GET  /v1/models/vitals_severity                the manifest = exact features the model expects
POST /v1/models/vitals_severity/predict        ?version=1.1.0 optional (shadow testing)
     {"features": {"heart_rate": 132, "spo2": 86, "age": 54, "sex": "M"}}      header: X-Api-Key
->   {"model": "vitals_severity", "version": "1.0.0",
      "prediction": {"label": "2", "confidence": 0.71, "probabilities": {"1": 0.18, "2": 0.71, ...}},
      "missing_features": ["lactate", ...], "warnings": []}
```

Omitted or null features are treated as missing (the model must handle NaN). Unknown feature names,
out-of-range values and unknown categories are rejected with 422 and a list of errors.

## What the AI team must deliver (every model, every version)

Run `tools/export_model.py` as the last notebook cell. It refuses to export if the pipeline is not shippable.

1. **A single fitted `Pipeline` trained on RAW inputs.** Encoders, imputers and scalers live inside it
   (`ColumnTransformer`). No `pd.get_dummies` / separate `LabelEncoder` on the side. The notebook currently
   does these manually, so the final cell must be re-trained as a pipeline (template below).
2. Use only standard sklearn/xgboost classes (no custom Python classes: they break unpickling here).
3. Categorical features need an imputer so a missing value does not crash (`export_model` probes this).
4. `labels` = what each class index means (`le.classes_`, e.g. ESI `[1,2,3,4,5]`).
5. `required` features, `hard_limits` (clinically impossible values, e.g. SpO2 > 100), `units`.
6. `metrics` that matter for triage: **recall for ESI 1-2**, per-class recall, confusion matrix, not just accuracy.

```python
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBClassifier

X_raw = df_clean.drop(columns=["esi_level"])      # sex still a string column here
y = LabelEncoder().fit_transform(df_clean["esi_level"])
pre = ColumnTransformer(
    [("sex", Pipeline([("imp", SimpleImputer(strategy="constant", fill_value="missing")),
                       ("ohe", OneHotEncoder(handle_unknown="ignore"))]), ["sex"])],
    remainder="passthrough")                       # numeric NaNs are handled natively by XGBoost / HistGB
pipeline = Pipeline([("pre", pre), ("model", XGBClassifier(...))]).fit(X_train_raw, y_train)
export_model(pipeline, X_train_raw, labels=list(le.classes_), name="vitals_severity", version="1.0.0", ...)
```

## Your side when a new version arrives

1. Drop the folder into `models/<name>/<version>/`.
2. `git diff` the **manifest.json**: it lists exactly which features, units, ranges and labels changed. This is how you
   confirm "what exact features are used" without reading a notebook.
3. Run `pytest`. Add your own safety cases (e.g. SpO2 70 + UNRESPONSIVE must never be a low-acuity class).
4. Optional shadow period: set `"also_load": ["1.1.0"]`, have Spring call both versions, log both, show only the active.
5. Flip `"active"` in `registry.json`. Rollback = flip it back.

At startup each package is checked: file hash matches the manifest, and scikit-learn / xgboost versions match what it
was trained with. A bad package is reported on `/health` as `degraded` without taking the other models down.

## Security

`joblib` files can execute code on load. Only load artifacts your team built, keep `models/` out of any
user-writable location, and keep this service on the internal Docker network (no published port).

## docker-compose

```yaml
  inference:
    build: ./ai
    restart: unless-stopped
    environment: { AI_API_KEY: "${AI_API_KEY}" }
  backend:
    environment:
      AI_URL: http://ai:8000
      AI_API_KEY: ${AI_API_KEY}
```
Spring: `najda.ai.url=${AI_URL}`, `najda.ai.api-key=${AI_API_KEY}` (see ../INSTALL.md).
