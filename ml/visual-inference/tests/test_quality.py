import pytest
from conftest import png
from visual_inference.backend import GeneratedImage
from visual_inference.errors import InferenceError
from visual_inference.quality import validate_generated_image

def generated(data=None,w=256,h=256,mime="image/png"):
    return GeneratedImage(data if data is not None else png(w,h),mime,w,h,{})

def test_valid_png():
    validate_generated_image(generated(),256,256,1_000_000)

def test_empty_rejected():
    with pytest.raises(InferenceError,match="INVALID_GENERATED_IMAGE"):validate_generated_image(generated(b""),256,256,1_000_000)

def test_wrong_mime_rejected():
    with pytest.raises(InferenceError,match="INVALID_GENERATED_IMAGE"):validate_generated_image(generated(mime="image/jpeg"),256,256,1_000_000)

def test_wrong_declared_dimensions_rejected():
    with pytest.raises(InferenceError,match="INVALID_GENERATED_IMAGE"):validate_generated_image(generated(w=128,h=256),256,256,1_000_000)

def test_wrong_png_dimensions_rejected():
    with pytest.raises(InferenceError,match="INVALID_GENERATED_IMAGE"):validate_generated_image(GeneratedImage(png(128,256),"image/png",256,256,{}),256,256,1_000_000)

def test_malformed_png_rejected():
    with pytest.raises(InferenceError,match="INVALID_GENERATED_IMAGE"):validate_generated_image(GeneratedImage(b"bad","image/png",256,256,{}),256,256,1_000_000)

def test_output_size_bounded():
    with pytest.raises(InferenceError,match="INVALID_GENERATED_IMAGE"):validate_generated_image(generated(),256,256,10)
