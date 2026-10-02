import base64
from io import BytesIO
import hashlib
import pytest
from PIL import Image

from visual_inference.settings import Settings

def png(width=256,height=256,color=(20,30,40)):
    image=Image.new("RGB",(width,height),color)
    buf=BytesIO();image.save(buf,format="PNG");return buf.getvalue()

def settings(**overrides):
    values=dict(
        environment="test",auth_token="test-secret",backend="test",
        dev_model_id="animagine-xl-4.0",allowed_reference_hosts=("assets.example.com",),
        max_reference_bytes=10*1024*1024,max_output_bytes=25*1024*1024,
        inference_timeout_seconds=5,max_concurrency=1,model_cache_dir="/tmp/models",eager_model_load=False,
        reference_conditioning_adapter_id="ip-adapter-plus-sdxl-vith",reference_conditioning_adapter_revision="9bf28b38530e55ffa91c6d82e5161a982c22f284",identity_conditioning_scale=0.65,
        vfx_conditioning_scale=0.30,color_conditioning_scale=0.20,max_conditioning_references=4,
    )
    values.update(overrides);return Settings(**values)

def spec(**overrides):
    value={
      "id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "seriesId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "sceneId":"cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      "scriptId":"dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      "visualPlanId":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      "storyboardId":"ffffffff-ffff-4fff-8fff-ffffffffffff",
      "storyboardPanelId":"11111111-1111-4111-8111-111111111111",
      "model":{"modelId":"animagine-xl-4.0","revision":"2b7c1b397761bf5bd3cc42e5b39ec99314a75a96","architecture":"SDXL","developmentOverride":True},
      "output":{"width":256,"height":256,"aspectRatio":"1:1"},
      "creativeDirection":{"visualStyleDescription":"anime","colorLanguage":"muted","lightingLanguage":"soft","animationLanguage":"2d","cameraLanguage":"cinematic"},
      "composition":{"shotSize":"MEDIUM","cameraAngle":"eye level","framing":"balanced","focalCharacterIds":[],"supportingCharacterIds":[],"environment":None},
      "characters":[],
      "performance":{"characterPerformanceContexts":[]},
      "abilityConstraints":[],
      "environment":{"locationId":None,"description":None,"visualTags":[],"continuityRequirements":[]},
      "canonicalConstraints":["preserve canon"],
      "variableShotDirection":["medium shot"],
      "references":[],
      "seed":123,
      "promptVersion":"1.0",
      "promptChecksum":"a"*64
    }
    for key,val in overrides.items():
        if key=="model":value["model"]={**value["model"],**val}
        elif key=="output":value["output"]={**value["output"],**val}
        else:value[key]=val
    return value

def reference(data=None,**overrides):
    data=data or png()
    value={
      "id":"ref-1","type":"CHARACTER","assetUrl":"https://assets.example.com/ref.png",
      "checksum":hashlib.sha256(data).hexdigest(),"source":"OWNED","approved":True,"benchmarkOnly":False,"creatorApproved":True,
      "characterId":"char_orin","abilityId":None,"modelCompatibility":["animagine-xl-4.0"],"status":"APPROVED","storagePath":"private/path",
      "referenceRole":"PRIMARY_IDENTITY","abilitySlot":None,"locationId":None,"propId":None,
      "provenance":{"source":"OWNED","creatorNameOrId":"creator","licenseIdOrDescription":"owned","sourceUrlOrRecord":None,
        "permissions":{"productionUse":True,"commercialUse":True,"modelConditioning":True,"redistribution":False},"projectSpecific":None,"notes":None}
    }
    value.update(overrides);return value

@pytest.fixture
def auth_headers():return {"Authorization":"Bearer test-secret"}
