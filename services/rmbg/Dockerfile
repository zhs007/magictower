# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Configure rembg to store models in a volume-friendly location
ENV U2NET_HOME=/models
ENV REMBG_MODELS=isnet-general-use

# Copy the dependencies file to the working directory
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy entrypoint script and source code
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
COPY src/ .

# Make port 50051 available to the world outside this container
EXPOSE 50051

# Define environment variable
ENV GRPC_PYTHON_ENABLE_FORK_SUPPORT=0

# Run the warmup script before launching the service
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["python", "main.py"]
