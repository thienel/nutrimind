import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Migration v1 — Add health-profile columns.
 *
 * Adds:
 *   • users.gender           – required for BMR (Mifflin-St Jeor)
 *   • users.date_of_birth    – used to compute age automatically
 *   • health_metrics.age     – cached age at measurement time
 *   • health_metrics.water_target_ml – daily water intake goal (ml)
 *
 * Uses ALTER TABLE ADD COLUMN which is safe on existing data (new cols default NULL).
 */

const statements = [
	"ALTER TABLE users ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female'));",
	'ALTER TABLE users ADD COLUMN date_of_birth TEXT;',
	'ALTER TABLE health_metrics ADD COLUMN age INTEGER;',
	'ALTER TABLE health_metrics ADD COLUMN water_target_ml INTEGER;',
];

/**
 * Run migration v1 inside the given database.
 *
 * Each ALTER TABLE is wrapped in a try/catch so the migration is idempotent:
 * re-running it after the columns already exist will not throw.
 */
export async function migrateV1(db: SQLiteDatabase): Promise<void> {
	for (const sql of statements) {
		try {
			await db.execAsync(sql);
		} catch (err: unknown) {
			// "duplicate column name" is expected on re-run — swallow it.
			const msg = err instanceof Error ? err.message : String(err);
			if (!msg.includes('duplicate column name')) {
				throw err;
			}
		}
	}
}
