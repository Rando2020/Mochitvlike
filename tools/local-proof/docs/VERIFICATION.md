# Verification record — October 31, 2026

## Passed here

- Python syntax compile and 16 automated tests on Linux, Python 3.12.14, FFmpeg/ffprobe 7.1.5.
- Synthetic red/blue cuts encoded into H.264 MP4; actual central pixels verify edit order, not just metadata.
- 24/30 fps source normalization; portrait/landscape source normalization without stretching; frame-count and duration verification.
- Optional synthetic soundtrack padding to edit duration; final audio stream/duration checks.
- Final output width, height, average frame rate, frame count and duration checks.
- Unaccepted inputs, invalid trims, missing approvals, checksum changes, external URLs, path escape, indirect playlists and duplicate IDs rejected.
- Synthetic/real mode cannot be switched via the fixture flag.
- Repeated output filename refused.
- Independent review found three reproducible integrity issues. Regressions now pass: source mutation after validation is rejected, manifest receipt hashes immutable input bytes, indirect media formats are rejected. Input bytes are staged and hashed before encoding.
- The unfilled real-take template fails validation and creates no output.

## Not established

- Windows execution, installed local GPU/model state or measured rendering speed/memory.
- Real character video generation, identity/motion quality or a finished creative short.
- User approval of Veya/Remnant, keyframes or motion direction.
- Production app ingestion, new provider integration, database migrations or hosted deployment.
- Model weight authenticity: the receipt records operator-supplied hashes and workflow/source file hashes. It does not authenticate model execution or approvals.

## Failure handling limit

Output and receipt use exclusive creation and never overwrite existing files. An interrupted process or filesystem error between writing the MP4 and receipt may leave an orphaned output. Treat an output without its valid matching receipt as incomplete. Inspect it and choose a new revision filename; do not mark it delivered or automatically delete user files. No provider submission exists to repeat because this tool performs no generation.

The original preparation made no external repository changes. This publication adds the kit under `tools/local-proof` without modifying production code. All 16 tests were rerun from that final repository location before publication. No model weights or character media were downloaded by this task. Recovered source was inspected, not executed as a service. Only the new assembly tool and its generated synthetic tests ran.
