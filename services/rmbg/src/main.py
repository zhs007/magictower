import grpc
from concurrent import futures
import time
import io

from PIL import Image
from rembg import remove

import rmbg_pb2
import rmbg_pb2_grpc

class RmbgServiceServicer(rmbg_pb2_grpc.RmbgServiceServicer):
    def RemoveBackground(self, request, context):
        try:
            # The input is bytes, rembg can handle this directly
            output_image_bytes = remove(request.image_data)

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
