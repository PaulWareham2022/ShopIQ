/**
 * Canonical Unit Conversion Utilities
 *
 * Provides functionality to convert between units and normalize amounts
 * to canonical units as defined in the PRD requirements.
 */

import { CanonicalDimension } from '../types';
import { ALL_UNIT_CONVERSIONS } from './conversion-data';

// Create lookup maps for fast conversion factor retrieval
const conversionFactors = new Map<string, number>();
const unitDimensions = new Map<string, CanonicalDimension>();
const canonicalUnits = new Map<CanonicalDimension, string>();

// Initialize lookup maps
ALL_UNIT_CONVERSIONS.forEach(conversion => {
  const key = `${conversion.fromUnit}->${conversion.toUnit}`;
  conversionFactors.set(key, conversion.factor);
  unitDimensions.set(conversion.fromUnit, conversion.dimension);

  // Check for canonical unit conflicts
  const existingCanonical = canonicalUnits.get(conversion.dimension);
  if (existingCanonical && existingCanonical !== conversion.toUnit) {
    // Choose deterministic policy: keep lexicographically smallest unit
    const chosenUnit =
      existingCanonical < conversion.toUnit
        ? existingCanonical
        : conversion.toUnit;
    if (chosenUnit !== existingCanonical) {
      console.warn(
        `Canonical unit conflict for dimension '${conversion.dimension}': choosing '${chosenUnit}' over '${existingCanonical}' and '${conversion.toUnit}'`
      );
      canonicalUnits.set(conversion.dimension, chosenUnit);
    }
  } else {
    canonicalUnits.set(conversion.dimension, conversion.toUnit);
  }
});

/**
 * Get the canonical unit for a given dimension
 * @param dimension The canonical dimension
 * @returns The canonical unit for that dimension
 */
export const getCanonicalUnit = (dimension: CanonicalDimension): string => {
  const canonical = canonicalUnits.get(dimension);
  if (!canonical) {
    throw new Error(`No canonical unit defined for dimension: ${dimension}`);
  }
  return canonical;
};

/**
 * Get the dimension for a given unit
 * @param unit The unit to look up
 * @returns The dimension of the unit, or undefined if not found
 */
export const getUnitDimension = (
  unit: string
): CanonicalDimension | undefined => {
  return unitDimensions.get(unit);
};

/**
 * Check if a unit is supported (has conversion factors defined)
 * @param unit The unit to check
 * @returns True if the unit is supported, false otherwise
 */
export const isSupportedUnit = (unit: string): boolean => {
  return unitDimensions.has(unit);
};

/**
 * Check if two units are in the same dimension (can be converted)
 * @param fromUnit Source unit
 * @param toUnit Target unit
 * @returns True if units are in same dimension, false otherwise
 */
export const areUnitsCompatible = (
  fromUnit: string,
  toUnit: string
): boolean => {
  const fromDimension = unitDimensions.get(fromUnit);
  const toDimension = unitDimensions.get(toUnit);

  return (
    fromDimension !== undefined &&
    toDimension !== undefined &&
    fromDimension === toDimension
  );
};

/**
 * Get conversion factor between two units
 * @param fromUnit Source unit
 * @param toUnit Target unit
 * @returns Conversion factor, or undefined if conversion not possible
 */
export const getConversionFactor = (
  fromUnit: string,
  toUnit: string
): number | undefined => {
  // Check if units are the same
  if (fromUnit === toUnit) {
    return 1;
  }

  // Direct conversion lookup
  const directKey = `${fromUnit}->${toUnit}`;
  const directFactor = conversionFactors.get(directKey);
  if (directFactor !== undefined) {
    return directFactor;
  }

  // Try indirect conversion via canonical unit
  const fromDimension = unitDimensions.get(fromUnit);
  const toDimension = unitDimensions.get(toUnit);

  if (fromDimension !== toDimension || !fromDimension) {
    return undefined; // Cannot convert between different dimensions
  }

  const canonicalUnit = canonicalUnits.get(fromDimension);
  if (!canonicalUnit) {
    return undefined;
  }

  // Get factor to convert from source to canonical
  const toCanonicalKey = `${fromUnit}->${canonicalUnit}`;
  const toCanonicalFactor = conversionFactors.get(toCanonicalKey);

  // Get factor to convert from canonical to target
  const fromCanonicalKey = `${canonicalUnit}->${toUnit}`;
  let fromCanonicalFactor = conversionFactors.get(fromCanonicalKey);

  // If we don't have canonical->target, try to find target->canonical and invert
  if (fromCanonicalFactor === undefined) {
    const reverseKey = `${toUnit}->${canonicalUnit}`;
    const reverseFactor = conversionFactors.get(reverseKey);
    if (reverseFactor !== undefined && reverseFactor !== 0) {
      fromCanonicalFactor = 1 / reverseFactor;
    }
  }

  if (toCanonicalFactor !== undefined && fromCanonicalFactor !== undefined) {
    return toCanonicalFactor * fromCanonicalFactor;
  }

  return undefined;
};

/**
 * Convert an amount from one unit to another
 * @param amount The amount to convert
 * @param fromUnit Source unit
 * @param toUnit Target unit
 * @returns Converted amount, or undefined if conversion not possible
 */
export const convertAmount = (
  amount: number,
  fromUnit: string,
  toUnit: string
): number | undefined => {
  const factor = getConversionFactor(fromUnit, toUnit);
  if (factor === undefined) {
    return undefined;
  }

  return amount * factor;
};

/**
 * Convert an amount to its canonical unit
 * @param amount The amount to convert
 * @param unit The current unit of the amount
 * @param dimension The canonical dimension (must match the unit's dimension)
 * @returns Object with canonical amount and unit, or undefined if conversion failed
 */
export const convertToCanonical = (
  amount: number,
  unit: string,
  dimension: CanonicalDimension
): { amount: number; unit: string } | undefined => {
  // Validate that the unit matches the expected dimension
  const unitDimension = getUnitDimension(unit);
  if (unitDimension !== dimension) {
    return undefined;
  }

  const canonicalUnit = getCanonicalUnit(dimension);
  const canonicalAmount = convertAmount(amount, unit, canonicalUnit);

  if (canonicalAmount === undefined) {
    return undefined;
  }

  return {
    amount: canonicalAmount,
    unit: canonicalUnit,
  };
};

/**
 * Validate unit conversion data
 * @param amount The amount
 * @param unit The unit
 * @param expectedDimension The expected canonical dimension
 * @returns Validation result with error details
 */
export interface UnitValidationResult {
  isValid: boolean;
  errorMessage?: string;
  canonicalAmount?: number;
  canonicalUnit?: string;
}

export const validateAndConvert = (
  amount: number,
  unit: string,
  expectedDimension: CanonicalDimension
): UnitValidationResult => {
  // Validate amount
  if (!Number.isFinite(amount) || amount < 0) {
    return {
      isValid: false,
      errorMessage: 'Amount must be a positive finite number',
    };
  }

  // Validate unit is supported
  if (!isSupportedUnit(unit)) {
    return {
      isValid: false,
      errorMessage: `Unsupported unit: ${unit}`,
    };
  }

  // Validate unit dimension matches expected
  const unitDimension = getUnitDimension(unit);
  if (unitDimension !== expectedDimension) {
    return {
      isValid: false,
      errorMessage: `Unit ${unit} (${unitDimension}) does not match expected dimension ${expectedDimension}`,
    };
  }

  // Perform conversion
  const canonical = convertToCanonical(amount, unit, expectedDimension);
  if (!canonical) {
    return {
      isValid: false,
      errorMessage: `Failed to convert ${amount} ${unit} to canonical unit`,
    };
  }

  return {
    isValid: true,
    canonicalAmount: canonical.amount,
    canonicalUnit: canonical.unit,
  };
};

/**
 * Get all supported units for a dimension
 * @param dimension The canonical dimension
 * @returns Array of supported units for that dimension
 */
export const getSupportedUnitsForDimension = (
  dimension: CanonicalDimension
): string[] => {
  const units: string[] = [];
  unitDimensions.forEach((unitDim, unit) => {
    if (unitDim === dimension) {
      units.push(unit);
    }
  });
  return units.sort();
};

/**
 * Get all supported dimensions
 * @returns Array of all canonical dimensions
 */
export const getSupportedDimensions = (): CanonicalDimension[] => {
  return Array.from(canonicalUnits.keys());
};

/**
 * Format a unit amount for display
 * @param amount The amount
 * @param unit The unit
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted string
 */
export const formatAmount = (
  amount: number,
  unit: string,
  decimals: number = 2
): string => {
  return `${amount.toFixed(decimals)} ${unit}`;
};

/**
 * Calculate normalized price per canonical unit for offers
 * This is the core function used to compute comparable prices
 * @param totalPrice Total price of the offer
 * @param amount Amount purchased
 * @param unit Unit of the amount
 * @param dimension Expected canonical dimension
 * @returns Price per canonical unit, or undefined if conversion failed
 */
export const calculateNormalizedPrice = (
  totalPrice: number,
  amount: number,
  unit: string,
  dimension: CanonicalDimension
): number | undefined => {
  const validation = validateAndConvert(amount, unit, dimension);
  if (!validation.isValid || !validation.canonicalAmount) {
    return undefined;
  }

  return totalPrice / validation.canonicalAmount;
};

/**
 * Batch convert multiple unit conversions
 * Useful for processing multiple offers or inventory items
 * @param conversions Array of conversion requests
 * @returns Array of conversion results
 */
export interface ConversionRequest {
  amount: number;
  unit: string;
  dimension: CanonicalDimension;
  id?: string; // Optional identifier for tracking
}

export interface ConversionResult {
  id?: string;
  success: boolean;
  canonicalAmount?: number;
  canonicalUnit?: string;
  errorMessage?: string;
}

export const batchConvertToCanonical = (
  conversions: ConversionRequest[]
): ConversionResult[] => {
  return conversions.map(conversion => {
    const validation = validateAndConvert(
      conversion.amount,
      conversion.unit,
      conversion.dimension
    );

    return {
      id: conversion.id,
      success: validation.isValid,
      canonicalAmount: validation.canonicalAmount,
      canonicalUnit: validation.canonicalUnit,
      errorMessage: validation.errorMessage,
    };
  });
};
