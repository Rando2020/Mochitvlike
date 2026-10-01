# Visual Inference Service v1

## Purpose

Visual Inference Service v1 is the GPU execution boundary behind the existing Production Frame provider interface.

```text
Next.js Production Frame worker
  -> HttpProductionFrameProvider
  -> VISUAL_INFERENCE_URL/v1/production-frame
  -> authenticated visual inference service
  -> exact registry model/revision
  -> PNG
  -> Next worker quality gate
  -> durable production-frames storage
```

The service does not own product queues, Supabase production-frame storage, canon, approval, or model selection policy.

## Provider selection

v1 targets Modal for deployment.

Why Modal:
- custom Python/container GPU workloads
- L40S availability
- serverless scale-to-zero
- bounded container count and request concurrency
- persistent Volumes suitable for Hugging Face model cache
- deployable ASGI applications
- provider-native secrets and observability
- local code remains ordinary FastAPI/Diffusers and is not coupled to a proprietary prediction schema

Hugging Face Dedicated Inference Endpoints remain a strong alternative, especially for model artifacts hosted on the Hub, but scale-to-zero cold starts require extra caller handling. Replicate custom deployments are also viable, but Cog adds a second model packaging/deployment abstraction. fal is promising for diffusion-heavy workloads but Modal gives this service the cleanest local-to-cloud Python path.

Provider choice is infrastructure only. The Mochitvlike ProductionFrameProvider remains provider-neutral.

## Model registry and revision pinning

The service has a server-side registry matching the current TypeScript Visual Model Registry:

- animagine-xl-4.0 @ 2b7c1b397761bf5bd3cc42e5b39ec99314a75a96
- illustrious-xl-v2.0 @ 69459c1fe6f46db41ab31e6114f05acc0e06bcaa
- flux.1-schnell @ cfac132b798278bc25d0d8a8608dc4522b13c615

v1 implements a concrete SDXL Diffusers backend for the two SDXL candidates.

FLUX intentionally fails MODEL_NOT_SUPPORTED in v1 instead of being silently substituted.

The request cannot provide a repository, filesystem path, Python code, shell command, or arbitrary model source. Repository and revision come only from the server-side registry.

VISUAL_DEV_MODEL_ID may restrict the development endpoint to one candidate. It does not approve the model.

Normal production still requires the product-side model to be APPROVED. Current candidates therefore remain development-only.

## API

### Health

GET /healthz

Process liveness only.

### Readiness

GET /readyz

Returns 200 only after a model backend is loaded.

### Generate

POST /v1/production-frame

Authorization:

```
Authorization: Bearer $VISUAL_INFERENCE_TOKEN
```

Body:

```json
{
  "spec": { "ProductionFrameGenerationSpec": "..." },
  "prompt": "canonical compiled prompt"
}
```

Successful response:

```json
{
  "imageBase64": "...",
  "mimeType": "image/png",
  "width": 1536,
  "height": 1024,
  "taskId": "request-uuid"
}
```

The durable Next job remains authoritative. The service taskId is observability only.

## Authentication

VISUAL_INFERENCE_TOKEN is mandatory.

Token comparison is constant-time.

The browser never receives this token.

Modal credentials, Hugging Face credentials, model cache credentials, and storage credentials remain service-side.

## Request validation

Pydantic schemas reject undeclared top-level and typed nested fields.

The service validates:

- exact model ID
- exact revision
- architecture
- development override
- dimensions
- seed
- prompt version
- prompt checksum shape
- reference count
- reference URL scheme
- request size

Dimensions must be multiples of 8 and remain within a bounded 256-2048 range.

## Reference retrieval

Production Reference Approval creates short-lived signed HTTPS URLs immediately before inference.

The inference service:
- permits HTTPS only
- requires an explicit REFERENCE_ALLOWED_HOSTS allowlist
- does not follow redirects
- bounds Content-Length and streamed bytes
- allows PNG, JPEG, WEBP only
- safely decodes with Pillow
- bounds decoded pixel count
- validates width/height
- recomputes SHA-256
- compares it to the canonical reference checksum
- keeps reference bytes in memory only
- never logs the signed URL or provenance payload

Checksum mismatch returns REFERENCE_CHECKSUM_MISMATCH before model execution.

## Conditioning v1

v1 does not claim solved multi-character identity conditioning.

The concrete SDXL backend currently uses:
- canonical Production Frame prompt
- exact deterministic seed
- exact model/revision
- fixed inference steps
- fixed guidance scale

Approved reference images are still downloaded and checksum-verified.

However, semantic identity/ability reference conditioning requires a model-specific adapter such as an approved IP-Adapter/ControlNet path. That adapter is intentionally not guessed or downloaded outside the registry.

Therefore:

- developmentOverride=true may run prompt-only while recording PROMPT_ONLY_DEVELOPMENT
- production-mode generation with references fails REFERENCE_CONDITIONING_NOT_SUPPORTED

This prevents an apparent production success that did not actually use the canonical identity references.

No LoRA is trained.

## Backend abstraction

VisualInferenceBackend defines load() and generate().

Implemented:
- DeterministicTestBackend
- DiffusersSDXLBackend

The test backend is forbidden when ENVIRONMENT=production.

The service caches the loaded backend so repeated requests for the same model/revision do not reload weights.

## Determinism

Request identity preserves:
- model ID
- immutable revision
- prompt
- seed
- reference IDs/checksums
- output dimensions

The SDXL backend records the backend name, scheduler-driving step count, and guidance value in internal runtime metadata.

GPU inference is intended to be reproducible within runtime constraints, but v1 does not claim bit-for-bit determinism across CUDA/library/hardware changes.

## Output validation

Before success:
- bytes must be non-empty
- output must be image/png
- PNG must decode
- dimensions must exactly equal the request
- declared dimensions must match decoded dimensions
- byte size must remain bounded

The existing Next Production Frame worker independently validates the returned PNG again before durable storage.

The GPU service never writes to the production-frames bucket.

## Security controls

Threats and controls:

### Arbitrary model loading
Only server registry mappings are accepted.

### SSRF
HTTPS plus explicit host allowlist; redirects rejected.

### Signed URL leakage
URLs are never added to structured logs.

### Oversized downloads
Content-Length and streamed bytes are bounded.

### Decompression bombs
Pillow decoded pixel limit is bounded.

### Malformed images
Decode and verification happen before inference.

### GPU denial of service
Application semaphore + Modal max container count + one input per container.

### OOM
Mapped to GPU_OOM.

### Long requests
Application inference timeout plus Modal hard request timeout.

### Credential leakage
Authorization values and provider credentials are excluded from structured events.

### Prompt leakage
Prompt text is not logged.

## Errors

Public bounded codes:
- MODEL_NOT_SUPPORTED
- MODEL_REVISION_MISMATCH
- MODEL_LOAD_FAILED
- INVALID_REQUEST
- REFERENCE_DOWNLOAD_FAILED
- REFERENCE_CHECKSUM_MISMATCH
- REFERENCE_DECODE_FAILED
- REFERENCE_CONDITIONING_NOT_SUPPORTED
- INFERENCE_TIMEOUT
- GPU_OOM
- INVALID_GENERATED_IMAGE
- INTERNAL_TRANSIENT
- UNAUTHENTICATED
- SERVICE_NOT_READY

Raw provider/model stack traces are not returned to product callers.

## Local development

CPU-safe deterministic service:

```bash
cd ml/visual-inference
python -m pip install -r requirements.lock
python -m pip install -e . --no-deps

export ENVIRONMENT=development
export VISUAL_INFERENCE_BACKEND=test
export VISUAL_INFERENCE_TOKEN=local-secret
export VISUAL_DEV_MODEL_ID=animagine-xl-4.0

uvicorn visual_inference.main:app --host 0.0.0.0 --port 8000
```

Docker:

```bash
docker build -t mochitv-visual-inference .
docker run --rm -p 8000:8000 --env-file .env mochitv-visual-inference
```

The Docker image includes pinned GPU dependencies for the real SDXL backend.

## Modal deployment

Prerequisites:
- Modal account with billing/GPU access
- Modal CLI authenticated
- a Modal secret named mochitv-visual-inference containing VISUAL_INFERENCE_TOKEN and required Hugging Face/host settings
- accepted access requirements for the selected model repository, if any

Deployment:

```bash
modal volume create mochitv-visual-model-cache
modal secret create mochitv-visual-inference \
  VISUAL_INFERENCE_TOKEN=... \
  VISUAL_INFERENCE_BACKEND=diffusers \
  VISUAL_DEV_MODEL_ID=animagine-xl-4.0 \
  REFERENCE_ALLOWED_HOSTS=your-project.supabase.co \
  ENVIRONMENT=development

modal deploy ml/visual-inference/deploy/modal_app.py
```

Configured v1 resources:
- NVIDIA L40S
- zero minimum containers
- maximum one container
- maximum one request per container
- 300 second idle scale-down window
- 180 second hard function timeout
- 900 second startup allowance
- persistent /models cache Volume

Cold start depends on whether the selected model revision is already cached. The model cache is intentionally persistent.

Rollback is a normal Modal deployment rollback/redeploy to the previous source commit; the product endpoint environment variable can also be restored to the prior service URL.

## Observability

Structured events include:
- request ID
- model ID
- revision
- architecture
- dimensions
- reference count
- development flag
- completion duration
- backend
- conditioning mode
- GPU type where supplied by infrastructure
- bounded status

They exclude:
- prompt
- signed reference URL
- Authorization token
- private provenance record

## Production Frame integration

HttpProductionFrameProvider now:
- requires both VISUAL_INFERENCE_URL and VISUAL_INFERENCE_TOKEN
- normalizes the endpoint to /v1/production-frame
- sends the canonical spec and compiled prompt
- accepts PNG only
- maps bounded service errors
- preserves AbortSignal support

The existing worker still:
- validates stored ProductionFrameGenerationSpec
- checks spec and prompt checksums
- enforces model status/development override
- enforces Production Reference provenance
- refreshes signed reference URLs
- calls the provider
- independently validates output
- uploads the durable PNG
- commits completion with the existing claim token

## First GPU generation

No GPU deployment is claimed by this commit.

The repository environment available during implementation does not expose Modal account/billing credentials or an authenticated deployment session.

The service is therefore prepared for deployment and validated with its deterministic local backend in CI.

A real smoke generation should be executed only after Modal credentials/billing exist.

If approved creator references are not yet present, the smoke test must remain infrastructure-only and must not mutate canonical Production Frame records.

## Current limitations

- no real reference-image conditioning adapter yet
- no GPU deployment performed by this repository change
- no model automatically APPROVED
- current registry SDXL models remain CANDIDATE
- FLUX backend intentionally unsupported in v1
- no LoRA
- no motion/video/audio
