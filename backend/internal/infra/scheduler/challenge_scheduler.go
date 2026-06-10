package scheduler

import (
	"context"
	"time"

	"github.com/thienel/tlog"
	"go.uber.org/zap"

	"nutrimind-backend/internal/domain/entity"
	"nutrimind-backend/internal/domain/repository"
)

// ChallengeScheduler runs daily at 23:59 ICT to evaluate active challenge enrollments.
type ChallengeScheduler struct {
	enrollmentRepo repository.ChallengeEnrollmentRepository
	completionRepo repository.ChallengeDailyCompletionRepository
	challengeRepo  repository.ChallengeRepository
	mealRepo       repository.MealEntryRepository
	waterRepo      repository.WaterEntryRepository
	profileRepo    repository.HealthProfileRepository
}

// NewChallengeScheduler creates a new ChallengeScheduler.
func NewChallengeScheduler(
	enrollmentRepo repository.ChallengeEnrollmentRepository,
	completionRepo repository.ChallengeDailyCompletionRepository,
	challengeRepo repository.ChallengeRepository,
	mealRepo repository.MealEntryRepository,
	waterRepo repository.WaterEntryRepository,
	profileRepo repository.HealthProfileRepository,
) *ChallengeScheduler {
	return &ChallengeScheduler{
		enrollmentRepo: enrollmentRepo,
		completionRepo: completionRepo,
		challengeRepo:  challengeRepo,
		mealRepo:       mealRepo,
		waterRepo:      waterRepo,
		profileRepo:    profileRepo,
	}
}

// Start blocks and fires daily at 23:59 ICT (Asia/Ho_Chi_Minh) until ctx is cancelled.
func (s *ChallengeScheduler) Start(ctx context.Context) {
	ictLoc, err := time.LoadLocation("Asia/Ho_Chi_Minh")
	if err != nil {
		tlog.Error("challenge scheduler: failed to load timezone", zap.Error(err))
		return
	}
	tlog.Info("Challenge scheduler started")

	for {
		now := time.Now().In(ictLoc)
		target := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 0, 0, ictLoc)
		if !target.After(now) {
			target = target.Add(24 * time.Hour)
		}

		select {
		case <-time.After(time.Until(target)):
			s.evaluate(ctx, ictLoc)
		case <-ctx.Done():
			tlog.Info("Challenge scheduler stopped")
			return
		}
	}
}

func (s *ChallengeScheduler) evaluate(ctx context.Context, ictLoc *time.Location) {
	today := time.Now().In(ictLoc).Truncate(24 * time.Hour).UTC()

	enrollments, err := s.enrollmentRepo.FindAllActive(ctx)
	if err != nil {
		tlog.Error("challenge scheduler: failed to load enrollments", zap.Error(err))
		return
	}

	// Build a cache of challenge types to avoid repeated DB queries.
	challengeCache := make(map[uint]*entity.Challenge)

	for i := range enrollments {
		e := &enrollments[i]

		ch, ok := challengeCache[e.ChallengeID]
		if !ok {
			c, err := s.challengeRepo.FindByID(ctx, e.ChallengeID)
			if err != nil {
				continue
			}
			challengeCache[e.ChallengeID] = c
			ch = c
		}

		profile, err := s.profileRepo.FindByUserID(ctx, e.UserID)
		if err != nil {
			continue
		}

		var metGoal bool
		switch ch.Type {
		case entity.ChallengeTypeHydration:
			waterTotal, _ := s.waterRepo.SumByUserIDAndDate(ctx, e.UserID, today)
			metGoal = waterTotal >= profile.WaterTargetMl
		case entity.ChallengeTypeCalorieGoal:
			macros, _ := s.mealRepo.SumMacrosByUserIDAndDate(ctx, e.UserID, today)
			metGoal = profile.CalorieTarget > 0 && macros.TotalCalories > 0 && macros.TotalCalories <= profile.CalorieTarget
		}

		completion := &entity.ChallengeDailyCompletion{
			EnrollmentID:   e.ID,
			CompletionDate: today,
			MetGoal:        metGoal,
		}
		if err := s.completionRepo.Create(ctx, completion); err != nil {
			tlog.Warn("challenge scheduler: failed to create daily completion",
				zap.Uint("enrollmentID", e.ID), zap.Error(err))
		}

		// If today is the enrollment's end_date, finalise the enrollment.
		endDate := e.EndDate.UTC().Truncate(24 * time.Hour)
		if !today.Before(endDate) {
			metCount, _ := s.completionRepo.CountMetGoalByEnrollmentID(ctx, e.ID)
			if metCount == int64(ch.DurationDays) {
				e.Status = entity.EnrollmentStatusCompleted
				e.BadgeAwarded = true
			} else {
				e.Status = entity.EnrollmentStatusCompleted
			}
			if err := s.enrollmentRepo.Update(ctx, e); err != nil {
				tlog.Warn("challenge scheduler: failed to finalise enrollment",
					zap.Uint("enrollmentID", e.ID), zap.Error(err))
			}
		}
	}
}
