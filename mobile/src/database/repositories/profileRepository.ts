/**
 * Profile repository — CRUD operations for user profile & health metrics.
 *
 * Key behaviour:
 * - `upsertHealthMetrics` automatically computes BMI / BMR / TDEE / water target
 *   then either INSERTs a new row (if no record exists for today) or UPDATEs the
 *   existing one (prevents duplicate rows within the same day).
 */

import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';
import type {
	ActivityLevel,
	Gender,
	HealthGoal,
	HealthMetricsRow,
} from '@t/health.types';
import { calculateAge, calculateAllMetrics } from '@utils/healthCalculations';

// ---------------------------------------------------------------------------
// Types specific to repository I/O
// ---------------------------------------------------------------------------

export interface UserProfileRow {
	id: number;
	googleId: string | null;
	email: string;
	displayName: string;
	photoUrl: string | null;
	gender: Gender | null;
	dateOfBirth: string | null;
	role: string;
	status: string;
	createdAt: string;
	updatedAt: string;
}

export interface UpdateUserProfileParams {
	gender?: Gender;
	dateOfBirth?: string;
	displayName?: string;
	photoUrl?: string | null;
}

export interface UpsertHealthMetricsParams {
	weightKg: number;
	heightCm: number;
	activityLevel: ActivityLevel;
	goal: HealthGoal;
	bodyFatPct?: number | null;
	notes?: string | null;
}

// ---------------------------------------------------------------------------
// User profile CRUD
// ---------------------------------------------------------------------------

/**
 * Fetch user profile from the `users` table.
 */
export async function getUserProfile(
	db: SQLiteDatabase,
	userId: number,
): Promise<UserProfileRow | null> {
	const row = await db.getFirstAsync<{
		id: number;
		google_id: string | null;
		email: string;
		display_name: string;
		photo_url: string | null;
		gender: Gender | null;
		date_of_birth: string | null;
		role: string;
		status: string;
		created_at: string;
		updated_at: string;
	}>('SELECT * FROM users WHERE id = ?;', [userId]);

	if (!row) return null;

	return {
		id: row.id,
		googleId: row.google_id,
		email: row.email,
		displayName: row.display_name,
		photoUrl: row.photo_url,
		gender: row.gender,
		dateOfBirth: row.date_of_birth,
		role: row.role,
		status: row.status,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

/**
 * Update user-level profile fields (gender, date_of_birth, display_name, photo_url).
 */
export async function updateUserProfile(
	db: SQLiteDatabase,
	userId: number,
	params: UpdateUserProfileParams,
): Promise<void> {
	const setClauses: string[] = [];
	const values: SQLiteBindValue[] = [];

	if (params.gender !== undefined) {
		setClauses.push('gender = ?');
		values.push(params.gender);
	}
	if (params.dateOfBirth !== undefined) {
		setClauses.push('date_of_birth = ?');
		values.push(params.dateOfBirth);
	}
	if (params.displayName !== undefined) {
		setClauses.push('display_name = ?');
		values.push(params.displayName);
	}
	if (params.photoUrl !== undefined) {
		setClauses.push('photo_url = ?');
		values.push(params.photoUrl);
	}

	if (setClauses.length === 0) return;

	setClauses.push("updated_at = datetime('now')");
	values.push(userId);

	await db.runAsync(
		`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?;`,
		values,
	);
}

// ---------------------------------------------------------------------------
// Health metrics CRUD
// ---------------------------------------------------------------------------

/**
 * Fetch the most recent health_metrics record for a user.
 */
export async function getLatestHealthMetrics(
	db: SQLiteDatabase,
	userId: number,
): Promise<HealthMetricsRow | null> {
	const row = await db.getFirstAsync<{
		id: number;
		user_id: number;
		measured_at: string;
		height_cm: number | null;
		weight_kg: number | null;
		age: number | null;
		bmi: number | null;
		bmr: number | null;
		tdee: number | null;
		water_target_ml: number | null;
		body_fat_pct: number | null;
		activity_level: ActivityLevel | null;
		goal: HealthGoal | null;
		notes: string | null;
		created_at: string;
		updated_at: string;
	}>(
		`SELECT * FROM health_metrics
		 WHERE user_id = ?
		 ORDER BY measured_at DESC
		 LIMIT 1;`,
		[userId],
	);

	if (!row) return null;

	return mapHealthMetricsRow(row);
}

/**
 * UPSERT health metrics for today.
 *
 * Flow:
 * 1. Read `gender` & `date_of_birth` from the `users` table.
 * 2. Compute `age` from `date_of_birth`.
 * 3. Call `calculateAllMetrics()` to derive BMI / BMR / TDEE / water target.
 * 4. If a `health_metrics` row already exists for today → UPDATE it.
 * 5. Otherwise → INSERT a new row.
 *
 * @throws {Error} if user is missing gender or date_of_birth (required for BMR).
 */
export async function upsertHealthMetrics(
	db: SQLiteDatabase,
	userId: number,
	params: UpsertHealthMetricsParams,
): Promise<HealthMetricsRow> {
	// 1. Fetch user profile for gender & DOB
	const user = await db.getFirstAsync<{
		gender: Gender | null;
		date_of_birth: string | null;
	}>('SELECT gender, date_of_birth FROM users WHERE id = ?;', [userId]);

	if (!user) {
		throw new Error(`User with id ${userId} not found`);
	}
	if (!user.gender) {
		throw new Error('Cannot compute BMR: user gender is not set. Please update your profile.');
	}
	if (!user.date_of_birth) {
		throw new Error(
			'Cannot compute BMR: user date of birth is not set. Please update your profile.',
		);
	}

	// 2. Compute age
	const age = calculateAge(user.date_of_birth);

	// 3. Calculate all metrics
	const metrics = calculateAllMetrics({
		weightKg: params.weightKg,
		heightCm: params.heightCm,
		age,
		gender: user.gender,
		activityLevel: params.activityLevel,
		goal: params.goal,
	});

	const now = new Date().toISOString();
	const todayDate = now.slice(0, 10); // YYYY-MM-DD

	// 4. Check if a record already exists for today
	const existing = await db.getFirstAsync<{ id: number }>(
		`SELECT id FROM health_metrics
		 WHERE user_id = ? AND date(measured_at) = ?;`,
		[userId, todayDate],
	);

	if (existing) {
		// UPDATE existing row
		await db.runAsync(
			`UPDATE health_metrics SET
				height_cm = ?,
				weight_kg = ?,
				age = ?,
				bmi = ?,
				bmr = ?,
				tdee = ?,
				water_target_ml = ?,
				body_fat_pct = ?,
				activity_level = ?,
				goal = ?,
				notes = ?,
				updated_at = ?
			 WHERE id = ?;`,
			[
				params.heightCm,
				params.weightKg,
				age,
				metrics.bmi,
				metrics.bmr,
				metrics.tdee,
				metrics.waterTargetMl,
				params.bodyFatPct ?? null,
				params.activityLevel,
				params.goal,
				params.notes ?? null,
				now,
				existing.id,
			],
		);
	} else {
		// INSERT new row
		await db.runAsync(
			`INSERT INTO health_metrics (
				user_id, measured_at, height_cm, weight_kg, age,
				bmi, bmr, tdee, water_target_ml,
				body_fat_pct, activity_level, goal, notes,
				created_at, updated_at
			 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
			[
				userId,
				now,
				params.heightCm,
				params.weightKg,
				age,
				metrics.bmi,
				metrics.bmr,
				metrics.tdee,
				metrics.waterTargetMl,
				params.bodyFatPct ?? null,
				params.activityLevel,
				params.goal,
				params.notes ?? null,
				now,
				now,
			],
		);
	}

	// 5. Return the latest state
	const latest = await getLatestHealthMetrics(db, userId);
	return latest!;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function mapHealthMetricsRow(row: {
	id: number;
	user_id: number;
	measured_at: string;
	height_cm: number | null;
	weight_kg: number | null;
	age: number | null;
	bmi: number | null;
	bmr: number | null;
	tdee: number | null;
	water_target_ml: number | null;
	body_fat_pct: number | null;
	activity_level: ActivityLevel | null;
	goal: HealthGoal | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}): HealthMetricsRow {
	return {
		id: row.id,
		userId: row.user_id,
		measuredAt: row.measured_at,
		heightCm: row.height_cm,
		weightKg: row.weight_kg,
		age: row.age,
		bmi: row.bmi,
		bmr: row.bmr,
		tdee: row.tdee,
		waterTargetMl: row.water_target_ml,
		bodyFatPct: row.body_fat_pct,
		activityLevel: row.activity_level,
		goal: row.goal,
		notes: row.notes,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}
