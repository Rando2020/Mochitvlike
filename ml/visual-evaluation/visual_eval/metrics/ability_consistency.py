from __future__ import annotations
from collections import Counter
from PIL import Image
from .semantic import MetricEvidence

TARGET_COLORS={
    "muted wound-crimson":(145,44,58),
    "unnatural violet edge":(102,68,150),
    "brief pale-white compression":(235,231,220),
    "pale-white compression":(235,231,220),
}

def _distance(a,b):
    return ((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2)**.5

def palette_similarity(image:Image.Image,palette:list[str],threshold:float=70.0)->MetricEvidence:
    targets=[TARGET_COLORS[p] for p in palette if p in TARGET_COLORS]
    if not targets:return MetricEvidence(None,"NOT_EXECUTED","NO_NUMERIC_PALETTE_MAPPING")
    small=image.convert("RGB").resize((64,64))
    pixels=list(small.getdata())
    hits=sum(1 for px in pixels if min(_distance(px,target) for target in targets)<=threshold)
    return MetricEvidence(hits/len(pixels),"EXECUTED",details={"mappedColors":len(targets),"samplePixels":len(pixels)})

def contact_point_preservation(*_args,**_kwargs)->MetricEvidence:
    return MetricEvidence(None,"HUMAN_REVIEW_REQUIRED","CONTACT_GEOMETRY_REQUIRES_REVIEW_OR_VALIDATED_POSE_MODEL")

def technique_shape_consistency(*_args,**_kwargs)->MetricEvidence:
    return MetricEvidence(None,"HUMAN_REVIEW_REQUIRED","VFX_SHAPE_MODEL_NOT_CONFIGURED")

def required_element_detection(*_args,**_kwargs)->MetricEvidence:
    return MetricEvidence(None,"HUMAN_REVIEW_REQUIRED","REQUIRED_ELEMENT_DETECTOR_NOT_CONFIGURED")
