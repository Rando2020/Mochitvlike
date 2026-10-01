from __future__ import annotations
import hashlib,json
from pathlib import Path
from datetime import datetime,timezone
from typing import Any
from PIL import Image

def sha256_bytes(value:bytes)->str:return hashlib.sha256(value).hexdigest()
def stable_json(value:Any)->str:return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False)

class ArtifactStore:
    def __init__(self,root:Path,run_id:str):
        self.root=root/run_id;self.root.mkdir(parents=True,exist_ok=True)
        self.run_id=run_id

    def scenario_dir(self,model_id:str,phase:str,scenario_id:str)->Path:
        path=self.root/model_id/phase/scenario_id;path.mkdir(parents=True,exist_ok=True);return path

    def write_image(self,model_id:str,phase:str,scenario_id:str,image:Image.Image)->tuple[Path,str]:
        path=self.scenario_dir(model_id,phase,scenario_id)/"output.png";image.save(path,format="PNG")
        return path,sha256_bytes(path.read_bytes())

    def write_metadata(self,model_id:str,phase:str,scenario_id:str,metadata:dict[str,Any])->Path:
        path=self.scenario_dir(model_id,phase,scenario_id)/"metadata.json"
        path.write_text(json.dumps(metadata,indent=2,sort_keys=True)+"\n",encoding="utf-8");return path

    def write_manifest(self,manifest:dict[str,Any])->Path:
        path=self.root/"manifest.json";path.write_text(json.dumps(manifest,indent=2,sort_keys=True)+"\n",encoding="utf-8");return path

def new_run_id(prefix:str="visual-eval")->str:
    return prefix+"-"+datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
