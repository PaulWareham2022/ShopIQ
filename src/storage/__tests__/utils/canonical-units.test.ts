/**
 * Tests for canonical unit conversion utilities
 */

import {
  getCanonicalUnit,
  getUnitDimension,
  isSupportedUnit,
  areUnitsCompatible,
  getConversionFactor,
  convertAmount,
  convertToCanonical,
  validateAndConvert,
  getSupportedUnitsForDimension,
  getSupportedDimensions,
  formatAmount,
  calculateNormalizedPrice,
  batchConvertToCanonical,
} from '../../utils/canonical-units';
import { CanonicalDimension } from '../../types';

describe('Canonical Units Utilities', () => {
  describe('getCanonicalUnit', () => {
    it('should return correct canonical units for each dimension', () => {
      expect(getCanonicalUnit('mass')).toBe('g');
      expect(getCanonicalUnit('volume')).toBe('ml');
      expect(getCanonicalUnit('count')).toBe('unit');
      expect(getCanonicalUnit('length')).toBe('m');
      expect(getCanonicalUnit('area')).toBe('m2');
    });

    it('should throw error for invalid dimension', () => {
      expect(() => getCanonicalUnit('invalid' as CanonicalDimension)).toThrow();
    });
  });

  describe('getUnitDimension', () => {
    it('should return correct dimensions for mass units', () => {
      expect(getUnitDimension('kg')).toBe('mass');
      expect(getUnitDimension('g')).toBe('mass');
      expect(getUnitDimension('lb')).toBe('mass');
      expect(getUnitDimension('oz')).toBe('mass');
    });

    it('should return correct dimensions for volume units', () => {
      expect(getUnitDimension('L')).toBe('volume');
      expect(getUnitDimension('ml')).toBe('volume');
      expect(getUnitDimension('gal')).toBe('volume');
      expect(getUnitDimension('cup')).toBe('volume');
    });

    it('should return correct dimensions for count units', () => {
      expect(getUnitDimension('unit')).toBe('count');
      expect(getUnitDimension('piece')).toBe('count');
      expect(getUnitDimension('dozen')).toBe('count');
      expect(getUnitDimension('tablet')).toBe('count');
    });

    it('should return correct dimensions for length units', () => {
      expect(getUnitDimension('m')).toBe('length');
      expect(getUnitDimension('cm')).toBe('length');
      expect(getUnitDimension('ft')).toBe('length');
      expect(getUnitDimension('in')).toBe('length');
    });

    it('should return correct dimensions for area units', () => {
      expect(getUnitDimension('m2')).toBe('area');
      expect(getUnitDimension('ft2')).toBe('area');
      expect(getUnitDimension('sq ft')).toBe('area');
    });

    it('should return undefined for unsupported units', () => {
      expect(getUnitDimension('invalid_unit')).toBeUndefined();
      expect(getUnitDimension('')).toBeUndefined();
    });
  });

  describe('isSupportedUnit', () => {
    it('should return true for supported units', () => {
      expect(isSupportedUnit('kg')).toBe(true);
      expect(isSupportedUnit('L')).toBe(true);
      expect(isSupportedUnit('unit')).toBe(true);
      expect(isSupportedUnit('m')).toBe(true);
      expect(isSupportedUnit('m2')).toBe(true);
    });

    it('should return false for unsupported units', () => {
      expect(isSupportedUnit('invalid_unit')).toBe(false);
      expect(isSupportedUnit('')).toBe(false);
    });
  });

  describe('areUnitsCompatible', () => {
    it('should return true for units in same dimension', () => {
      expect(areUnitsCompatible('kg', 'g')).toBe(true);
      expect(areUnitsCompatible('L', 'ml')).toBe(true);
      expect(areUnitsCompatible('unit', 'piece')).toBe(true);
      expect(areUnitsCompatible('m', 'ft')).toBe(true);
      expect(areUnitsCompatible('m2', 'ft2')).toBe(true);
    });

    it('should return false for units in different dimensions', () => {
      expect(areUnitsCompatible('kg', 'L')).toBe(false);
      expect(areUnitsCompatible('g', 'ml')).toBe(false);
      expect(areUnitsCompatible('unit', 'm')).toBe(false);
      expect(areUnitsCompatible('ft', 'm2')).toBe(false);
    });

    it('should return false for unsupported units', () => {
      expect(areUnitsCompatible('kg', 'invalid')).toBe(false);
      expect(areUnitsCompatible('invalid', 'g')).toBe(false);
    });
  });

  describe('getConversionFactor', () => {
    it('should return 1 for identical units', () => {
      expect(getConversionFactor('kg', 'kg')).toBe(1);
      expect(getConversionFactor('L', 'L')).toBe(1);
    });

    it('should return correct factors for mass conversions', () => {
      expect(getConversionFactor('kg', 'g')).toBe(1000);
      expect(getConversionFactor('g', 'kg')).toBeCloseTo(0.001);
      expect(getConversionFactor('lb', 'g')).toBeCloseTo(453.592);
    });

    it('should return correct factors for volume conversions', () => {
      expect(getConversionFactor('L', 'ml')).toBe(1000);
      expect(getConversionFactor('ml', 'L')).toBe(0.001);
      expect(getConversionFactor('cup', 'ml')).toBeCloseTo(236.588);
    });

    it('should return correct factors for count conversions', () => {
      expect(getConversionFactor('dozen', 'unit')).toBe(12);
      expect(getConversionFactor('pair', 'unit')).toBe(2);
      expect(getConversionFactor('piece', 'unit')).toBe(1);
    });

    it('should return undefined for incompatible units', () => {
      expect(getConversionFactor('kg', 'L')).toBeUndefined();
      expect(getConversionFactor('m', 'unit')).toBeUndefined();
    });

    it('should return undefined for unsupported units', () => {
      expect(getConversionFactor('invalid', 'g')).toBeUndefined();
      expect(getConversionFactor('kg', 'invalid')).toBeUndefined();
    });
  });

  describe('convertAmount', () => {
    it('should convert mass amounts correctly', () => {
      expect(convertAmount(1, 'kg', 'g')).toBe(1000);
      expect(convertAmount(500, 'g', 'kg')).toBe(0.5);
      expect(convertAmount(1, 'lb', 'g')).toBeCloseTo(453.592);
    });

    it('should convert volume amounts correctly', () => {
      expect(convertAmount(1, 'L', 'ml')).toBe(1000);
      expect(convertAmount(500, 'ml', 'L')).toBe(0.5);
      expect(convertAmount(1, 'cup', 'ml')).toBeCloseTo(236.588);
    });

    it('should convert count amounts correctly', () => {
      expect(convertAmount(2, 'dozen', 'unit')).toBe(24);
      expect(convertAmount(3, 'pair', 'unit')).toBe(6);
      expect(convertAmount(5, 'piece', 'unit')).toBe(5);
    });

    it('should return undefined for incompatible conversions', () => {
      expect(convertAmount(1, 'kg', 'L')).toBeUndefined();
      expect(convertAmount(1, 'm', 'unit')).toBeUndefined();
    });

    it('should handle zero and decimal amounts', () => {
      expect(convertAmount(0, 'kg', 'g')).toBe(0);
      expect(convertAmount(0.5, 'kg', 'g')).toBe(500);
      expect(convertAmount(1.5, 'dozen', 'unit')).toBe(18);
    });
  });

  describe('convertToCanonical', () => {
    it('should convert to canonical units correctly', () => {
      const result1 = convertToCanonical(2, 'kg', 'mass');
      expect(result1).toEqual({ amount: 2000, unit: 'g' });

      const result2 = convertToCanonical(1.5, 'L', 'volume');
      expect(result2).toEqual({ amount: 1500, unit: 'ml' });

      const result3 = convertToCanonical(2, 'dozen', 'count');
      expect(result3).toEqual({ amount: 24, unit: 'unit' });
    });

    it('should handle canonical units themselves', () => {
      const result1 = convertToCanonical(100, 'g', 'mass');
      expect(result1).toEqual({ amount: 100, unit: 'g' });

      const result2 = convertToCanonical(250, 'ml', 'volume');
      expect(result2).toEqual({ amount: 250, unit: 'ml' });
    });

    it('should return undefined for dimension mismatch', () => {
      expect(convertToCanonical(1, 'kg', 'volume')).toBeUndefined();
      expect(convertToCanonical(1, 'L', 'mass')).toBeUndefined();
    });

    it('should return undefined for unsupported units', () => {
      expect(convertToCanonical(1, 'invalid', 'mass')).toBeUndefined();
    });
  });

  describe('validateAndConvert', () => {
    it('should validate and convert valid inputs', () => {
      const result1 = validateAndConvert(2, 'kg', 'mass');
      expect(result1.isValid).toBe(true);
      expect(result1.canonicalAmount).toBe(2000);
      expect(result1.canonicalUnit).toBe('g');
      expect(result1.errorMessage).toBeUndefined();

      const result2 = validateAndConvert(1.5, 'L', 'volume');
      expect(result2.isValid).toBe(true);
      expect(result2.canonicalAmount).toBe(1500);
      expect(result2.canonicalUnit).toBe('ml');
    });

    it('should reject negative amounts', () => {
      const result = validateAndConvert(-1, 'kg', 'mass');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('positive finite number');
    });

    it('should reject non-finite amounts', () => {
      const result1 = validateAndConvert(Infinity, 'kg', 'mass');
      expect(result1.isValid).toBe(false);
      expect(result1.errorMessage).toContain('positive finite number');

      const result2 = validateAndConvert(NaN, 'kg', 'mass');
      expect(result2.isValid).toBe(false);
      expect(result2.errorMessage).toContain('positive finite number');
    });

    it('should reject unsupported units', () => {
      const result = validateAndConvert(1, 'invalid_unit', 'mass');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Unsupported unit');
    });

    it('should reject dimension mismatches', () => {
      const result = validateAndConvert(1, 'kg', 'volume');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('does not match expected dimension');
    });
  });

  describe('getSupportedUnitsForDimension', () => {
    it('should return mass units', () => {
      const massUnits = getSupportedUnitsForDimension('mass');
      expect(massUnits).toContain('g');
      expect(massUnits).toContain('kg');
      expect(massUnits).toContain('lb');
      expect(massUnits).toContain('oz');
      expect(massUnits.length).toBeGreaterThan(5);
    });

    it('should return volume units', () => {
      const volumeUnits = getSupportedUnitsForDimension('volume');
      expect(volumeUnits).toContain('ml');
      expect(volumeUnits).toContain('L');
      expect(volumeUnits).toContain('gal');
      expect(volumeUnits).toContain('cup');
      expect(volumeUnits.length).toBeGreaterThan(10);
    });

    it('should return sorted arrays', () => {
      const units = getSupportedUnitsForDimension('mass');
      const sorted = [...units].sort();
      expect(units).toEqual(sorted);
    });
  });

  describe('getSupportedDimensions', () => {
    it('should return all five dimensions', () => {
      const dimensions = getSupportedDimensions();
      expect(dimensions).toContain('mass');
      expect(dimensions).toContain('volume');
      expect(dimensions).toContain('count');
      expect(dimensions).toContain('length');
      expect(dimensions).toContain('area');
      expect(dimensions.length).toBe(5);
    });
  });

  describe('formatAmount', () => {
    it('should format amounts with default decimals', () => {
      expect(formatAmount(123.456, 'kg')).toBe('123.46 kg');
      expect(formatAmount(1.5, 'L')).toBe('1.50 L');
    });

    it('should format amounts with custom decimals', () => {
      expect(formatAmount(123.456, 'kg', 0)).toBe('123 kg');
      expect(formatAmount(123.456, 'kg', 3)).toBe('123.456 kg');
    });

    it('should handle edge cases', () => {
      expect(formatAmount(0, 'unit')).toBe('0.00 unit');
      expect(formatAmount(1000000, 'g', 1)).toBe('1000000.0 g');
    });
  });

  describe('calculateNormalizedPrice', () => {
    it('should calculate normalized price correctly', () => {
      // $10 for 2kg = $5/kg = $0.005/g
      const result1 = calculateNormalizedPrice(10, 2, 'kg', 'mass');
      expect(result1).toBeCloseTo(0.005, 6);

      // $5 for 1L = $5/L = $0.005/ml
      const result2 = calculateNormalizedPrice(5, 1, 'L', 'volume');
      expect(result2).toBeCloseTo(0.005, 6);

      // $12 for 1 dozen = $12/12 units = $1/unit
      const result3 = calculateNormalizedPrice(12, 1, 'dozen', 'count');
      expect(result3).toBe(1);
    });

    it('should handle edge cases', () => {
      // Zero price
      const result1 = calculateNormalizedPrice(0, 1, 'kg', 'mass');
      expect(result1).toBe(0);

      // Very small amounts: $1 for 0.001 kg (1g) = $1/1g = $1 per gram
      const result2 = calculateNormalizedPrice(1, 0.001, 'kg', 'mass');
      expect(result2).toBe(1);
    });

    it('should return undefined for invalid inputs', () => {
      expect(calculateNormalizedPrice(10, 1, 'invalid', 'mass')).toBeUndefined();
      expect(calculateNormalizedPrice(10, 1, 'kg', 'volume')).toBeUndefined();
      expect(calculateNormalizedPrice(10, -1, 'kg', 'mass')).toBeUndefined();
    });
  });

  describe('batchConvertToCanonical', () => {
    it('should convert multiple valid conversions', () => {
      const conversions = [
        { amount: 2, unit: 'kg', dimension: 'mass' as CanonicalDimension, id: 'item1' },
        { amount: 1.5, unit: 'L', dimension: 'volume' as CanonicalDimension, id: 'item2' },
        { amount: 2, unit: 'dozen', dimension: 'count' as CanonicalDimension, id: 'item3' },
      ];

      const results = batchConvertToCanonical(conversions);

      expect(results).toHaveLength(3);
      
      expect(results[0].id).toBe('item1');
      expect(results[0].success).toBe(true);
      expect(results[0].canonicalAmount).toBe(2000);
      expect(results[0].canonicalUnit).toBe('g');

      expect(results[1].id).toBe('item2');
      expect(results[1].success).toBe(true);
      expect(results[1].canonicalAmount).toBe(1500);
      expect(results[1].canonicalUnit).toBe('ml');

      expect(results[2].id).toBe('item3');
      expect(results[2].success).toBe(true);
      expect(results[2].canonicalAmount).toBe(24);
      expect(results[2].canonicalUnit).toBe('unit');
    });

    it('should handle mixed valid and invalid conversions', () => {
      const conversions = [
        { amount: 1, unit: 'kg', dimension: 'mass' as CanonicalDimension, id: 'valid' },
        { amount: -1, unit: 'L', dimension: 'volume' as CanonicalDimension, id: 'negative' },
        { amount: 1, unit: 'invalid', dimension: 'mass' as CanonicalDimension, id: 'unsupported' },
        { amount: 1, unit: 'kg', dimension: 'volume' as CanonicalDimension, id: 'mismatch' },
      ];

      const results = batchConvertToCanonical(conversions);

      expect(results).toHaveLength(4);
      
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(false);
      expect(results[3].success).toBe(false);
    });

    it('should handle empty array', () => {
      const results = batchConvertToCanonical([]);
      expect(results).toEqual([]);
    });

    it('should preserve order', () => {
      const conversions = [
        { amount: 1, unit: 'kg', dimension: 'mass' as CanonicalDimension, id: 'first' },
        { amount: 2, unit: 'L', dimension: 'volume' as CanonicalDimension, id: 'second' },
        { amount: 3, unit: 'unit', dimension: 'count' as CanonicalDimension, id: 'third' },
      ];

      const results = batchConvertToCanonical(conversions);
      expect(results[0].id).toBe('first');
      expect(results[1].id).toBe('second');
      expect(results[2].id).toBe('third');
    });
  });
});
