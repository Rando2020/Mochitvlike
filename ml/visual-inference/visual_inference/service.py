from __future__ import annotations

import asyncio, base64, hmac, os, time, uuid
from typing import Callable

from .backend import VisualInferenceBackend, create_backend
from .errors import InferenceError, bounded_error
from .logging import safe_event
from .models import GenerateRequest, GenerateResponse
from .quality import validate_generated_image
from .references import ReferenceFetcher
from .registry import MODEL_REGISTRY, ModelEntry, resolve_model
from .settings import Settings

class VisualInferenceService:
    def __init__(self,settings:Settings,fetcher:ReferenceFetcher|None=None,backend_factory:Callable[[ModelEntry,Settings],VisualInferenceBackend]=create_backend):
        settings.validate()
        self.settings=settings
        self.fetcher=fetcher or ReferenceFetcher(settings)
        self.backend_factory=backend_factory
        self._backend:VisualInferenceBackend|None=None
        self._backend_key:tuple[str,str]|None=None
        self._lock=asyncio.Lock()
        self._semaphore=asyncio.Semaphore(settings.max_concurrency)

    @property
    def ready(self)->bool:
        return bool(self._backend and self._backend.loaded)

    def authenticate(self,authorization:str|None)->None:
        if not authorization or not authorization.startswith("Bearer "):
            raise bounded_error("UNAUTHENTICATED")
        supplied=authorization[7:]
        if not hmac.compare_digest(supplied.encode(),self.settings.auth_token.encode()):
            raise bounded_error("UNAUTHENTICATED")

    async def _backend_for(self,request:GenerateRequest)->VisualInferenceBackend:
        entry=resolve_model(
            request.spec.model.modelId,
            request.spec.model.revision,
            request.spec.model.architecture,
            request.spec.model.developmentOverride,
            self.settings.dev_model_id,
        )
        key=(entry.model_id,entry.revision)
        async with self._lock:
            if self._backend_key!=key:
                self._backend=self.backend_factory(entry,self.settings)
                self._backend_key=key
            backend=self._backend
            if not backend.loaded:
                await asyncio.to_thread(backend.load)
        return backend

    async def preload(self)->None:
        if not self.settings.dev_model_id:
            return
        entry=MODEL_REGISTRY.get(self.settings.dev_model_id)
        if not entry:
            raise bounded_error("MODEL_NOT_SUPPORTED")
        dummy_model=resolve_model(self.settings.dev_model_id,entry.revision,entry.architecture,True,self.settings.dev_model_id)
        async with self._lock:
            if self._backend_key!=(dummy_model.model_id,dummy_model.revision):
                self._backend=self.backend_factory(dummy_model,self.settings);self._backend_key=(dummy_model.model_id,dummy_model.revision)
            if not self._backend.loaded:
                await asyncio.to_thread(self._backend.load)

    async def generate(self,request:GenerateRequest)->GenerateResponse:
        request_id=str(uuid.uuid4());start=time.monotonic()
        spec=request.spec
        safe_event("visual_inference_request_started",requestId=request_id,modelId=spec.model.modelId,revision=spec.model.revision,architecture=spec.model.architecture,width=spec.output.width,height=spec.output.height,referenceCount=len(spec.references),developmentVisual=spec.model.developmentOverride)
        if spec.references and not self.settings.allowed_reference_hosts:
            raise bounded_error("REFERENCE_DOWNLOAD_FAILED")
        references=await asyncio.to_thread(self.fetcher.fetch_all,spec.references)
        backend=await self._backend_for(request)
        async with self._semaphore:
            try:
                generated=await asyncio.wait_for(
                    asyncio.to_thread(backend.generate,prompt=request.prompt,width=spec.output.width,height=spec.output.height,seed=spec.seed,references=references,development_override=spec.model.developmentOverride),
                    timeout=self.settings.inference_timeout_seconds,
                )
            except TimeoutError:
                raise bounded_error("INFERENCE_TIMEOUT") from None
        validate_generated_image(generated,spec.output.width,spec.output.height,self.settings.max_output_bytes)
        duration_ms=round((time.monotonic()-start)*1000)
        safe_event("visual_inference_request_completed",requestId=request_id,modelId=spec.model.modelId,revision=spec.model.revision,architecture=spec.model.architecture,width=spec.output.width,height=spec.output.height,referenceCount=len(spec.references),durationMs=duration_ms,status="COMPLETED",backend=generated.metadata.get("backend"),conditioning=generated.metadata.get("conditioning"),gpuType=os.getenv("MODAL_GPU_TYPE") or os.getenv("GPU_TYPE"))
        return GenerateResponse(imageBase64=base64.b64encode(generated.bytes).decode("ascii"),mimeType="image/png",width=generated.width,height=generated.height,taskId=request_id)
