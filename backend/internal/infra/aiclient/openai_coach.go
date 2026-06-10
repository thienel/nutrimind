package aiclient

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	openai "github.com/sashabaranov/go-openai"

	"nutrimind-backend/internal/usecase/service"
)

const (
	adviceSystemPrompt = `You are NutriMind AI, a professional Vietnamese nutrition coach.
Analyze the user's health profile and today's food/water intake, then provide personalized nutritional advice in Vietnamese.
Return ONLY a valid JSON object with no extra text or markdown fences.
Required fields:
- advice: string (personalized advice in Vietnamese, 2-4 sentences)
- disclaimer: string (always: "Đây là tư vấn từ AI và không thay thế ý kiến chuyên gia dinh dưỡng.")`

	suggestionSystemPrompt = `You are NutriMind AI, a professional Vietnamese nutrition coach.
Based on the user's remaining nutritional budget for today, suggest an appropriate meal in Vietnamese.
Return ONLY a valid JSON object with no extra text or markdown fences.
Required fields:
- suggestion: string (meal suggestion in Vietnamese, 2-3 sentences)
- estimated_calories: number (estimated kcal)
- estimated_protein_g: number (estimated grams of protein)
- estimated_carb_g: number (estimated grams of carbohydrates)
- estimated_fat_g: number (estimated grams of fat)
- disclaimer: string (always: "Đây là ước tính từ AI, giá trị thực tế có thể khác tùy cách chế biến.")`
)

type adviceRaw struct {
	Advice     string `json:"advice"`
	Disclaimer string `json:"disclaimer"`
}

type suggestionRaw struct {
	Suggestion        string  `json:"suggestion"`
	EstimatedCalories float64 `json:"estimated_calories"`
	EstimatedProteinG float64 `json:"estimated_protein_g"`
	EstimatedCarbG    float64 `json:"estimated_carb_g"`
	EstimatedFatG     float64 `json:"estimated_fat_g"`
	Disclaimer        string  `json:"disclaimer"`
}

// GetDailyAdvice builds context from input and calls OpenAI for daily nutrition advice.
func (c *OpenAIClient) GetDailyAdvice(ctx context.Context, input service.NutritionAdviceInput) (*service.AdviceResult, error) {
	userMsg := buildAdviceContext(input)

	req := openai.ChatCompletionRequest{
		Model: c.model,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: adviceSystemPrompt},
			{Role: openai.ChatMessageRoleUser, Content: userMsg},
		},
		MaxTokens: 600,
	}

	resp, err := c.client.CreateChatCompletion(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("openai api error: %w", err)
	}
	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("openai returned empty response")
	}

	content := stripFences(strings.TrimSpace(resp.Choices[0].Message.Content))

	var raw adviceRaw
	if err := json.Unmarshal([]byte(content), &raw); err != nil {
		return nil, fmt.Errorf("failed to parse AI advice response: %w", err)
	}

	return &service.AdviceResult{
		Advice:     raw.Advice,
		Disclaimer: raw.Disclaimer,
	}, nil
}

// GetMealSuggestion builds context from input and calls OpenAI for a meal suggestion.
func (c *OpenAIClient) GetMealSuggestion(ctx context.Context, input service.MealSuggestionInput) (*service.MealSuggestionResult, error) {
	userMsg := buildSuggestionContext(input)

	req := openai.ChatCompletionRequest{
		Model: c.model,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: suggestionSystemPrompt},
			{Role: openai.ChatMessageRoleUser, Content: userMsg},
		},
		MaxTokens: 500,
	}

	resp, err := c.client.CreateChatCompletion(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("openai api error: %w", err)
	}
	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("openai returned empty response")
	}

	content := stripFences(strings.TrimSpace(resp.Choices[0].Message.Content))

	var raw suggestionRaw
	if err := json.Unmarshal([]byte(content), &raw); err != nil {
		return nil, fmt.Errorf("failed to parse AI suggestion response: %w", err)
	}

	return &service.MealSuggestionResult{
		Suggestion:        raw.Suggestion,
		EstimatedCalories: raw.EstimatedCalories,
		EstimatedProteinG: raw.EstimatedProteinG,
		EstimatedCarbG:    raw.EstimatedCarbG,
		EstimatedFatG:     raw.EstimatedFatG,
		Disclaimer:        raw.Disclaimer,
	}, nil
}

// buildAdviceContext converts the input struct into a natural-language context string.
func buildAdviceContext(in service.NutritionAdviceInput) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf(
		"User profile: %d years old, %s, %.1f kg, %.1f cm, goal: %s, activity: %s.\n",
		in.Age, in.Gender, in.WeightKg, in.HeightCm, in.Goal, in.ActivityLevel,
	))
	sb.WriteString(fmt.Sprintf(
		"Daily targets: %.0f kcal | protein %.1fg | carb %.1fg | fat %.1fg | water %dml.\n",
		in.CalorieTarget, in.ProteinTargetG, in.CarbTargetG, in.FatTargetG, in.WaterTargetMl,
	))
	sb.WriteString(fmt.Sprintf(
		"Today logged (%d meals): %.0f kcal | protein %.1fg | carb %.1fg | fat %.1fg | water %dml.\n",
		in.MealCount, in.CaloriesLogged, in.ProteinLogged, in.CarbLogged, in.FatLogged, in.WaterMlLogged,
	))
	if in.UserPrompt != "" {
		sb.WriteString(fmt.Sprintf("User says: %s\n", in.UserPrompt))
	}
	sb.WriteString("Please give tailored nutritional advice based on the above data.")
	return sb.String()
}

// buildSuggestionContext converts the input struct into a natural-language context string.
func buildSuggestionContext(in service.MealSuggestionInput) string {
	mealTypeVi := mealTypeVietnamese(in.MealType)
	return fmt.Sprintf(
		"User goal: %s.\nMeal to suggest: %s (%s).\nRemaining budget for today: %.0f kcal | protein %.1fg | carb %.1fg | fat %.1fg.\nSuggest a suitable Vietnamese or common meal for this budget.",
		in.Goal, in.MealType, mealTypeVi,
		in.RemainingCalories, in.RemainingProteinG, in.RemainingCarbG, in.RemainingFatG,
	)
}

func mealTypeVietnamese(t string) string {
	switch t {
	case "BREAKFAST":
		return "bữa sáng"
	case "LUNCH":
		return "bữa trưa"
	case "DINNER":
		return "bữa tối"
	case "SNACK":
		return "bữa phụ"
	default:
		return t
	}
}

// stripFences removes markdown code fences if the model adds them.
func stripFences(s string) string {
	if strings.HasPrefix(s, "```") {
		lines := strings.Split(s, "\n")
		if len(lines) > 2 {
			return strings.Join(lines[1:len(lines)-1], "\n")
		}
	}
	return s
}

// ensure compile-time interface satisfaction
var _ service.NutritionAdvisor = (*OpenAIClient)(nil)
