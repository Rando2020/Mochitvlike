from __future__ import annotations

import json
import logging
from typing import Any

logger=logging.getLogger("visual_inference")

SENSITIVE_KEYS={"prompt","assetUrl","authorization","token","provenance","sourceUrlOrRecord"}

def safe_event(event: str, **fields: Any) -> None:
    payload={"event":event}
    for key,value in fields.items():
        if key in SENSITIVE_KEYS:
            continue
        payload[key]=value
    logger.info(json.dumps(payload,sort_keys=True,separators=(",",":")))
