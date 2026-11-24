"""Thin HTTP layer over the registry. One generic predict endpoint serves every model."""
import os
import secrets
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .registry import InputValidationError, Registry

registry = Registry(Path(os.getenv("MODELS_DIR", "models")))


@asynccontextmanager
async def lifespan(_: FastAPI):
    registry.load_all()
    yield


app = FastAPI(title="Najda AI model service", lifespan=lifespan)


def require_key(x_api_key: str | None = Header(default=None)) -> None:
    expected = os.environ.get("AI_API_KEY")
    if not expected:
        raise HTTPException(503, "AI_API_KEY is not configured on the AI service")
    if not x_api_key or not secrets.compare_digest(x_api_key, expected):
        raise HTTPException(401, "invalid api key")


class PredictRequest(BaseModel):
    features: dict[str, Any]


@app.get("/health")
def health():
    ok = not registry.failures
    body = {"status": "ok" if ok else "degraded", "loaded": registry.listing(), "failures": registry.failures}
    # 503 when a listed model failed to load: on hosts like Render a failing health check blocks the rollout,
    # so a broken model package never replaces a working deployment.
    return JSONResponse(body, status_code=200 if ok else 503)


@app.get("/v1/models", dependencies=[Depends(require_key)])
def list_models():
    return registry.listing()


@app.get("/v1/models/{name}", dependencies=[Depends(require_key)])
def model_manifest(name: str, version: str | None = Query(None)):
    """The contract: exact features, units, allowed values, labels, metrics."""
    try:
        return registry.get(name, version).manifest
    except KeyError:
        raise HTTPException(404, f"model {name}@{version} not loaded")


@app.post("/v1/models/{name}/predict", dependencies=[Depends(require_key)])
def predict(name: str, req: PredictRequest, version: str | None = Query(None)):
    try:
        model = registry.get(name, version)
    except KeyError:
        raise HTTPException(404, f"model {name}@{version} not loaded")
    try:
        return model.predict(req.features)
    except InputValidationError as e:
        raise HTTPException(422, {"errors": e.errors})
