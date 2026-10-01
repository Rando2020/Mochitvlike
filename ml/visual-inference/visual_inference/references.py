from __future__ import annotations

import hashlib
from io import BytesIO
from urllib.parse import urlparse
import httpx
from PIL import Image, UnidentifiedImageError

from .errors import bounded_error
from .models import ReferenceSpec, RuntimeReference
from .settings import Settings

SUPPORTED_MIME={"image/png","image/jpeg","image/webp"}
Image.MAX_IMAGE_PIXELS=40_000_000

class ReferenceFetcher:
    def __init__(self, settings: Settings, transport: httpx.BaseTransport | None = None):
        self.settings=settings
        self.transport=transport

    def _validate_url(self,url:str)->None:
        parsed=urlparse(url)
        if parsed.scheme!="https" or not parsed.hostname:
            raise bounded_error("REFERENCE_DOWNLOAD_FAILED")
        host=parsed.hostname.lower()
        if not self.settings.allowed_reference_hosts or host not in self.settings.allowed_reference_hosts:
            raise bounded_error("REFERENCE_DOWNLOAD_FAILED")

    def fetch(self,spec:ReferenceSpec)->RuntimeReference:
        self._validate_url(str(spec.assetUrl))
        try:
            with httpx.Client(timeout=20,follow_redirects=False,transport=self.transport) as client:
                with client.stream("GET",str(spec.assetUrl),headers={"Accept":"image/png,image/jpeg,image/webp"}) as response:
                    if response.status_code!=200:
                        raise bounded_error("REFERENCE_DOWNLOAD_FAILED")
                    mime=response.headers.get("content-type","").split(";")[0].strip().lower()
                    if mime not in SUPPORTED_MIME:
                        raise bounded_error("REFERENCE_DECODE_FAILED")
                    content_length=response.headers.get("content-length")
                    if content_length and int(content_length)>self.settings.max_reference_bytes:
                        raise bounded_error("REFERENCE_DOWNLOAD_FAILED")
                    chunks=[];total=0
                    for chunk in response.iter_bytes():
                        total+=len(chunk)
                        if total>self.settings.max_reference_bytes:
                            raise bounded_error("REFERENCE_DOWNLOAD_FAILED")
                        chunks.append(chunk)
            data=b"".join(chunks)
        except Exception as exc:
            if getattr(exc,"code",None):
                raise
            raise bounded_error("REFERENCE_DOWNLOAD_FAILED") from None

        if hashlib.sha256(data).hexdigest().lower()!=spec.checksum.lower():
            raise bounded_error("REFERENCE_CHECKSUM_MISMATCH")
        try:
            with Image.open(BytesIO(data)) as image:
                image.verify()
            with Image.open(BytesIO(data)) as image:
                width,height=image.size
                if width<=0 or height<=0 or width*height>40_000_000:
                    raise bounded_error("REFERENCE_DECODE_FAILED")
        except (UnidentifiedImageError,OSError,Image.DecompressionBombError):
            raise bounded_error("REFERENCE_DECODE_FAILED") from None
        return RuntimeReference(spec,data,mime,width,height)

    def fetch_all(self,references:list[ReferenceSpec])->list[RuntimeReference]:
        return [self.fetch(reference) for reference in references]
