"""Model registry: loads packaged models and validates inputs against each model's manifest.

Framework-free on purpose (no FastAPI import) so it can be unit-tested and reused from scripts.
A model package is a folder:  models/<name>/<version>/{model.joblib, manifest.json, golden.json}
models/registry.json says which version is active:
    {"vitals_severity": {"active": "1.0.0", "also_load": ["1.1.0"]}}
"""
from __future__ import annotations

import hashlib
import json
import logging
import math
import os
from importlib import metadata
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

log = logging.getLogger("registry")
ENFORCED_LIBS = ("scikit-learn", "xgboost", "lightgbm")


class InputValidationError(ValueError):
    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("; ".join(errors))


class ModelLoadError(RuntimeError):
    pass


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _major_minor(v: str) -> str:
    return ".".join(v.split(".")[:2])


class LoadedModel:
    def __init__(self, manifest: dict, pipeline):
        self.manifest = manifest
        self.pipeline = pipeline
        self.name: str = manifest["name"]
        self.version: str = manifest["version"]
        self.features: list[dict] = manifest["features"]
        self.labels: list = manifest["labels"]
        self._by_name = {f["name"]: f for f in self.features}

    # ---- input validation -------------------------------------------------
    def _clean(self, features: dict) -> tuple[dict, list[str], list[str], list[str]]:
        errors, warnings, missing = [], [], []
        unknown = sorted(set(features) - set(self._by_name))
        if unknown:
            errors.append(f"unknown features: {unknown}")
        row: dict = {}
        for spec in self.features:
            n, v = spec["name"], features.get(spec["name"])
            if v is None:
                if not spec.get("nullable", True):
                    errors.append(f"{n}: required")
                missing.append(n)
                row[n] = np.nan
                continue
            if spec["type"] == "number":
                if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v):
                    errors.append(f"{n}: must be a finite number, got {v!r}")
                    continue
                lo, hi = spec.get("hard_min"), spec.get("hard_max")
                if (lo is not None and v < lo) or (hi is not None and v > hi):
                    errors.append(f"{n}: {v} outside allowed range [{lo}, {hi}]")
                    continue
                tlo, thi = spec.get("training_min"), spec.get("training_max")
                if (tlo is not None and v < tlo) or (thi is not None and v > thi):
                    warnings.append(f"{n}: {v} outside training range [{tlo}, {thi}]")
                row[n] = float(v)
            else:  # category
                if v not in spec["allowed"]:
                    errors.append(f"{n}: {v!r} not in {spec['allowed']}")
                    continue
                row[n] = v
        return row, errors, warnings, missing

    # ---- prediction -------------------------------------------------------
    def predict(self, features: dict) -> dict:
        row, errors, warnings, missing = self._clean(features)
        if errors:
            raise InputValidationError(errors)
        X = pd.DataFrame([row])[[f["name"] for f in self.features]]  # manifest order == training order
        proba = self.pipeline.predict_proba(X)[0]
        classes = [int(c) for c in self.pipeline.classes_]
        probs = {str(self.labels[c]): float(p) for c, p in zip(classes, proba)}
        best = int(np.argmax(proba))
        return {
            "model": self.name,
            "version": self.version,
            "prediction": {
                "label": str(self.labels[classes[best]]),
                "confidence": float(proba[best]),
                "probabilities": probs,
            },
            "missing_features": missing,
            "warnings": warnings,
        }


def load_package(folder: Path) -> LoadedModel:
    manifest = json.loads((folder / "manifest.json").read_text())
    artifact = folder / manifest["artifact"]["file"]
    if _sha256(artifact) != manifest["artifact"]["sha256"]:
        raise ModelLoadError(f"{folder}: artifact hash mismatch (file changed or corrupted)")
    if os.getenv("ALLOW_VERSION_MISMATCH") != "1":
        for lib, wanted in manifest.get("libraries", {}).items():
            if lib not in ENFORCED_LIBS:
                continue
            try:
                have = metadata.version(lib)
            except metadata.PackageNotFoundError:
                raise ModelLoadError(f"{folder}: needs {lib}=={wanted}, not installed")
            if _major_minor(have) != _major_minor(wanted):
                raise ModelLoadError(f"{folder}: trained with {lib} {wanted}, installed {have}")
    return LoadedModel(manifest, joblib.load(artifact))  # only ever load artifacts YOUR team built


class Registry:
    def __init__(self, root: Path):
        self.root = Path(root)
        self.models: dict[tuple[str, str], LoadedModel] = {}
        self.active: dict[str, str] = {}
        self.failures: dict[str, str] = {}

    def load_all(self) -> None:
        cfg = json.loads((self.root / "registry.json").read_text())
        for name, entry in cfg.items():
            self.active[name] = entry["active"]
            for version in [entry["active"], *entry.get("also_load", [])]:
                key = f"{name}@{version}"
                try:
                    self.models[(name, version)] = load_package(self.root / name / version)
                    log.info("loaded %s", key)
                except Exception as e:  # one bad model must not take the others down
                    self.failures[key] = str(e)
                    log.error("failed to load %s: %s", key, e)

    def get(self, name: str, version: str | None = None) -> LoadedModel:
        version = version or self.active.get(name)
        if (name, version) not in self.models:
            raise KeyError(f"{name}@{version}")
        return self.models[(name, version)]

    def listing(self) -> list[dict]:
        return [
            {"name": n, "version": v, "active": self.active.get(n) == v,
             "labels": m.labels, "n_features": len(m.features)}
            for (n, v), m in sorted(self.models.items())
        ]
