package fcm

import (
	"context"
	"fmt"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

// Message is the payload for a push notification.
type Message struct {
	Title    string
	Body     string
	DeepLink string
}

// Sender is the interface for sending FCM push notifications.
type Sender interface {
	Send(ctx context.Context, token string, msg Message) error
}

// --- Firebase implementation ---

type firebaseSender struct {
	client *messaging.Client
}

// NewFirebaseSender creates a Sender backed by the Firebase Admin SDK.
// If credentialsJSON is empty, Application Default Credentials are used.
func NewFirebaseSender(ctx context.Context, projectID, credentialsJSON string) (Sender, error) {
	var opts []option.ClientOption
	if credentialsJSON != "" {
		opts = append(opts, option.WithCredentialsJSON([]byte(credentialsJSON)))
	}

	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID}, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to init Firebase app: %w", err)
	}

	client, err := app.Messaging(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to init Firebase messaging client: %w", err)
	}

	return &firebaseSender{client: client}, nil
}

func (s *firebaseSender) Send(ctx context.Context, token string, msg Message) error {
	_, err := s.client.Send(ctx, &messaging.Message{
		Token: token,
		Notification: &messaging.Notification{
			Title: msg.Title,
			Body:  msg.Body,
		},
		Data: map[string]string{
			"deep_link": msg.DeepLink,
		},
	})
	return err
}

// --- Noop implementation (used when Firebase is not configured) ---

type noopSender struct{}

// NewNoopSender returns a Sender that does nothing (fails open).
func NewNoopSender() Sender { return &noopSender{} }

func (s *noopSender) Send(_ context.Context, _ string, _ Message) error { return nil }
