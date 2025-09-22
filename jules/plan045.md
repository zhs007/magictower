# Plan for TOS Image Upload in gen_doubao_image Service

## 1. Goal

The primary goal is to implement the functionality to upload reference images, received as byte arrays in the `GenDoubaoImage` gRPC request, to Volcengine TOS (Tianjin Object Storage). After a successful upload, the service will generate pre-signed URLs for these images and use them in the subsequent call to the Doubao image generation API.

## 2. Task Decomposition

### Step 1: Add TOS SDK Dependency
- I will add the `github.com/volcengine/ve-tos-golang-sdk/v2` library to the `go.mod` file for the `gen_doubao_image` service.

### Step 2: Implement TOS Upload Logic in `main.go`
- **Configuration:** I will read the necessary TOS configuration from environment variables:
    - `TOS_ACCESS_KEY`
    - `TOS_SECRET_KEY`
    - `TOS_ENDPOINT`
    - `TOS_REGION`
    - `TOS_BUCKET_NAME`
- **TOS Client Initialization:** I will initialize the TOS client using the configuration from the environment variables.
- **Image Upload Loop:** I will iterate through the `images` field of the incoming `GenDoubaoImageRequest`. For each image (which is a byte slice):
    - **Hashing:** I will calculate the SHA256 hash of the image bytes to create a unique identifier.
    - **Object Key:** I will construct the object key in the format `imgs/[hash].png`.
    - **Upload:** I will use the `PutObjectV2` function from the TOS SDK to upload the image bytes. The `Content` will be a `bytes.Reader` created from the image byte slice.
- **Pre-signed URL Generation:** After each successful upload, I will use the `PreSignedURL` function to generate a downloadable URL for the object.
- **Collect URLs:** I will collect all the generated pre-signed URLs into a string slice.

### Step 3: Integrate with Doubao API Call
- I will modify the `GenerateImage` function to pass the collected slice of pre-signed URLs to the `Image` field of the `model.GenerateImagesRequest` struct.

### Step 4: Test the Implementation
- Since I cannot run the service locally with real credentials, I will rely on careful code review and ensuring the logic matches the examples provided. I will add logging to trace the process of uploading and URL generation.

### Step 5: Update Documentation
- **Create Report:** After the implementation is complete and verified, I will create a report file at `jules/plan045-report.md` detailing the execution process, challenges, and solutions.
- **Update `jules.md`:** I will update the main project documentation file, `jules.md`, to reflect the new functionality in the `gen_doubao_image` service, including the environment variables required for TOS configuration.
- **Update `agents.md`:** I will review `agents.md` and update it if the changes introduce new considerations for future development by agents. Given the change involves new environment variables, it is likely an update will be needed.
