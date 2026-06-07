/**
 * Health Summary repository — aggregated queries for the Health Summary screen.
 *
 * Provides a single `getHealthSummary()` that returns the latest metrics plus
 * a 30-day (configurable) weight history in one call.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type {
	ActivityLevel,
	BMICategory,
	HealthGoal,
	HealthSummary,
	WeightHistoryPoint,
} from '@t/health.types';
import { getBMICategory } from '@utils/healthCalculations';

// ---------------------------------------------------------------------------
// Weight history
// ---------------------------------------------------------------------------

/**
 * Fetch weight history for the last `days` days.
 *
 * Returns one point per day (the latest measurement if multiple exist on the
 * same day), ordered chronologically (oldest first) for charting.
 *
 * @param days — look-back window, defaults to 30.
 */
export async function getWeightHistory(
	db: SQLiteDatabase,
	userId: number,
	days: number = 30,
): Promise<WeightHistoryPoint[]> {
	const rows = await db.getAllAsync<{
		date: string;
		weight_kg: number;
		bmi: number | null;
	}>(
		`SELECT
			date(measured_at) AS date,
			weight_kg,
			bmi
		 FROM health_metrics
		 WHERE user_id = ?
		   AND measured_at >= date('now', ? || ' days')
		   AND weight_kg IS NOT NULL
		 GROUP BY date(measured_at)
		 HAVING measured_at = MAX(measured_at)
		 ORDER BY date ASC;`,
		[userId, `-${days}`],
	);

	return rows.map((r) => ({
		date: r.date,
		weightKg: r.weight_kg,
		bmi: r.bmi,
	}));
}

// ---------------------------------------------------------------------------
// Aggregated health summary
// ---------------------------------------------------------------------------

/**
 * Fetch a complete health summary for the given user.
 *
 * Includes:
 * - Latest metrics (BMI, BMR, TDEE, water target, weight, height, etc.)
 * - BMI category classification
 * - Weight history (last 30 days by default)
 */
export async function getHealthSummary(
	db: SQLiteDatabase,
	userId: number,
	historyDays: number = 30,
): Promise<HealthSummary> {
	// 1. Latest health metrics
	const latest = await db.getFirstAsync<{
		bmi: number | null;
		bmr: number | null;
		tdee: number | null;
		water_target_ml: number | null;
		weight_kg: number | null;
		height_cm: number | null;
		activity_level: ActivityLevel | null;
		goal: HealthGoal | null;
		measured_at: string | null;
	}>(
		`SELECT
			bmi, bmr, tdee, water_target_ml,
			weight_kg, height_cm,
			activity_level, goal,
			measured_at
		 FROM health_metrics
		 WHERE user_id = ?
		 ORDER BY measured_at DESC
		 LIMIT 1;`,
		[userId],
	);

	// 2. Weight history
	const weightHistory = await getWeightHistory(db, userId, historyDays);

	// 3. Build summary
	let bmiCategory: BMICategory | null = null;
	if (latest?.bmi != null) {
		bmiCategory = getBMICategory(latest.bmi);
	}

	return {
		current: {
			bmi: latest?.bmi ?? null,
			bmr: latest?.bmr ?? null,
			tdee: latest?.tdee ?? null,
			waterTargetMl: latest?.water_target_ml ?? null,
			weightKg: latest?.weight_kg ?? null,
			heightCm: latest?.height_cm ?? null,
			activityLevel: latest?.activity_level ?? null,
			goal: latest?.goal ?? null,
			measuredAt: latest?.measured_at ?? null,
		},
		weightHistory,
		bmiCategory,
	};
}
