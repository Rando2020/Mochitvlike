from __future__ import annotations

from dataclasses import dataclass
import os

@dataclass(frozen=True)
class Settings:
    environment: str
    auth_token: str
    backend: str
    dev_model_id: str | None
    allowed_reference_hosts: tuple[str, ...]
    max_reference_bytes: int
    max_output_bytes: int
    inference_timeout_seconds: int
    max_concurrency: int
    model_cache_dir: str
    eager_model_load: bool
    reference_conditioning_adapter_id: str
    reference_conditioning_adapter_revision: str
    identity_conditioning_scale: float
    vfx_conditioning_scale: float
    color_conditioning_scale: float
    max_conditioning_references: int

    @classmethod
    def from_env(cls) -> "Settings":
        hosts=tuple(x.strip().lower() for x in os.getenv("REFERENCE_ALLOWED_HOSTS","").split(",") if x.strip())
        return cls(
            environment=os.getenv("ENVIRONMENT","development").lower(),
            auth_token=os.getenv("VISUAL_INFERENCE_TOKEN",""),
            backend=os.getenv("VISUAL_INFERENCE_BACKEND","diffusers").lower(),
            dev_model_id=os.getenv("VISUAL_DEV_MODEL_ID") or None,
            allowed_reference_hosts=hosts,
            max_reference_bytes=int(os.getenv("MAX_REFERENCE_BYTES",str(10*1024*1024))),
            max_output_bytes=int(os.getenv("MAX_OUTPUT_BYTES",str(25*1024*1024))),
            inference_timeout_seconds=int(os.getenv("INFERENCE_TIMEOUT_SECONDS","140")),
            max_concurrency=max(1,int(os.getenv("MAX_INFERENCE_CONCURRENCY","1"))),
            model_cache_dir=os.getenv("MODEL_CACHE_DIR","/models/hf"),
            eager_model_load=os.getenv("EAGER_MODEL_LOAD","false").lower()=="true",
            reference_conditioning_adapter_id=os.getenv("REFERENCE_CONDITIONING_ADAPTER_ID","ip-adapter-plus-sdxl-vith"),
            reference_conditioning_adapter_revision=os.getenv("REFERENCE_CONDITIONING_ADAPTER_REVISION","9bf28b38530e55ffa91c6d82e5161a982c22f284"),
            identity_conditioning_scale=float(os.getenv("IDENTITY_CONDITIONING_SCALE","0.65")),
            vfx_conditioning_scale=float(os.getenv("VFX_CONDITIONING_SCALE","0.30")),
            color_conditioning_scale=float(os.getenv("COLOR_CONDITIONING_SCALE","0.20")),
            max_conditioning_references=int(os.getenv("MAX_CONDITIONING_REFERENCES","4")),
        )

    def validate(self) -> None:
        if not self.auth_token:
            raise RuntimeError("VISUAL_INFERENCE_TOKEN_REQUIRED")
        if self.backend=="test" and self.environment=="production":
            raise RuntimeError("TEST_BACKEND_FORBIDDEN_IN_PRODUCTION")
        if self.max_reference_bytes<=0 or self.max_output_bytes<=0:
            raise RuntimeError("INVALID_BYTE_LIMIT")
        for scale in (self.identity_conditioning_scale,self.vfx_conditioning_scale,self.color_conditioning_scale):
            if scale<0.0 or scale>1.0:raise RuntimeError("INVALID_CONDITIONING_SCALE")
        if self.max_conditioning_references<1 or self.max_conditioning_references>4:raise RuntimeError("INVALID_CONDITIONING_REFERENCE_LIMIT")
