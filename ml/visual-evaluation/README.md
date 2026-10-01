# Mochitvlike Visual Model Bake-Off Runner

This package executes the versioned visual benchmark exported from the TypeScript product contracts.

## CPU validation

```bash
python -m pip install -e "ml/visual-evaluation[dev]"
pytest ml/visual-evaluation/tests
```

CPU tests never download model weights.

## Real GPU execution

Install GPU extras in a CUDA environment:

```bash
python -m pip install -e "ml/visual-evaluation[gpu]"
```

Dry-run one pinned scenario:

```bash
python -m visual_eval.runner \
  --bundle ml/visual-evaluation/contracts/benchmark.v1.json \
  --model animagine-xl-4.0 \
  --phase BASE \
  --scenario char-closeup \
  --artifacts-dir artifacts \
  --dry-run
```

Real generation removes `--dry-run`.

The runner never accepts a floating `main` revision.

## Benchmark phases

- BASE
- REFERENCE
- STRUCTURAL
- CHARACTER_LORA
- ABILITY_CONSISTENCY

Reference/control/LoRA phases require explicit assets or adapter paths. Missing assets produce an explicit unsupported/skipped result rather than silently reverting to BASE.

## Hugging Face Jobs

A bounded smoke command can be run on Hugging Face Jobs after this repository is available at the target commit:

```bash
hf jobs run \
  --flavor t4-small \
  --timeout 8m \
  pytorch/pytorch:2.6.0-cuda12.4-cudnn9-runtime \
  bash -lc '<install repo/package and run one BASE scenario>'
```

Do not launch the full bake-off without reviewing expected model download size, GPU flavor, and cost.

## Outputs

```text
artifacts/{runId}/
  manifest.json
  visual-evaluation-results.json
  visual-evaluation-report.json
  visual-evaluation-report.html
  {modelId}/{phase}/{scenarioId}/
    output.png
    metadata.json
```

The final report does not automatically choose a production model.
