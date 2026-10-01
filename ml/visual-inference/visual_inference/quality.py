from __future__ import annotations

from io import BytesIO
from PIL import Image, UnidentifiedImageError
from .backend import GeneratedImage
from .errors import bounded_error

def validate_generated_image(generated:GeneratedImage,width:int,height:int,max_bytes:int)->None:
    if not generated.bytes or len(generated.bytes)>max_bytes or generated.mime_type!="image/png":
        raise bounded_error("INVALID_GENERATED_IMAGE")
    try:
        with Image.open(BytesIO(generated.bytes)) as image:
            if image.format!="PNG" or image.size!=(width,height):
                raise bounded_error("INVALID_GENERATED_IMAGE")
            image.verify()
    except (UnidentifiedImageError,OSError):
        raise bounded_error("INVALID_GENERATED_IMAGE") from None
    if generated.width!=width or generated.height!=height:
        raise bounded_error("INVALID_GENERATED_IMAGE")
