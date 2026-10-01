from __future__ import annotations
import json
from pathlib import Path
from typing import Iterable
from .models import EvaluationResult

def build_report(results:Iterable[EvaluationResult])->dict:
    rows=list(results)
    by_model:dict[str,dict]={}
    for row in rows:
        if not row.metadata:continue
        m=by_model.setdefault(row.metadata.model_id,{"completed":0,"failed":0,"skipped":0,"latencyMs":[],"peakVramMb":[]})
        m[row.status.lower()]+=1
        if row.status=="COMPLETED":
            m["latencyMs"].append(row.metadata.latency_ms)
            if row.metadata.peak_vram_mb is not None:m["peakVramMb"].append(row.metadata.peak_vram_mb)
    for m in by_model.values():
        m["meanLatencyMs"]=sum(m["latencyMs"])/len(m["latencyMs"]) if m["latencyMs"] else None
        m["maxPeakVramMb"]=max(m["peakVramMb"]) if m["peakVramMb"] else None
    return{
        "schemaVersion":"visual-evaluation-report-v1",
        "noAutomaticWinner":True,
        "models":by_model,
        "warnings":["Aggregate evidence must be reviewed by dimension; this report does not choose a production winner."],
    }

def write_reports(root:Path,results:list[EvaluationResult])->tuple[Path,Path]:
    results_path=root/"visual-evaluation-results.json"
    report_path=root/"visual-evaluation-report.json"
    results_path.write_text(json.dumps([r.model_dump() for r in results],indent=2,sort_keys=True)+"\n",encoding="utf-8")
    report_path.write_text(json.dumps(build_report(results),indent=2,sort_keys=True)+"\n",encoding="utf-8")
    return results_path,report_path
