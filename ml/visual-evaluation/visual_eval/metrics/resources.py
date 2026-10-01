from __future__ import annotations
from contextlib import contextmanager
from dataclasses import dataclass
import time

@dataclass(frozen=True)
class ResourceMeasurement:
    latency_ms:float
    peak_memory_mb:float|None
    seconds_per_image:float

@contextmanager
def measure_resources():
    started=time.perf_counter()
    state={"peak":None}
    try:
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.reset_peak_memory_stats()
        except Exception:
            pass
        yield state
    finally:
        elapsed=time.perf_counter()-started
        try:
            import torch
            if torch.cuda.is_available():
                state["peak"]=torch.cuda.max_memory_allocated()/1024/1024
        except Exception:
            pass
        state["measurement"]=ResourceMeasurement(elapsed*1000,state["peak"],elapsed)
