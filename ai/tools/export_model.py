"""Run this as the LAST cell of the notebook. It turns a trained Pipeline into a deliverable package.

    from export_model import export_model
    export_model(
        pipeline, X_train_raw,                      # X_train_raw = the RAW input columns, before any manual encoding
        labels=list(le.classes_),                   # e.g. [1, 2, 3, 4, 5]  (index i of predict_proba -> labels[i])
        name="vitals_severity", version="1.0.0", out_dir="models",
        required=["heart_rate", "systolic_bp", "spo2"],
        hard_limits={"spo2": (0, 100), "heart_rate": (0, 300)},
        units={"temperature": "degC", "pain_score": "0-10 NRS"},
        metrics={"macro_f1": ..., "recall_esi_1_2": ...},
        training={"dataset": "fedmml_ed_triage_dataset.csv", "notebook": "Vitals_Severity.ipynb", "notes": ""},
    )
"""
from __future__ import annotations

import hashlib
import json
import platform
import sys
from datetime import datetime, timezone
from importlib import metadata
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


def _ver(lib: str) -> str | None:
    try:
        return metadata.version(lib)
    except metadata.PackageNotFoundError:
        return None


def export_model(pipeline, X_raw: pd.DataFrame, labels: list, name: str, version: str, out_dir: str = "models",
                 *, required=(), hard_limits=None, units=None, metrics=None, training=None, n_golden: int = 10):
    if not hasattr(pipeline, "predict_proba") or not hasattr(pipeline, "classes_"):
        raise ValueError("export a fitted Pipeline that has predict_proba (preprocessing INSIDE the pipeline)")
    if [int(c) for c in pipeline.classes_] != list(range(len(labels))):
        raise ValueError("pipeline.classes_ must be 0..n-1 and match `labels` order")
    hard_limits, units = hard_limits or {}, units or {}

    features = []
    for col in X_raw.columns:
        s = X_raw[col]
        spec = {"name": col, "nullable": col not in required}
        if pd.api.types.is_numeric_dtype(s) and not pd.api.types.is_bool_dtype(s):
            spec |= {"type": "number", "training_min": float(s.min()), "training_max": float(s.max())}
            lo, hi = hard_limits.get(col, (None, None))
            spec |= {"hard_min": lo, "hard_max": hi}
        else:
            spec |= {"type": "category", "allowed": sorted(map(str, s.dropna().unique()))}
        if col in units:
            spec["unit"] = units[col]
        features.append(spec)

    folder = Path(out_dir) / name / version
    folder.mkdir(parents=True, exist_ok=True)
    artifact = folder / "model.joblib"
    joblib.dump(pipeline, artifact, compress=3)

    # --- verify the file we just wrote reproduces the in-memory model exactly ---
    reloaded = joblib.load(artifact)
    sample = X_raw.sample(min(n_golden, len(X_raw)), random_state=0)
    if not np.allclose(pipeline.predict_proba(sample), reloaded.predict_proba(sample)):
        raise RuntimeError("reloaded model disagrees with original -- do not ship")


    # --- every nullable feature must be survivable when missing (crew won't fill everything) ---
    base = X_raw.iloc[[0]].copy()
    for spec in features:
        if spec["nullable"]:
            probe = base.copy()
            probe[spec["name"]] = np.nan
            try:
                reloaded.predict_proba(probe)
            except Exception as e:
                raise RuntimeError(
                    f"pipeline fails when '{spec['name']}' is missing ({type(e).__name__}). "
                    "Add an imputer inside the pipeline (e.g. SimpleImputer(strategy='constant', "
                    "fill_value='missing') before OneHotEncoder) or mark it required.") from e

    # --- golden cases: inputs + the output this version produced (regression tests for future versions) ---
    probs = reloaded.predict_proba(sample)
    golden = []
    for (_, r), p in zip(sample.iterrows(), probs):
        inp = {k: (None if pd.isna(v) else (v.item() if hasattr(v, "item") else v)) for k, v in r.items()}
        golden.append({"input": inp, "expected_label": str(labels[int(np.argmax(p))])})
    (folder / "golden.json").write_text(json.dumps(golden, indent=2))

    rep = repr(pipeline).lower()
    libs = {l: v for l in ("scikit-learn", "xgboost", "lightgbm") if (v := _ver(l)) and
            (l == "scikit-learn" or l in rep)}
    manifest = {
        "schema_version": 1, "name": name, "version": version, "task": "classification",
        "artifact": {"file": artifact.name, "sha256": hashlib.sha256(artifact.read_bytes()).hexdigest()},
        "libraries": libs,
        "environment": {"python": sys.version.split()[0], "numpy": _ver("numpy"), "pandas": _ver("pandas"),
                        "platform": platform.platform()},
        "features": features,
        "labels": [l.item() if hasattr(l, "item") else l for l in labels],
        "metrics": metrics or {},
        "training": {"rows": int(len(X_raw)), "exported_at": datetime.now(timezone.utc).isoformat(),
                     **(training or {})},
    }
    (folder / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"exported {name}@{version} -> {folder}  ({len(features)} features, labels={manifest['labels']})")
    return folder
