from .semantic import MetricEvidence

def composition_similarity(*_args,**_kwargs)->MetricEvidence:
    return MetricEvidence(None,"HUMAN_REVIEW_REQUIRED","COMPOSITION_ESTIMATOR_NOT_CONFIGURED")
