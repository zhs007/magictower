package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"

	"github.com/volcengine/ve-tos-golang-sdk/v2/tos"
	"github.com/volcengine/ve-tos-golang-sdk/v2/tos/enum"
	"github.com/volcengine/volcengine-go-sdk/service/arkruntime"
	"github.com/volcengine/volcengine-go-sdk/service/arkruntime/model"
	"github.com/volcengine/volcengine-go-sdk/volcengine"
	pb "gen_doubao_image/gen"
	"google.golang.org/grpc"
)

const (
	port = ":50052"
)

type server struct {
	pb.UnimplementedGenDoubaoImageServer
}

func (s *server) GenerateImage(ctx context.Context, in *pb.GenDoubaoImageRequest) (*pb.GenDoubaoImageResponse, error) {
	log.Printf("Received image generation request with prompt: %s", in.GetPrompt())

	apiKey := os.Getenv("ARK_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("ARK_API_KEY environment variable not set")
	}

	modelName := os.Getenv("DOUBAO_MODEL")
	if modelName == "" {
		modelName = "doubao-seedream-4-0-250828"
	}

	var imageUrls []string
	if len(in.GetImages()) > 0 {
		// TOS configuration
		accessKey := os.Getenv("TOS_ACCESS_KEY")
		secretKey := os.Getenv("TOS_SECRET_KEY")
		endpoint := os.Getenv("TOS_ENDPOINT")
		region := os.Getenv("TOS_REGION")
		bucketName := os.Getenv("TOS_BUCKET_NAME")

		if accessKey == "" || secretKey == "" || endpoint == "" || region == "" || bucketName == "" {
			return nil, fmt.Errorf("TOS environment variables not fully configured")
		}

		tosClient, err := tos.NewClientV2(endpoint, tos.WithRegion(region), tos.WithCredentials(tos.NewStaticCredentials(accessKey, secretKey)))
		if err != nil {
			return nil, fmt.Errorf("failed to create TOS client: %w", err)
		}

		for _, imgBytes := range in.GetImages() {
			hash := sha256.Sum256(imgBytes)
			objectKey := fmt.Sprintf("imgs/%s.png", hex.EncodeToString(hash[:]))

			log.Printf("Uploading image to TOS with key: %s", objectKey)
			_, err := tosClient.PutObjectV2(ctx, &tos.PutObjectV2Input{
				PutObjectBasicInput: tos.PutObjectBasicInput{
					Bucket: bucketName,
					Key:    objectKey,
				},
				Content: bytes.NewReader(imgBytes),
			})
			if err != nil {
				log.Printf("Failed to upload image to TOS: %v", err)
				return nil, fmt.Errorf("failed to upload image to TOS: %w", err)
			}

			log.Printf("Generating pre-signed URL for key: %s", objectKey)
			url, err := tosClient.PreSignedURL(&tos.PreSignedURLInput{
				HTTPMethod: enum.HttpMethodGet,
				Bucket:     bucketName,
				Key:        objectKey,
			})
			if err != nil {
				log.Printf("Failed to generate pre-signed URL: %v", err)
				return nil, fmt.Errorf("failed to generate pre-signed URL: %w", err)
			}
			imageUrls = append(imageUrls, url.SignedUrl)
			log.Printf("Successfully generated pre-signed URL: %s", url.SignedUrl)
		}
	}

	client := arkruntime.NewClientWithApiKey(apiKey)

	var seqImgGen model.SequentialImageGeneration
	if in.GetSequentialImageGeneration() != "" {
		seqImgGen = model.SequentialImageGeneration(in.GetSequentialImageGeneration())
	} else {
		seqImgGen = "auto"
	}

	maxImages := int(in.GetMaxImages())

	generateReq := model.GenerateImagesRequest{
		Model:          modelName,
		Prompt:         in.GetPrompt(),
		Image:          imageUrls,
		Size:           volcengine.String(in.GetSize()),
		ResponseFormat: volcengine.String(model.GenerateImagesResponseFormatURL),
		Watermark:      volcengine.Bool(in.GetWatermark()),
		SequentialImageGeneration: &seqImgGen,
		SequentialImageGenerationOptions: &model.SequentialImageGenerationOptions{
			MaxImages: &maxImages,
		},
	}

	resp, err := client.GenerateImages(ctx, generateReq)
	if err != nil {
		log.Printf("Error calling GenerateImages API: %v", err)
		return nil, fmt.Errorf("failed to call GenerateImages API: %w", err)
	}

	if resp.Error != nil {
		log.Printf("API returned an error: %s - %s", resp.Error.Code, resp.Error.Message)
		return nil, fmt.Errorf("API error: %s - %s", resp.Error.Code, resp.Error.Message)
	}

	log.Printf("Successfully generated %d images.", len(resp.Data))

	var downloadedImages [][]byte
	for i, imageInfo := range resp.Data {
		if imageInfo.Url == nil {
			log.Printf("Image %d has no URL, skipping.", i+1)
			continue
		}

		log.Printf("Downloading image %d from URL: %s", i+1, *imageInfo.Url)
		httpResp, err := http.Get(*imageInfo.Url)
		if err != nil {
			log.Printf("Error downloading image from %s: %v", *imageInfo.Url, err)
			// Decide if we should return an error or just skip this image.
			// For now, we'll skip.
			continue
		}
		defer httpResp.Body.Close()

		if httpResp.StatusCode != http.StatusOK {
			log.Printf("Error downloading image: received status code %d", httpResp.StatusCode)
			continue
		}

		imageData, err := io.ReadAll(httpResp.Body)
		if err != nil {
			log.Printf("Error reading image data from response body: %v", err)
			continue
		}
		downloadedImages = append(downloadedImages, imageData)
		log.Printf("Finished downloading image %d.", i+1)
	}

	return &pb.GenDoubaoImageResponse{Images: downloadedImages}, nil
}

func main() {
	lis, err := net.Listen("tcp", port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	s := grpc.NewServer()
	pb.RegisterGenDoubaoImageServer(s, &server{})
	log.Printf("Server listening at %v", lis.Addr())
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
