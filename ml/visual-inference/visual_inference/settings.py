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
        )

    def validate(self) -> None:
        if not self.auth_token:
            raise RuntimeError("VISUAL_INFERENCE_TOKEN_REQUIRED")
        if self.backend=="test" and self.environment=="production":
            raise RuntimeError("TEST_BACKEND_FORBIDDEN_IN_PRODUCTION")
        if self.max_reference_bytes<=0 or self.max_output_bytes<=0:
            raise RuntimeError("INVALID_BYTE_LIMIT")
