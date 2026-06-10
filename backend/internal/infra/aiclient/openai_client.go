package aiclient

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"

	openai "github.com/sashabaranov/go-openai"

	"nutrimind-backend/internal/usecase/service"
)

// OpenAIClient wraps the OpenAI SDK to implement service.FoodPhotoAnalyzer.
type OpenAIClient struct {
	client *openai.Client
	model  string
}

// NewOpenAIClient creates a new OpenAI vision client.
func NewOpenAIClient(apiKey, model string) *OpenAIClient {
	return &OpenAIClient{
		client: openai.NewClient(apiKey),
		model:  model,
	}
}

type foodAnalysisRaw struct {
	FoodName   string  `json:"food_name"`
	Calories   float64 `json:"calories"`
	ProteinG   float64 `json:"protein_g"`
	CarbG      float64 `json:"carb_g"`
	FatG       float64 `json:"fat_g"`
	Confidence float64 `json:"confidence"`
}

const systemPrompt = `You are a nutrition analysis AI. Analyze the food in the provided image and return ONLY a JSON object with no extra text or markdown fences.
Required fields:
- food_name: string (Vietnamese or English name of the dish)
- calories: number (total kcal for the visible portion)
- protein_g: number (grams of protein)
- carb_g: number (grams of carbohydrates)
- fat_g: number (grams of fat)
- confidence: number between 0.0 and 1.0 (how confident you are in the estimate)`

// AnalyzeFood sends the image to OpenAI Vision and returns nutrition analysis.
func (c *OpenAIClient) AnalyzeFood(ctx context.Context, imageData []byte, mimeType string, description string) (*service.AIAnalysisResult, error) {
	b64 := base64.StdEncoding.EncodeToString(imageData)
	dataURL := fmt.Sprintf("data:%s;base64,%s", mimeType, b64)

	userText := "Analyze the food nutrition in this image."
	if description != "" {
		userText = fmt.Sprintf("Analyze the food nutrition in this image. Additional context from user: %s", description)
	}

	req := openai.ChatCompletionRequest{
		Model: c.model,
		Messages: []openai.ChatCompletionMessage{
			{
				Role:    openai.ChatMessageRoleSystem,
				Content: systemPrompt,
			},
			{
				Role: openai.ChatMessageRoleUser,
				MultiContent: []openai.ChatMessagePart{
					{
						Type: openai.ChatMessagePartTypeText,
						Text: userText,
					},
					{
						Type: openai.ChatMessagePartTypeImageURL,
						ImageURL: &openai.ChatMessageImageURL{
							URL:    dataURL,
							Detail: openai.ImageURLDetailAuto,
						},
					},
				},
			},
		},
		MaxTokens: 300,
	}

	resp, err := c.client.CreateChatCompletion(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("openai api error: %w", err)
	}

	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("openai returned empty response")
	}

	content := strings.TrimSpace(resp.Choices[0].Message.Content)
	// Strip markdown code fences if model adds them despite instructions
	if strings.HasPrefix(content, "```") {
		lines := strings.Split(content, "\n")
		if len(lines) > 2 {
			content = strings.Join(lines[1:len(lines)-1], "\n")
		}
	}

	var raw foodAnalysisRaw
	if err := json.Unmarshal([]byte(content), &raw); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	return &service.AIAnalysisResult{
		FoodName:      raw.FoodName,
		Calories:      raw.Calories,
		ProteinG:      raw.ProteinG,
		CarbG:         raw.CarbG,
		FatG:          raw.FatG,
		Confidence:    raw.Confidence,
		LowConfidence: raw.Confidence < service.AILowConfidenceThreshold,
		Disclaimer:    "AI estimate — please verify before saving",
	}, nil
}

// ensure compile-time interface satisfaction
var _ service.FoodPhotoAnalyzer = (*OpenAIClient)(nil)
