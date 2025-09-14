# Plan for rmbg 2.0 gRPC Service (plan032)

## 1. Goal

The primary goal is to create a gRPC service for "rmbg 2.0" (presumably "remove background"). This service will be implemented in Python (version 3.12 or higher) and containerized using Docker for portability and to manage dependencies.

The service will expose a single RPC method to remove the background from an image. The protocol definition will be stored in `protos/`, and the service implementation will reside in `services/`.

## 2. Task Decomposition

I will break down the task into the following steps:

### Step 1: Directory and Protocol Definition
1.  **Create Directories**:
    -   Create a `protos/` directory in the project root for the Protobuf definition file.
    -   Create a `services/rmbg/` directory to house the Python gRPC service.
2.  **Define Protocol**:
    -   Create a file named `protos/rmbg.proto`.
    -   Inside this file, define the `RmbgService` with a `RemoveBackground` RPC.
    -   The request message will contain the input image as `bytes`.
    -   The response message will contain the output image as `bytes`.

### Step 2: Python Service Implementation
1.  **Create Project Structure**:
    -   Create `services/rmbg/src/` for the Python source code.
2.  **Define Dependencies**:
    -   Create a `services/rmbg/requirements.txt` file.
    -   Add the necessary Python packages: `grpcio`, `grpcio-tools`, `Pillow`, and `rembg`.
3.  **Generate gRPC Code**:
    -   Use `grpc_tools.protoc` to compile the `.proto` file into Python stubs (`_pb2.py` and `_pb2_grpc.py`).
    -   The generated files will be placed in `services/rmbg/src/`.
4.  **Implement Server Logic**:
    -   Create a `services/rmbg/src/main.py` file.
    -   Implement the `RmbgService` servicer, which will handle the `RemoveBackground` RPC call.
    -   The implementation will use the `rembg` library to process the image bytes received in the request and return the resulting image bytes.

### Step 3: Containerization
1.  **Create Dockerfile**:
    -   Create a `services/rmbg/Dockerfile`.
2.  **Configure Dockerfile**:
    -   Use an official Python 3.12 base image.
    -   Set up a working directory.
    -   Copy `requirements.txt` and install the dependencies.
    -   Copy the generated gRPC stubs and the service source code into the image.
    -   Expose the port for the gRPC service (e.g., 50051).
    -   Define the `CMD` to run the Python server (`python src/main.py`).

### Step 4: Verification
1.  **Build and Run**:
    -   Build the Docker image.
    -   Run the container.
2.  **Test Client**:
    -   Create a simple Python client (`services/rmbg/src/client.py`) to send a test image to the service and verify that it returns a background-removed image. This step is crucial to ensure the service works as expected before finalizing.

### Step 5: Documentation
1.  **Task Report**:
    -   Create `jules/plan032-report.md` to document the entire process, including challenges encountered and solutions found.
2.  **Update `jules.md`**:
    -   Add a new section to `jules.md` describing the `rmbg` gRPC service, its purpose, architecture, and how to use it.
3.  **Update `agents.md`**:
    -   Review `agents.md` and add any relevant information for future agents who might work on this service.

By following this plan, I will deliver a complete, containerized, and documented gRPC service as requested.
