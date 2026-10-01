from .semantic import MetricEvidence

def pose_adherence(*_args,**_kwargs)->MetricEvidence:
    return MetricEvidence(None,"HUMAN_REVIEW_REQUIRED","POSE_ESTIMATOR_NOT_CONFIGURED")
