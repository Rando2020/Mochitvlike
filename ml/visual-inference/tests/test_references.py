import hashlib
from io import BytesIO
import httpx,pytest
from PIL import Image

from conftest import png,reference,settings
from visual_inference.errors import InferenceError
from visual_inference.models import ReferenceSpec
from visual_inference.references import ReferenceFetcher

def response(data:bytes,mime="image/png",status=200,headers=None):
    h={"content-type":mime,**(headers or {})}
    return httpx.Response(status,headers=h,content=data)

def fetcher(handler,**overrides):
    return ReferenceFetcher(settings(**overrides),httpx.MockTransport(handler))

def parsed_ref(data=None,**overrides):
    return ReferenceSpec.model_validate(reference(data,**overrides))

def test_valid_reference_download():
    data=png()
    f=fetcher(lambda req:response(data))
    got=f.fetch(parsed_ref(data));assert got.width==256 and got.height==256 and got.mime_type=="image/png"

def test_https_required():
    data=png();r=parsed_ref(data,assetUrl="http://assets.example.com/ref.png")
    with pytest.raises(InferenceError,match="REFERENCE_DOWNLOAD_FAILED"):fetcher(lambda req:response(data)).fetch(r)

def test_host_allowlist_required():
    data=png();r=parsed_ref(data,assetUrl="https://evil.example/ref.png")
    with pytest.raises(InferenceError,match="REFERENCE_DOWNLOAD_FAILED"):fetcher(lambda req:response(data)).fetch(r)

def test_redirect_rejected():
    data=png()
    with pytest.raises(InferenceError,match="REFERENCE_DOWNLOAD_FAILED"):fetcher(lambda req:httpx.Response(302,headers={"location":"https://assets.example.com/other"})).fetch(parsed_ref(data))

def test_non_200_rejected():
    data=png()
    with pytest.raises(InferenceError,match="REFERENCE_DOWNLOAD_FAILED"):fetcher(lambda req:response(b"",status=404)).fetch(parsed_ref(data))

@pytest.mark.parametrize("mime",["text/html","image/gif","application/octet-stream"])
def test_unsupported_mime_rejected(mime):
    data=png()
    with pytest.raises(InferenceError,match="REFERENCE_DECODE_FAILED"):fetcher(lambda req:response(data,mime)).fetch(parsed_ref(data))

def test_content_length_bound():
    data=png()
    with pytest.raises(InferenceError,match="REFERENCE_DOWNLOAD_FAILED"):fetcher(lambda req:response(data,headers={"content-length":"999999"}),max_reference_bytes=100).fetch(parsed_ref(data))

def test_stream_size_bound():
    data=png()
    with pytest.raises(InferenceError,match="REFERENCE_DOWNLOAD_FAILED"):fetcher(lambda req:response(data),max_reference_bytes=10).fetch(parsed_ref(data))

def test_checksum_mismatch():
    data=png()
    with pytest.raises(InferenceError,match="REFERENCE_CHECKSUM_MISMATCH"):fetcher(lambda req:response(data)).fetch(parsed_ref(data,checksum="b"*64))

def test_malformed_image_rejected():
    data=b"not-image"
    r=parsed_ref(png(),checksum=hashlib.sha256(data).hexdigest())
    with pytest.raises(InferenceError,match="REFERENCE_DECODE_FAILED"):fetcher(lambda req:response(data)).fetch(r)

def test_dimensions_checked():
    data=png(512,384)
    got=fetcher(lambda req:response(data)).fetch(parsed_ref(data));assert (got.width,got.height)==(512,384)

def test_fetch_all_preserves_order():
    a=png(color=(1,2,3));b=png(color=(4,5,6))
    mapping={"/a.png":a,"/b.png":b}
    refs=[parsed_ref(a,id="a",assetUrl="https://assets.example.com/a.png"),parsed_ref(b,id="b",assetUrl="https://assets.example.com/b.png")]
    got=fetcher(lambda req:response(mapping[req.url.path])).fetch_all(refs)
    assert [x.spec.id for x in got]==["a","b"]

def test_url_query_not_logged_by_fetcher(caplog):
    data=png();r=parsed_ref(data,assetUrl="https://assets.example.com/ref.png?token=secret")
    fetcher(lambda req:response(data)).fetch(r)
    assert "secret" not in caplog.text
