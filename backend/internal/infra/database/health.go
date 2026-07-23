package database

import (
	"context"
	"errors"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// ConnCheck is the outcome of a single connectivity probe.
type ConnCheck struct {
	OK        bool   `json:"ok"`
	LatencyMs int64  `json:"latency_ms"`
	Error     string `json:"error,omitempty"`
}

// PoolStats mirrors the parts of sql.DBStats worth exposing.
type PoolStats struct {
	Open    int `json:"open"`
	InUse   int `json:"in_use"`
	Idle    int `json:"idle"`
	MaxOpen int `json:"max_open"`
}

// HealthReport describes database reachability.
//
// Pool and Fresh are reported separately on purpose. A connection that is
// already established keeps working after the server-side credentials change,
// so the pooled probe can pass while every newly opened connection fails
// authentication — which is precisely the state the reminder scheduler trips
// over, since it only ever needs new connections. Probing both makes that
// split visible instead of hiding it behind a green check.
type HealthReport struct {
	OK    bool      `json:"ok"`
	Pool  ConnCheck `json:"pool"`
	Fresh ConnCheck `json:"fresh_connection"`
	Stats PoolStats `json:"pool_stats"`
}

// CheckHealth probes the shared pool and a brand-new connection.
func CheckHealth(ctx context.Context) HealthReport {
	report := HealthReport{
		Pool:  checkPool(ctx),
		Fresh: checkFreshConn(ctx),
	}
	report.OK = report.Pool.OK && report.Fresh.OK

	if db != nil {
		if sqlDB, err := db.DB(); err == nil {
			s := sqlDB.Stats()
			report.Stats = PoolStats{
				Open:    s.OpenConnections,
				InUse:   s.InUse,
				Idle:    s.Idle,
				MaxOpen: s.MaxOpenConnections,
			}
		}
	}

	return report
}

// checkPool runs a trivial query through the shared pool, which may reuse an
// existing connection.
func checkPool(ctx context.Context) ConnCheck {
	start := time.Now()

	if db == nil {
		return ConnCheck{Error: "database not initialized"}
	}

	var n int
	if err := db.WithContext(ctx).Raw("SELECT 1").Scan(&n).Error; err != nil {
		return ConnCheck{LatencyMs: elapsedMs(start), Error: err.Error()}
	}

	return ConnCheck{OK: true, LatencyMs: elapsedMs(start)}
}

// checkFreshConn opens a throwaway connection with the configured credentials,
// reproducing what background workers do on every tick.
func checkFreshConn(ctx context.Context) ConnCheck {
	start := time.Now()

	if dsn == "" {
		return ConnCheck{Error: "database not initialized"}
	}

	probe, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return ConnCheck{LatencyMs: elapsedMs(start), Error: err.Error()}
	}

	sqlDB, err := probe.DB()
	if err != nil {
		return ConnCheck{LatencyMs: elapsedMs(start), Error: err.Error()}
	}
	defer sqlDB.Close()

	if err := sqlDB.PingContext(ctx); err != nil {
		return ConnCheck{LatencyMs: elapsedMs(start), Error: err.Error()}
	}

	var n int
	if err := probe.WithContext(ctx).Raw("SELECT 1").Scan(&n).Error; err != nil {
		return ConnCheck{LatencyMs: elapsedMs(start), Error: err.Error()}
	}
	if n != 1 {
		return ConnCheck{LatencyMs: elapsedMs(start), Error: errors.New("unexpected probe result").Error()}
	}

	return ConnCheck{OK: true, LatencyMs: elapsedMs(start)}
}

func elapsedMs(start time.Time) int64 {
	return time.Since(start).Milliseconds()
}
