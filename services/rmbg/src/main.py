import os
import grpc
from concurrent import futures
import time

from rembg import remove
try:
    from rembg import new_session
except ImportError:  # pragma: no cover - fallback for older rembg versions
    from rembg.session_factory import new_session  # type: ignore

import rmbg_pb2
import rmbg_pb2_grpc
from prepare_models import parse_models


def _determine_default_model() -> str:
    # Explicit override wins.
    explicit = os.environ.get('REMBG_DEFAULT_MODEL')
    if explicit:
        return explicit.strip()

    # Fall back to the first configured model, matching prepare_models.py.
    configured = os.environ.get('REMBG_MODELS')
    if configured:
        parsed = parse_models(configured)
        if parsed:
            return parsed[0]

    # Final fallback mirrors prepare_models default.
    return 'isnet-general-use'


DEFAULT_MODEL = _determine_default_model()
_SESSION = new_session(DEFAULT_MODEL)
print(f"Using rembg model session '{DEFAULT_MODEL}'", flush=True)

class RmbgServiceServicer(rmbg_pb2_grpc.RmbgServiceServicer):
    def RemoveBackground(self, request, context):
        try:
            # The input is bytes, rembg can handle this directly
            output_image_bytes = remove(request.image_data, session=_SESSION)

            return rmbg_pb2.RemoveBackgroundResponse(image_data=output_image_bytes)

        except Exception as e:
            print(f"Error processing image: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Internal server error: {e}")
            return rmbg_pb2.RemoveBackgroundResponse()

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    rmbg_pb2_grpc.add_RmbgServiceServicer_to_server(RmbgServiceServicer(), server)
    server.add_insecure_port('[::]:50051')
    server.start()
    # This print statement might not show up in `docker logs` due to buffering
    # in standard Python logging. It's better to rely on the client for verification.
    print("Server started on port 50051")
    try:
        while True:
            time.sleep(86400)
    except KeyboardInterrupt:
        server.stop(0)

if __name__ == '__main__':
    serve()
