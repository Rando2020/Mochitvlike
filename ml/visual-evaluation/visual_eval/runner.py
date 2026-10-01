from __future__ import annotations
import argparse,json
from datetime import datetime,timezone
from importlib.metadata import PackageNotFoundError,version
from pathlib import Path
from .artifacts import ArtifactStore,new_run_id
from .conditioning.abilities import ability_contract_checksum
from .config import Phase,config_for,MODEL_ADAPTER_SUPPORT
from .metrics.ability_consistency import palette_similarity,contact_point_preservation,technique_shape_consistency,required_element_detection
from .metrics.composition import composition_similarity
from .metrics.pose import pose_adherence
from .metrics.reference_similarity import reference_similarity
from .metrics.resources import measure_resources
from .metrics.semantic import semantic_similarity
from .models import EvaluationMetadata,EvaluationResult
from .pipelines.base import GenerationRequest,MockPipeline,UnsupportedPhaseError
from .prompting import compile_visual_prompt
from .registry import get_model,load_bundle,verify_artifact_checksum
from .report import write_reports
from .review import write_review_html
from .scenarios import get_scenario

def _runtime_versions():
    result={}
    for name in ("torch","diffusers","transformers","accelerate","huggingface_hub"):
        try:result[name]=version(name)
        except PackageNotFoundError:result[name]=None
    return result

def _preflight(phase:Phase,args):
    if phase in {Phase.REFERENCE,Phase.ABILITY_CONSISTENCY} and not args.reference_image:
        raise UnsupportedPhaseError("REFERENCE_IMAGE_REQUIRED")
    if phase==Phase.STRUCTURAL:
        if not args.reference_image:raise UnsupportedPhaseError("REFERENCE_IMAGE_REQUIRED")
        if not args.control_image:raise UnsupportedPhaseError("CONTROL_IMAGE_REQUIRED")
    if phase==Phase.CHARACTER_LORA:
        if not args.reference_image:raise UnsupportedPhaseError("REFERENCE_IMAGE_REQUIRED")
        if not args.lora_path:raise UnsupportedPhaseError("CHARACTER_LORA_REQUIRED")

def _pipeline(model,model_path:str,mock:bool):
    if mock:return MockPipeline(model.architecture,model.id)
    if model.architecture=="SDXL":
        from .pipelines.sdxl import SDXLPipelineRunner
        return SDXLPipelineRunner(model_path,model.revision)
    if model.architecture=="FLUX":
        from .pipelines.flux import FluxPipelineRunner
        return FluxPipelineRunner(model_path,model.revision)
    raise UnsupportedPhaseError("UNSUPPORTED_ARCHITECTURE")

def _snapshot(model):
    from huggingface_hub import snapshot_download
    return Path(snapshot_download(repo_id=model.repository,revision=model.revision))

def execute_one(args:argparse.Namespace)->tuple[EvaluationResult,Path]:
    bundle=load_bundle(args.bundle);model=get_model(bundle,args.model);phase=Phase(args.phase)
    ability=phase==Phase.ABILITY_CONSISTENCY
    scenario=get_scenario(bundle,args.scenario,ability=ability)
    prompt=compile_visual_prompt(bundle,scenario.raw,ability=ability)
    cfg=config_for(model.id)
    run_id=args.run_id or new_run_id();store=ArtifactStore(Path(args.artifacts_dir),run_id)
    manifest={"schemaVersion":"visual-evaluation-run-v1","runId":run_id,"bundleSchema":bundle["schemaVersion"],"bundleContractChecksum":bundle["contractChecksum"],"modelId":model.id,"revision":model.revision,"phase":phase.value,"scenarioId":scenario.id,"seed":scenario.seed,"noAutomaticWinner":True}
    store.write_manifest(manifest)

    if args.dry_run:
        result=EvaluationResult(status="SKIPPED",error_code="DRY_RUN",error_message="Configuration compiled; inference not executed.")
        write_reports(store.root,[result]);write_review_html(store.root,[result],bundle["performance"]["ability"] if ability else None)
        return result,store.root

    try:
        _preflight(phase,args)
        checksum_verified=False;checksum_detail="MOCK_NO_DOWNLOAD";model_path=model.repository
        if not args.mock:
            snapshot=_snapshot(model);model_path=str(snapshot);checksum_verified,checksum_detail=verify_artifact_checksum(model,snapshot)
        pipe=_pipeline(model,model_path,args.mock)
        request=GenerationRequest(
            prompt=prompt.prompt,seed=scenario.seed,width=cfg.width,height=cfg.height,steps=cfg.steps,guidance=cfg.guidance,
            phase=phase.value,
            reference_image=Path(args.reference_image) if args.reference_image else None,
            control_image=Path(args.control_image) if args.control_image else None,
            lora_path=args.lora_path,
        )
        with measure_resources() as resource_state:
            generated=pipe.generate(request)
        measurement=resource_state["measurement"]
        image_path,output_checksum=store.write_image(model.id,phase.value,scenario.id,generated.image)
        metrics={
            "semanticSimilarity":semantic_similarity(prompt.prompt,generated.image).__dict__,
            "referenceSimilarity":reference_similarity(args.reference_image,generated.image).__dict__,
            "poseAdherence":pose_adherence(args.control_image,generated.image).__dict__,
            "compositionSimilarity":composition_similarity(scenario.raw,generated.image).__dict__,
        }
        if ability:
            palette=bundle["performance"]["ability"]["visualSignature"]["palette"]
            metrics.update({
                "abilityPaletteSimilarity":palette_similarity(generated.image,palette).__dict__,
                "abilityContactPoint":contact_point_preservation().__dict__,
                "abilityShapeConsistency":technique_shape_consistency().__dict__,
                "abilityRequiredElements":required_element_detection().__dict__,
            })
        metadata=EvaluationMetadata(
            model_id=model.id,model_revision=model.revision,checksum_verified=checksum_verified,checksum_detail=checksum_detail,
            architecture=model.architecture,phase=phase.value,scenario_id=scenario.id,seed=scenario.seed,prompt_hash=prompt.prompt_hash,
            model_settings={"steps":cfg.steps,"guidance":cfg.guidance,"width":cfg.width,"height":cfg.height,"dtype":cfg.dtype,"scheduler":cfg.scheduler,"runtime":_runtime_versions(),"provider":generated.provider_metadata},
            reference_ids=[args.reference_image] if args.reference_image else [],lora_ids=[args.lora_path] if args.lora_path else [],
            controlnet={"image":args.control_image,"support":MODEL_ADAPTER_SUPPORT[model.id].controlnet} if args.control_image else None,
            performance_bible_version=bundle["performance"]["bibleVersion"] if ability else None,
            ability_id=bundle["performance"]["ability"]["id"] if ability else None,
            ability_variant_id=bundle["performance"]["ability"]["variantId"] if ability else None,
            ability_contract_checksum=ability_contract_checksum(bundle) if ability else None,
            latency_ms=measurement.latency_ms,peak_vram_mb=measurement.peak_memory_mb,
            output_checksum=output_checksum,timestamp=datetime.now(timezone.utc).isoformat(),external_cost_usd=args.external_cost_usd,
        )
        store.write_metadata(model.id,phase.value,scenario.id,metadata.model_dump())
        result=EvaluationResult(status="COMPLETED",metadata=metadata,metrics=metrics,artifact_refs=[str(image_path.relative_to(store.root))])
    except UnsupportedPhaseError as exc:
        result=EvaluationResult(status="SKIPPED",error_code=str(exc),error_message="Requested phase is not safely executable with the supplied architecture/assets.")
    except Exception as exc:
        result=EvaluationResult(status="FAILED",error_code=type(exc).__name__,error_message="Inference failed; inspect ephemeral worker logs for details.")
    write_reports(store.root,[result]);write_review_html(store.root,[result],bundle["performance"]["ability"] if ability else None)
    return result,store.root

def parser()->argparse.ArgumentParser:
    p=argparse.ArgumentParser()
    p.add_argument("--bundle",required=True);p.add_argument("--model",required=True)
    p.add_argument("--phase",required=True,choices=[x.value for x in Phase]);p.add_argument("--scenario",required=True)
    p.add_argument("--artifacts-dir",default="artifacts");p.add_argument("--run-id")
    p.add_argument("--reference-image");p.add_argument("--control-image");p.add_argument("--lora-path")
    p.add_argument("--external-cost-usd",type=float,default=None)
    p.add_argument("--mock",action="store_true");p.add_argument("--dry-run",action="store_true")
    return p

def main(argv:list[str]|None=None)->int:
    args=parser().parse_args(argv);result,root=execute_one(args)
    print(json.dumps({"status":result.status,"artifactRoot":str(root),"errorCode":result.error_code},sort_keys=True))
    return 0 if result.status in {"COMPLETED","SKIPPED"} else 1

if __name__=="__main__":raise SystemExit(main())
