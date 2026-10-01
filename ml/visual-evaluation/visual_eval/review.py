from __future__ import annotations
import html,json
from pathlib import Path
from .models import EvaluationResult

REVIEW_FIELDS=[
 "technique_recognizability","character_consistency","activation_pose_consistency",
 "vfx_consistency","palette_consistency","motion_language_plausibility","production_usability"
]

def write_review_html(root:Path,results:list[EvaluationResult],ability_contract:dict|None=None)->Path:
    cards=[]
    for result in results:
        if not result.metadata:continue
        image=result.artifact_refs[0] if result.artifact_refs else ""
        metrics=html.escape(json.dumps(result.metrics,indent=2))
        cards.append(f"""<article><h2>{html.escape(result.metadata.model_id)} · {html.escape(result.metadata.phase)} · {html.escape(result.metadata.scenario_id)}</h2>
<p>Status: {result.status}</p>{f'<img src="{html.escape(image)}" style="max-width:512px">' if image else ''}
<details><summary>Automated evidence</summary><pre>{metrics}</pre></details>
<p>Human review fields: {", ".join(REVIEW_FIELDS)}</p></article>""")
    contract=html.escape(json.dumps(ability_contract,indent=2)) if ability_contract else "No ability contract for this review."
    page=f"""<!doctype html><html><head><meta charset="utf-8"><title>Mochitvlike visual benchmark review</title></head>
<body><h1>Visual Model Bake-Off Review</h1><p>No automatic winner is selected.</p>
<details><summary>Canonical ability contract</summary><pre>{contract}</pre></details>
{''.join(cards)}</body></html>"""
    path=root/"visual-evaluation-report.html";path.write_text(page,encoding="utf-8");return path
