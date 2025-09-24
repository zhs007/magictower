import grpc
import rmbg_pb2
import rmbg_pb2_grpc
import os

def run():
    # This script is intended to be run from the project root directory
    with grpc.insecure_channel('localhost:50051') as channel:
        stub = rmbg_pb2_grpc.RmbgServiceStub(channel)

        image_path = 'assets/monster/level3_golden_slime.png'
        output_path = 'assets/monster/level3_golden_slime_no_bg.png'

        # Load a test image
        if not os.path.exists(image_path):
            print(f"Error: test image not found at {image_path}")
            print("Please ensure you are running this client from the project root directory.")
            return

        with open(image_path, 'rb') as f:
            image_data = f.read()

        # Create a request
        request = rmbg_pb2.RemoveBackgroundRequest(image_data=image_data)

        # Make the RPC call
        print("Sending request to remove background (timeout=120s)...")
        try:
            # Increased timeout to allow for model downloads on first run
            response = stub.RemoveBackground(request, timeout=120)
        except grpc.RpcError as e:
            print(f"An RPC error occurred: {e.code()} - {e.details()}")
            return

        # Save the result
        with open(output_path, 'wb') as f:
            f.write(response.image_data)

        print(f"Successfully removed background and saved result to {output_path}")

if __name__ == '__main__':
    run()
