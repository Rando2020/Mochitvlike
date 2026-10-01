from PIL import Image
from visual_eval.metrics.ability_consistency import palette_similarity,contact_point_preservation,technique_shape_consistency
from visual_eval.metrics.semantic import semantic_similarity
from visual_eval.metrics.pose import pose_adherence
from visual_eval.metrics.composition import composition_similarity
from visual_eval.metrics.resources import measure_resources

def test_palette_similarity_executes_for_known_palette():
    image=Image.new("RGB",(32,32),(145,44,58))
    result=palette_similarity(image,["muted wound-crimson"])
    assert result.status=="EXECUTED" and result.value==1.0

def test_palette_similarity_refuses_unknown_palette():
    result=palette_similarity(Image.new("RGB",(8,8)),["unknown"])
    assert result.value is None and result.status=="NOT_EXECUTED"

def test_contact_geometry_is_human_review():
    assert contact_point_preservation().status=="HUMAN_REVIEW_REQUIRED"

def test_shape_consistency_is_human_review():
    assert technique_shape_consistency().status=="HUMAN_REVIEW_REQUIRED"

def test_semantic_metric_not_fabricated():
    assert semantic_similarity().value is None

def test_pose_metric_not_fabricated():
    assert pose_adherence().status=="HUMAN_REVIEW_REQUIRED"

def test_composition_metric_not_fabricated():
    assert composition_similarity().status=="HUMAN_REVIEW_REQUIRED"

def test_resource_measurement_captures_latency():
    with measure_resources() as state: sum(range(100))
    assert state["measurement"].latency_ms>=0 and state["measurement"].seconds_per_image>=0
