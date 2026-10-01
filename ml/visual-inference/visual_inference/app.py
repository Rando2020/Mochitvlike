from __future__ import annotations

import logging
from fastapi import FastAPI, Header, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from .errors import InferenceError, bounded_error
from .models import GenerateRequest
from .service import VisualInferenceService
from .settings import Settings

def create_app(settings:Settings|None=None,service:VisualInferenceService|None=None)->FastAPI:
    settings=settings or Settings.from_env()
    svc=service or VisualInferenceService(settings)
    app=FastAPI(title="Mochitv Visual Inference",version="1.0",docs_url=None,redoc_url=None)
    app.state.service=svc

    @app.exception_handler(InferenceError)
    async def inference_error(_request:Request,exc:InferenceError):
        return JSONResponse({"error":{"code":exc.code}},status_code=exc.status_code)

    @app.exception_handler(ValidationError)
    async def validation_error(_request:Request,_exc:ValidationError):
        return JSONResponse({"error":{"code":"INVALID_REQUEST"}},status_code=400)

    @app.get("/healthz")
    async def healthz():
        return {"ok":True}

    @app.get("/readyz")
    async def readyz():
        if not svc.ready:
            return JSONResponse({"ok":False,"code":"SERVICE_NOT_READY"},status_code=503)
        return {"ok":True}

    @app.post("/v1/production-frame")
    async def production_frame(request:Request,authorization:str|None=Header(default=None)):
        svc.authenticate(authorization)
        try:
            if int(request.headers.get("content-length","0") or 0)>1_000_000:
                raise bounded_error("INVALID_REQUEST")
            payload=await request.json()
            parsed=GenerateRequest.model_validate(payload)
        except InferenceError:
            raise
        except Exception:
            raise bounded_error("INVALID_REQUEST") from None
        try:
            return (await svc.generate(parsed)).model_dump()
        except InferenceError:
            raise
        except Exception:
            logging.getLogger("visual_inference").exception("visual_inference_internal_failure")
            raise bounded_error("INTERNAL_TRANSIENT") from None

    @app.on_event("startup")
    async def startup():
        if settings.eager_model_load:
            await svc.preload()
    return app
