package cache

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"

	"nutrimind-backend/internal/usecase/service"
)

// redisDupChecker implements service.MealDupChecker using Redis SET NX.
type redisDupChecker struct {
	client *redis.Client
}

// NewRedisDupChecker creates a MealDupChecker backed by Redis.
func NewRedisDupChecker(client *redis.Client) service.MealDupChecker {
	return &redisDupChecker{client: client}
}

// CheckAndMark returns true if the key already exists (duplicate), false otherwise.
// On Redis error, it fails open (returns false) so requests are never blocked by infra issues.
func (r *redisDupChecker) CheckAndMark(ctx context.Context, key string, ttl time.Duration) (bool, error) {
	// SetNX: SET key 1 NX PX ttl
	// Returns true  → key was newly set  → NOT a duplicate
	// Returns false → key already existed → IS a duplicate
	ok, err := r.client.SetNX(ctx, key, 1, ttl).Result()
	if err != nil {
		return false, nil // fail open
	}
	return !ok, nil
}

// noopDupChecker always reports no duplicate — used as a safe fallback.
type noopDupChecker struct{}

// NewNoopDupChecker returns a MealDupChecker that never blocks any request.
func NewNoopDupChecker() service.MealDupChecker {
	return &noopDupChecker{}
}

func (n *noopDupChecker) CheckAndMark(_ context.Context, _ string, _ time.Duration) (bool, error) {
	return false, nil
}
