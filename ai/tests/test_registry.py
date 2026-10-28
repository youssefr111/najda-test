"""Run:  pytest -q   (or: python tests/test_registry.py)

Builds a SYNTHETIC model with the same column shape as Vitals_Severity.ipynb, exports it with the real
export tool, then exercises the registry. It validates the plumbing, not clinical quality.
Also shows the loop you should run for every real delivery: golden cases must reproduce.
"""
import json
import sys
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from app.registry import InputValidationError, ModelLoadError, Registry  # noqa: E402
from export_model import export_model  # noqa: E402

NUMERIC = ["age", "systolic_bp", "diastolic_bp", "heart_rate", "respiratory_rate", "temperature", "spo2",
           "pain_score", "wbc", "hemoglobin", "platelet_count", "sodium", "potassium", "creatinine", "glucose",
           "troponin", "bnp", "lactate", "inr", "arrival_hour", "arrival_dayofweek", "is_night", "is_weekend"]


def make_package(root: Path) -> None:
    rng = np.random.default_rng(0)
    n = 600
    X = pd.DataFrame({c: rng.normal(50, 15, n) for c in NUMERIC})
    X["spo2"] = rng.uniform(70, 100, n)
    X["heart_rate"] = rng.uniform(40, 180, n)
    X["sex"] = rng.choice(["F", "M"], n)
    X = X[["age", "sex", *[c for c in NUMERIC if c != "age"]]]
    X.loc[rng.random(n) < 0.3, "lactate"] = np.nan  # NaNs like the real data
    esi = np.clip(5 - ((X["heart_rate"] > 120).astype(int) + (X["spo2"] < 88).astype(int) * 2 + rng.integers(0, 3, n)), 1, 5)
    y = esi.to_numpy() - 1
    pipe = Pipeline([
        ("pre", ColumnTransformer([("sex", Pipeline([("imp", SimpleImputer(strategy="constant", fill_value="missing")),
                                          ("ohe", OneHotEncoder(handle_unknown="ignore"))]), ["sex"])], remainder="passthrough")),
        ("model", HistGradientBoostingClassifier(max_iter=30, random_state=0)),
    ]).fit(X, y)
    export_model(pipe, X, labels=[1, 2, 3, 4, 5], name="vitals_severity", version="1.0.0", out_dir=str(root),
                 required=["heart_rate", "spo2"], hard_limits={"spo2": (0, 100), "heart_rate": (0, 300)},
                 units={"temperature": "degC"}, metrics={"synthetic": True})
    (root / "registry.json").write_text(json.dumps({"vitals_severity": {"active": "1.0.0"}}))


def load(root: Path) -> Registry:
    reg = Registry(root)
    reg.load_all()
    assert not reg.failures, reg.failures
    return reg


def test_golden_cases_reproduce_and_validation_works():
    with tempfile.TemporaryDirectory() as d:
        root = Path(d)
        make_package(root)
        model = load(root).get("vitals_severity")

        # 1. every golden case reproduces its expected label through the public predict()
        for case in json.loads((root / "vitals_severity/1.0.0/golden.json").read_text()):
            out = model.predict(case["input"])
            assert out["prediction"]["label"] == case["expected_label"]
            assert abs(sum(out["prediction"]["probabilities"].values()) - 1) < 1e-6

        # 2. only a few fields + NaN-native model still answers; missing ones are reported
        out = model.predict({"heart_rate": 150, "spo2": 82, "sex": "M"})
        assert "lactate" in out["missing_features"] and out["prediction"]["label"] in "12345"

        # 3. bad input is rejected with readable errors
        for bad, needle in [({"heart_rate": 150}, "spo2: required"),
                            ({"heart_rate": 150, "spo2": 140}, "outside allowed range"),
                            ({"heart_rate": 150, "spo2": 90, "sex": "X"}, "not in"),
                            ({"heart_rate": 150, "spo2": 90, "pain": 3}, "unknown features")]:
            try:
                model.predict(bad)
                raise AssertionError(f"accepted bad input {bad}")
            except InputValidationError as e:
                assert needle in str(e), (needle, str(e))

        # 4. outside training range -> warning, not failure
        out = model.predict({"heart_rate": 299, "spo2": 90})
        assert any("training range" in w for w in out["warnings"])


def test_tampered_artifact_is_refused():
    with tempfile.TemporaryDirectory() as d:
        root = Path(d)
        make_package(root)
        with open(root / "vitals_severity/1.0.0/model.joblib", "ab") as f:
            f.write(b"x")
        reg = Registry(root)
        reg.load_all()
        assert "vitals_severity@1.0.0" in reg.failures and "hash mismatch" in reg.failures["vitals_severity@1.0.0"]


if __name__ == "__main__":
    test_golden_cases_reproduce_and_validation_works()
    test_tampered_artifact_is_refused()
    print("OK")
