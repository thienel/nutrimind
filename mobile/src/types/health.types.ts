/**
 * Health-related TypeScript types
 * Used across health calculations, profile repository, and health summary.
 *
 * References: SRS §3.1.3, §6.7
 */

// ---------------------------------------------------------------------------
// Enums / Literal Unions
// ---------------------------------------------------------------------------

/** 5-level activity scale used for TDEE multiplier (Harris-Benedict standard). */
export type ActivityLevel =
	| 'sedentary'
	| 'lightly_active'
	| 'moderately_active'
	| 'very_active'
	| 'extra_active';

export type Gender = 'male' | 'female';

export type HealthGoal = 'lose' | 'maintain' | 'gain';

export type BMICategory = 'Underweight' | 'Normal' | 'Overweight' | 'Obese';

// ---------------------------------------------------------------------------
// Calculation I/O
// ---------------------------------------------------------------------------

/** Input required to compute all health metrics. */
export interface HealthProfileInput {
	weightKg: number;
	heightCm: number;
	age: number;
	gender: Gender;
	activityLevel: ActivityLevel;
	goal: HealthGoal;
}

/** Computed output from `calculateAllMetrics`. */
export interface HealthMetricsResult {
	bmi: number;
	bmr: number;
	tdee: number;
	waterTargetMl: number;
}

// ---------------------------------------------------------------------------
// Database row shapes
// ---------------------------------------------------------------------------

/** Mirrors a row in the `health_metrics` SQLite table. */
export interface HealthMetricsRow {
	id: number;
	userId: number;
	measuredAt: string;
	heightCm: number | null;
	weightKg: number | null;
	age: number | null;
	bmi: number | null;
	bmr: number | null;
	tdee: number | null;
	waterTargetMl: number | null;
	bodyFatPct: number | null;
	activityLevel: ActivityLevel | null;
	goal: HealthGoal | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

// ---------------------------------------------------------------------------
// Health Summary (aggregated for UI)
// ---------------------------------------------------------------------------

/** A single data-point on the weight-history chart. */
export interface WeightHistoryPoint {
	/** ISO date string YYYY-MM-DD */
	date: string;
	weightKg: number;
	bmi: number | null;
}

/** Aggregated health data consumed by the Health Summary screen. */
export interface HealthSummary {
	current: {
		bmi: number | null;
		bmr: number | null;
		tdee: number | null;
		waterTargetMl: number | null;
		weightKg: number | null;
		heightCm: number | null;
		activityLevel: ActivityLevel | null;
		goal: HealthGoal | null;
		measuredAt: string | null;
	};
	weightHistory: WeightHistoryPoint[];
	bmiCategory: BMICategory | null;
}
