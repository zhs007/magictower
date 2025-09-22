# Stage 1: Build the Go binary
FROM golang:1.24-alpine AS builder

# Set the Current Working Directory inside the container
WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download all dependencies. Dependencies will be cached if the go.mod and go.sum files are not changed
RUN go mod download

# Copy the source code
COPY . .

# Build the Go app
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o gen_doubao_image .

# Stage 2: Create the final, minimal image
FROM alpine:latest

# Add ca-certificates to make SSL calls
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the pre-built binary from the "builder" stage
COPY --from=builder /app/gen_doubao_image .

# Expose port 50052 to the outside world
EXPOSE 50052

# Command to run the executable
CMD ["./gen_doubao_image"]
