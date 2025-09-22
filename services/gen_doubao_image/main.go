package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"

	"github.com/volcengine/volcengine-go-sdk/service/arkruntime"
	"github.com/volcengine/volcengine-go-sdk/service/arkruntime/model"
	"github.com/volcengine/volcengine-go-sdk/volcengine"
	"google.golang.org/grpc"
	pb "gen_doubao_image/gen"
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

	client := arkruntime.NewClientWithApiKey(apiKey)

	// The user mentioned the 'Image' field is a placeholder for now.
	// We will ignore it in this implementation.
	// images := make([]string, len(in.GetImages()))
	// for i, imgBytes := range in.GetImages() {
	//  // This is a placeholder. In a real scenario, you might save the bytes
	//  // to a temporary file and get a URL, or upload them to a service.
	// 	images[i] = "some_url"
	// }

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
