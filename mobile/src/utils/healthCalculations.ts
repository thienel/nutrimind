/**
 * Health calculations — BMI, BMR, TDEE, water target, macros.
 *
 * All functions are **pure** (no side-effects, no DB access) and designed
 * for easy unit-testing.
 *
 * References: SRS §3.1.3, §6.7
 */

import type {
	ActivityLevel,
	BMICategory,
	Gender,
	HealthMetricsResult,
	HealthProfileInput,
} from '@t/health.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Mifflin-St Jeor activity multipliers (5-level scale). */
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
	sedentary: 1.2,
	lightly_active: 1.375,
	moderately_active: 1.55,
	very_active: 1.725,
	extra_active: 1.9,
};

/** Water baseline = weight (kg) × WATER_ML_PER_KG. */
const WATER_ML_PER_KG = 30;

/** Extra water (ml) added when activity >= moderately_active. */
const WATER_MODERATE_BONUS_ML = 350;

/** Extra water (ml) added when activity >= very_active (replaces moderate bonus). */
const WATER_HIGH_BONUS_ML = 500;

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Return the TDEE multiplier for the given activity level.
 *
 * @example
 * getActivityMultiplier('sedentary'); // 1.2
 */
export function getActivityMultiplier(level: ActivityLevel): number {
	return ACTIVITY_MULTIPLIERS[level];
}

/**
 * Compute age in full years from an ISO date-of-birth string (`YYYY-MM-DD`).
 *
 * @example
 * calculateAge('1995-06-15'); // 31  (when called on 2026-06-07)
 */
export function calculateAge(dateOfBirth: string, referenceDate?: Date): number {
	const ref = referenceDate ?? new Date();
	const dob = new Date(dateOfBirth);

	let age = ref.getFullYear() - dob.getFullYear();
	const monthDiff = ref.getMonth() - dob.getMonth();

	if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < dob.getDate())) {
		age--;
	}

	return age;
}

// ---------------------------------------------------------------------------
// Core metric calculators
// ---------------------------------------------------------------------------

/**
 * Body Mass Index.
 *
 * Formula: `weight_kg / (height_m)²`
 *
 * @returns BMI rounded to 1 decimal place.
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
	if (heightCm <= 0) {
		throw new RangeError('heightCm must be positive');
	}
	if (weightKg <= 0) {
		throw new RangeError('weightKg must be positive');
	}

	const heightM = heightCm / 100;
	return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * Basal Metabolic Rate — **Mifflin-St Jeor** equation.
 *
 * - Male  : `10 × weight + 6.25 × height − 5 × age + 5`
 * - Female: `10 × weight + 6.25 × height − 5 × age − 161`
 *
 * @returns BMR in kcal/day, rounded to the nearest integer.
 */
export function calculateBMR(
	weightKg: number,
	heightCm: number,
	age: number,
	gender: Gender,
): number {
	const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
	const offset = gender === 'male' ? 5 : -161;
	return Math.round(base + offset);
}

/**
 * Total Daily Energy Expenditure.
 *
 * Formula: `BMR × activityMultiplier`
 *
 * @returns TDEE in kcal/day, rounded to the nearest integer.
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
	return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Daily water-intake target (ml).
 *
 * Baseline: `weight_kg × 30 ml`
 * Bonuses:
 * - `+350 ml` if activity ≥ moderately_active
 * - `+500 ml` if activity ≥ very_active (replaces the 350 ml bonus)
 *
 * @returns Target in whole ml.
 */
export function calculateWaterTarget(weightKg: number, activityLevel: ActivityLevel): number {
	let target = Math.round(weightKg * WATER_ML_PER_KG);

	if (activityLevel === 'very_active' || activityLevel === 'extra_active') {
		target += WATER_HIGH_BONUS_ML;
	} else if (activityLevel === 'moderately_active') {
		target += WATER_MODERATE_BONUS_ML;
	}

	return target;
}

// ---------------------------------------------------------------------------
// BMI classification
// ---------------------------------------------------------------------------

/**
 * WHO BMI category.
 *
 * | BMI        | Category     |
 * |------------|--------------|
 * | < 18.5     | Underweight  |
 * | 18.5–24.9  | Normal       |
 * | 25.0–29.9  | Overweight   |
 * | ≥ 30.0     | Obese        |
 */
export function getBMICategory(bmi: number): BMICategory {
	if (bmi < 18.5) return 'Underweight';
	if (bmi < 25) return 'Normal';
	if (bmi < 30) return 'Overweight';
	return 'Obese';
}

// ---------------------------------------------------------------------------
// Aggregate calculator
// ---------------------------------------------------------------------------

/**
 * Compute **all** health metrics from a single profile input.
 *
 * Convenience wrapper that calls `calculateBMI`, `calculateBMR`,
 * `calculateTDEE`, and `calculateWaterTarget` in sequence.
 */
export function calculateAllMetrics(input: HealthProfileInput): HealthMetricsResult {
	const bmi = calculateBMI(input.weightKg, input.heightCm);
	const bmr = calculateBMR(input.weightKg, input.heightCm, input.age, input.gender);
	const tdee = calculateTDEE(bmr, input.activityLevel);
	const waterTargetMl = calculateWaterTarget(input.weightKg, input.activityLevel);

	return { bmi, bmr, tdee, waterTargetMl };
}
