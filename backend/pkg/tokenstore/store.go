package tokenstore

import (
	"sync"
	"time"
)

// Store is a thread-safe in-memory blacklist for invalidated tokens.
// Each entry is kept until its natural expiry so memory stays bounded.
type Store interface {
	// Add puts a token JTI (or raw token string) into the blacklist until expiresAt.
	Add(token string, expiresAt time.Time)
	// IsBlacklisted returns true if the token has been revoked and is still within its expiry window.
	IsBlacklisted(token string) bool
}

type entry struct {
	expiresAt time.Time
}

type inMemoryStore struct {
	mu      sync.RWMutex
	entries map[string]entry
}

// New creates a new in-memory token blacklist store.
// The store automatically evicts expired entries at the given cleanupInterval.
func New(cleanupInterval time.Duration) Store {
	s := &inMemoryStore{
		entries: make(map[string]entry),
	}
	go s.cleanupLoop(cleanupInterval)
	return s
}

// Add inserts a token into the blacklist with its expiry time.
func (s *inMemoryStore) Add(token string, expiresAt time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.entries[token] = entry{expiresAt: expiresAt}
}

// IsBlacklisted returns true if the token is present and has not yet expired.
func (s *inMemoryStore) IsBlacklisted(token string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.entries[token]
	if !ok {
		return false
	}
	// If the token's natural expiry has passed it is no longer a threat;
	// the cleanup loop will remove it on the next cycle.
	return time.Now().Before(e.expiresAt)
}

// cleanupLoop periodically removes expired entries to prevent unbounded memory growth.
func (s *inMemoryStore) cleanupLoop(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for range ticker.C {
		s.evictExpired()
	}
}

func (s *inMemoryStore) evictExpired() {
	now := time.Now()
	s.mu.Lock()
	defer s.mu.Unlock()
	for token, e := range s.entries {
		if now.After(e.expiresAt) {
			delete(s.entries, token)
		}
	}
}
