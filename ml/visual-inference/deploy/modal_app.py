from pathlib import Path
import modal

ROOT=Path(__file__).resolve().parents[1]
app=modal.App("mochitv-visual-inference-v1")
image=modal.Image.from_dockerfile(ROOT/"Dockerfile",context_dir=ROOT)
cache=modal.Volume.from_name("mochitv-visual-model-cache",create_if_missing=True)
secrets=modal.Secret.from_name("mochitv-visual-inference")

@app.function(
    image=image,
    gpu="L40S",
    min_containers=0,
    max_containers=1,
    scaledown_window=300,
    timeout=180,
    startup_timeout=900,
    volumes={"/models":cache},
    secrets=[secrets],
)
@modal.concurrent(max_inputs=1)
@modal.asgi_app(requires_proxy_auth=False)
def api():
    from visual_inference.app import create_app
    return create_app()
