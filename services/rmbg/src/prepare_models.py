import os
import sys

try:
    from rembg import new_session
except ImportError:  # pragma: no cover - fallback for older rembg versions
    from rembg.session_factory import new_session  # type: ignore


def parse_models(raw: str) -> list[str]:
    parts = [item.strip() for item in raw.replace(",", " ").split()]  # allow comma/space separated
    return [item for item in parts if item]


def ensure_model_dir(path: str) -> None:
    if not path:
        return
    os.makedirs(path, exist_ok=True)


def main() -> int:
    model_dir = os.environ.get("U2NET_HOME")
    models_env = os.environ.get("REMBG_MODELS", "isnet-general-use")
    models = parse_models(models_env)

    if not models:
        print("No models configured via REMBG_MODELS; nothing to download.", flush=True)
        return 0

    if model_dir:
        ensure_model_dir(model_dir)
        print(f"Using model cache directory: {model_dir}", flush=True)

    for model_name in models:
        print(f"Preparing rembg model '{model_name}'...", flush=True)
        session = new_session(model_name)
        del session
        print(f"Model '{model_name}' is ready.", flush=True)

    print("All requested rembg models are ready.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
