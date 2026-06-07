/**
 * Unit tests for healthCalculations.ts
 *
 * Covers: calculateBMI, calculateBMR, calculateTDEE, calculateWaterTarget,
 *         calculateAllMetrics, getBMICategory, calculateAge, getActivityMultiplier.
 */

import {
	calculateAge,
	calculateAllMetrics,
	calculateBMI,
	calculateBMR,
	calculateTDEE,
	calculateWaterTarget,
	getActivityMultiplier,
	getBMICategory,
} from '@utils/healthCalculations';

// ---------------------------------------------------------------------------
// calculateBMI
// ---------------------------------------------------------------------------
describe('calculateBMI', () => {
	it('computes correct BMI for normal weight (70 kg, 175 cm)', () => {
		// 70 / (1.75)² = 70 / 3.0625 ≈ 22.9
		expect(calculateBMI(70, 175)).toBe(22.9);
	});

	it('computes correct BMI for overweight (90 kg, 170 cm)', () => {
		// 90 / (1.70)² = 90 / 2.89 ≈ 31.1
		expect(calculateBMI(90, 170)).toBe(31.1);
	});

	it('computes correct BMI for underweight (45 kg, 165 cm)', () => {
		// 45 / (1.65)² = 45 / 2.7225 ≈ 16.5
		expect(calculateBMI(45, 165)).toBe(16.5);
	});

	it('rounds to 1 decimal place', () => {
		// 68 / (1.72)² = 68 / 2.9584 ≈ 22.9878… → 23.0
		const bmi = calculateBMI(68, 172);
		const decimals = bmi.toString().split('.')[1]?.length ?? 0;
		expect(decimals).toBeLessThanOrEqual(1);
	});

	it('throws RangeError for zero height', () => {
		expect(() => calculateBMI(70, 0)).toThrow(RangeError);
	});

	it('throws RangeError for negative height', () => {
		expect(() => calculateBMI(70, -175)).toThrow(RangeError);
	});

	it('throws RangeError for zero weight', () => {
		expect(() => calculateBMI(0, 175)).toThrow(RangeError);
	});

	it('throws RangeError for negative weight', () => {
		expect(() => calculateBMI(-5, 175)).toThrow(RangeError);
	});
});

// ---------------------------------------------------------------------------
// calculateBMR (Mifflin-St Jeor)
// ---------------------------------------------------------------------------
describe('calculateBMR', () => {
	it('computes correct BMR for male (70 kg, 175 cm, 30 years)', () => {
		// 10×70 + 6.25×175 − 5×30 + 5 = 700 + 1093.75 − 150 + 5 = 1648.75 → 1649
		expect(calculateBMR(70, 175, 30, 'male')).toBe(1649);
	});

	it('computes correct BMR for female (60 kg, 165 cm, 25 years)', () => {
		// 10×60 + 6.25×165 − 5×25 − 161 = 600 + 1031.25 − 125 − 161 = 1345.25 → 1345
		expect(calculateBMR(60, 165, 25, 'female')).toBe(1345);
	});

	it('male BMR is higher than female BMR for same body stats', () => {
		const maleBMR = calculateBMR(70, 175, 30, 'male');
		const femaleBMR = calculateBMR(70, 175, 30, 'female');
		expect(maleBMR).toBeGreaterThan(femaleBMR);
	});

	it('BMR decreases with age', () => {
		const young = calculateBMR(70, 175, 20, 'male');
		const older = calculateBMR(70, 175, 40, 'male');
		expect(young).toBeGreaterThan(older);
	});

	it('gender offset difference is exactly 166 kcal', () => {
		// male offset = +5, female offset = −161, diff = 166
		const male = calculateBMR(70, 175, 30, 'male');
		const female = calculateBMR(70, 175, 30, 'female');
		expect(male - female).toBe(166);
	});

	it('returns an integer (rounded)', () => {
		const bmr = calculateBMR(65.5, 168.3, 27, 'female');
		expect(Number.isInteger(bmr)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// calculateTDEE
// ---------------------------------------------------------------------------
describe('calculateTDEE', () => {
	const baseBMR = 1600;

	it('sedentary: BMR × 1.2', () => {
		expect(calculateTDEE(baseBMR, 'sedentary')).toBe(Math.round(baseBMR * 1.2));
	});

	it('lightly active: BMR × 1.375', () => {
		expect(calculateTDEE(baseBMR, 'lightly_active')).toBe(Math.round(baseBMR * 1.375));
	});

	it('moderately active: BMR × 1.55', () => {
		expect(calculateTDEE(baseBMR, 'moderately_active')).toBe(Math.round(baseBMR * 1.55));
	});

	it('very active: BMR × 1.725', () => {
		expect(calculateTDEE(baseBMR, 'very_active')).toBe(Math.round(baseBMR * 1.725));
	});

	it('extra active: BMR × 1.9', () => {
		expect(calculateTDEE(baseBMR, 'extra_active')).toBe(Math.round(baseBMR * 1.9));
	});

	it('TDEE increases with higher activity level', () => {
		const sedentary = calculateTDEE(baseBMR, 'sedentary');
		const light = calculateTDEE(baseBMR, 'lightly_active');
		const moderate = calculateTDEE(baseBMR, 'moderately_active');
		const active = calculateTDEE(baseBMR, 'very_active');
		const extra = calculateTDEE(baseBMR, 'extra_active');
		expect(sedentary).toBeLessThan(light);
		expect(light).toBeLessThan(moderate);
		expect(moderate).toBeLessThan(active);
		expect(active).toBeLessThan(extra);
	});

	it('returns an integer', () => {
		expect(Number.isInteger(calculateTDEE(1649, 'moderately_active'))).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// calculateWaterTarget
// ---------------------------------------------------------------------------
describe('calculateWaterTarget', () => {
	it('sedentary: weight × 30 ml only', () => {
		expect(calculateWaterTarget(70, 'sedentary')).toBe(2100);
	});

	it('lightly active: weight × 30 ml (no bonus)', () => {
		expect(calculateWaterTarget(70, 'lightly_active')).toBe(2100);
	});

	it('moderately active: weight × 30 ml + 350 ml', () => {
		expect(calculateWaterTarget(70, 'moderately_active')).toBe(2100 + 350);
	});

	it('very active: weight × 30 ml + 500 ml (replaces 350)', () => {
		expect(calculateWaterTarget(70, 'very_active')).toBe(2100 + 500);
	});

	it('extra active: weight × 30 ml + 500 ml', () => {
		expect(calculateWaterTarget(70, 'extra_active')).toBe(2100 + 500);
	});

	it('handles decimal weight (65.5 kg)', () => {
		// 65.5 × 30 = 1965
		expect(calculateWaterTarget(65.5, 'sedentary')).toBe(1965);
	});
});

// ---------------------------------------------------------------------------
// getBMICategory
// ---------------------------------------------------------------------------
describe('getBMICategory', () => {
	it('returns Underweight for BMI < 18.5', () => {
		expect(getBMICategory(16.0)).toBe('Underweight');
		expect(getBMICategory(18.4)).toBe('Underweight');
	});

	it('returns Normal for BMI 18.5–24.9', () => {
		expect(getBMICategory(18.5)).toBe('Normal');
		expect(getBMICategory(22.0)).toBe('Normal');
		expect(getBMICategory(24.9)).toBe('Normal');
	});

	it('returns Overweight for BMI 25–29.9', () => {
		expect(getBMICategory(25.0)).toBe('Overweight');
		expect(getBMICategory(27.5)).toBe('Overweight');
		expect(getBMICategory(29.9)).toBe('Overweight');
	});

	it('returns Obese for BMI ≥ 30', () => {
		expect(getBMICategory(30.0)).toBe('Obese');
		expect(getBMICategory(35.0)).toBe('Obese');
		expect(getBMICategory(45.0)).toBe('Obese');
	});

	// Boundary tests
	it('boundary: 18.49 → Underweight', () => {
		expect(getBMICategory(18.49)).toBe('Underweight');
	});

	it('boundary: 18.5 → Normal', () => {
		expect(getBMICategory(18.5)).toBe('Normal');
	});

	it('boundary: 25.0 → Overweight', () => {
		expect(getBMICategory(25.0)).toBe('Overweight');
	});

	it('boundary: 30.0 → Obese', () => {
		expect(getBMICategory(30.0)).toBe('Obese');
	});
});

// ---------------------------------------------------------------------------
// calculateAge
// ---------------------------------------------------------------------------
describe('calculateAge', () => {
	it('computes age correctly for a past birthday (birthday already passed this year)', () => {
		// Reference: 2026-06-07, DOB: 1995-01-15 → age = 31
		const ref = new Date('2026-06-07');
		expect(calculateAge('1995-01-15', ref)).toBe(31);
	});

	it('computes age correctly when birthday has not yet occurred this year', () => {
		// Reference: 2026-06-07, DOB: 1995-12-25 → age = 30 (birthday not yet)
		const ref = new Date('2026-06-07');
		expect(calculateAge('1995-12-25', ref)).toBe(30);
	});

	it('returns correct age on the birthday itself', () => {
		// Reference: 2026-06-07, DOB: 1995-06-07 → age = 31
		const ref = new Date('2026-06-07');
		expect(calculateAge('1995-06-07', ref)).toBe(31);
	});

	it('returns correct age the day before birthday', () => {
		// Reference: 2026-06-06, DOB: 1995-06-07 → age = 30
		const ref = new Date('2026-06-06');
		expect(calculateAge('1995-06-07', ref)).toBe(30);
	});

	it('handles leap year birthday (Feb 29)', () => {
		// DOB: 2000-02-29 (leap year), ref: 2026-02-28 → age = 25
		const ref = new Date('2026-02-28');
		expect(calculateAge('2000-02-29', ref)).toBe(25);
	});

	it('returns 0 for a newborn', () => {
		const today = new Date('2026-06-07');
		expect(calculateAge('2026-06-07', today)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// getActivityMultiplier
// ---------------------------------------------------------------------------
describe('getActivityMultiplier', () => {
	it('sedentary → 1.2', () => {
		expect(getActivityMultiplier('sedentary')).toBe(1.2);
	});

	it('lightly_active → 1.375', () => {
		expect(getActivityMultiplier('lightly_active')).toBe(1.375);
	});

	it('moderately_active → 1.55', () => {
		expect(getActivityMultiplier('moderately_active')).toBe(1.55);
	});

	it('very_active → 1.725', () => {
		expect(getActivityMultiplier('very_active')).toBe(1.725);
	});

	it('extra_active → 1.9', () => {
		expect(getActivityMultiplier('extra_active')).toBe(1.9);
	});
});

// ---------------------------------------------------------------------------
// calculateAllMetrics (integration of all sub-calculators)
// ---------------------------------------------------------------------------
describe('calculateAllMetrics', () => {
	it('returns correct aggregate for a standard male profile', () => {
		const result = calculateAllMetrics({
			weightKg: 70,
			heightCm: 175,
			age: 30,
			gender: 'male',
			activityLevel: 'moderately_active',
			goal: 'maintain',
		});

		expect(result.bmi).toBe(22.9);
		expect(result.bmr).toBe(1649);
		expect(result.tdee).toBe(Math.round(1649 * 1.55));
		expect(result.waterTargetMl).toBe(2100 + 350);
	});

	it('returns correct aggregate for a standard female profile', () => {
		const result = calculateAllMetrics({
			weightKg: 60,
			heightCm: 165,
			age: 25,
			gender: 'female',
			activityLevel: 'lightly_active',
			goal: 'lose',
		});

		expect(result.bmi).toBe(22.0);
		expect(result.bmr).toBe(1345);
		expect(result.tdee).toBe(Math.round(1345 * 1.375));
		expect(result.waterTargetMl).toBe(1800); // 60 × 30 = 1800, no bonus
	});

	it('all returned values are numbers', () => {
		const result = calculateAllMetrics({
			weightKg: 80,
			heightCm: 180,
			age: 35,
			gender: 'male',
			activityLevel: 'very_active',
			goal: 'gain',
		});

		expect(typeof result.bmi).toBe('number');
		expect(typeof result.bmr).toBe('number');
		expect(typeof result.tdee).toBe('number');
		expect(typeof result.waterTargetMl).toBe('number');
	});

	it('water target includes bonus for very_active', () => {
		const result = calculateAllMetrics({
			weightKg: 75,
			heightCm: 170,
			age: 28,
			gender: 'male',
			activityLevel: 'very_active',
			goal: 'maintain',
		});

		// 75 × 30 = 2250 + 500 = 2750
		expect(result.waterTargetMl).toBe(2750);
	});
});
