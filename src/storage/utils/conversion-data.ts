/**
 * Static Unit Conversion Data
 *
 * This file contains only the conversion factors and is dependency-free
 * to avoid circular imports. Used by canonical-units.ts.
 */

import { CanonicalDimension } from '../types';

/**
 * Interface for unit conversion data
 */
export interface UnitConversionData {
  fromUnit: string;
  toUnit: string;
  factor: number;
  dimension: CanonicalDimension;
}

/**
 * MASS CONVERSIONS - All convert to grams (g) as canonical unit
 */
const MASS_CONVERSIONS: UnitConversionData[] = [
  // Canonical unit MUST be first to ensure proper selection
  { fromUnit: 'g', toUnit: 'g', factor: 1, dimension: 'mass' },

  // Metric mass units (including case variations)
  { fromUnit: 'kg', toUnit: 'g', factor: 1000, dimension: 'mass' },
  { fromUnit: 'Kg', toUnit: 'g', factor: 1000, dimension: 'mass' }, // Uppercase variant
  { fromUnit: 'KG', toUnit: 'g', factor: 1000, dimension: 'mass' }, // All caps variant
  { fromUnit: 'mg', toUnit: 'g', factor: 0.001, dimension: 'mass' },
  { fromUnit: 'Mg', toUnit: 'g', factor: 0.001, dimension: 'mass' }, // Uppercase variant
  { fromUnit: 'MG', toUnit: 'g', factor: 0.001, dimension: 'mass' }, // All caps variant
  { fromUnit: 'μg', toUnit: 'g', factor: 0.000001, dimension: 'mass' },
  { fromUnit: 'mcg', toUnit: 'g', factor: 0.000001, dimension: 'mass' }, // Alternative notation for μg
  { fromUnit: 'MCG', toUnit: 'g', factor: 0.000001, dimension: 'mass' }, // Uppercase variant
  { fromUnit: 't', toUnit: 'g', factor: 1000000, dimension: 'mass' }, // Metric ton
  { fromUnit: 'T', toUnit: 'g', factor: 1000000, dimension: 'mass' }, // Uppercase variant

  // Imperial mass units
  { fromUnit: 'lb', toUnit: 'g', factor: 453.592, dimension: 'mass' },
  { fromUnit: 'lbs', toUnit: 'g', factor: 453.592, dimension: 'mass' },
  { fromUnit: 'oz', toUnit: 'g', factor: 28.3495, dimension: 'mass' },
  { fromUnit: 'stone', toUnit: 'g', factor: 6350.29, dimension: 'mass' },
];

/**
 * VOLUME CONVERSIONS - All convert to milliliters (ml) as canonical unit
 */
const VOLUME_CONVERSIONS: UnitConversionData[] = [
  // Canonical unit MUST be first to ensure proper selection
  { fromUnit: 'ml', toUnit: 'ml', factor: 1, dimension: 'volume' },

  // Metric volume units (including case variations)
  { fromUnit: 'l', toUnit: 'ml', factor: 1000, dimension: 'volume' },
  { fromUnit: 'L', toUnit: 'ml', factor: 1000, dimension: 'volume' },
  { fromUnit: 'liter', toUnit: 'ml', factor: 1000, dimension: 'volume' },
  { fromUnit: 'Liter', toUnit: 'ml', factor: 1000, dimension: 'volume' },
  { fromUnit: 'litre', toUnit: 'ml', factor: 1000, dimension: 'volume' },
  { fromUnit: 'Litre', toUnit: 'ml', factor: 1000, dimension: 'volume' },
  { fromUnit: 'mL', toUnit: 'ml', factor: 1, dimension: 'volume' },
  { fromUnit: 'Ml', toUnit: 'ml', factor: 1, dimension: 'volume' }, // Auto-capitalized variant
  { fromUnit: 'ML', toUnit: 'ml', factor: 1, dimension: 'volume' },
  { fromUnit: 'cl', toUnit: 'ml', factor: 10, dimension: 'volume' },
  { fromUnit: 'cL', toUnit: 'ml', factor: 10, dimension: 'volume' },
  { fromUnit: 'Cl', toUnit: 'ml', factor: 10, dimension: 'volume' }, // Auto-capitalized variant
  { fromUnit: 'CL', toUnit: 'ml', factor: 10, dimension: 'volume' },
  { fromUnit: 'dl', toUnit: 'ml', factor: 100, dimension: 'volume' },
  { fromUnit: 'dL', toUnit: 'ml', factor: 100, dimension: 'volume' },
  { fromUnit: 'Dl', toUnit: 'ml', factor: 100, dimension: 'volume' }, // Auto-capitalized variant
  { fromUnit: 'DL', toUnit: 'ml', factor: 100, dimension: 'volume' },

  // Imperial volume units
  { fromUnit: 'gal', toUnit: 'ml', factor: 3785.41, dimension: 'volume' }, // US Gallon
  { fromUnit: 'gallon', toUnit: 'ml', factor: 3785.41, dimension: 'volume' },
  { fromUnit: 'qt', toUnit: 'ml', factor: 946.353, dimension: 'volume' }, // US Quart
  { fromUnit: 'quart', toUnit: 'ml', factor: 946.353, dimension: 'volume' },
  { fromUnit: 'pt', toUnit: 'ml', factor: 473.176, dimension: 'volume' }, // US Pint
  { fromUnit: 'pint', toUnit: 'ml', factor: 473.176, dimension: 'volume' },
  { fromUnit: 'cup', toUnit: 'ml', factor: 236.588, dimension: 'volume' }, // US Cup
  { fromUnit: 'fl oz', toUnit: 'ml', factor: 29.5735, dimension: 'volume' }, // US Fluid Ounce
  { fromUnit: 'floz', toUnit: 'ml', factor: 29.5735, dimension: 'volume' },
  { fromUnit: 'tbsp', toUnit: 'ml', factor: 14.7868, dimension: 'volume' }, // US Tablespoon
  {
    fromUnit: 'tablespoon',
    toUnit: 'ml',
    factor: 14.7868,
    dimension: 'volume',
  },
  { fromUnit: 'tsp', toUnit: 'ml', factor: 4.92892, dimension: 'volume' }, // US Teaspoon
  { fromUnit: 'teaspoon', toUnit: 'ml', factor: 4.92892, dimension: 'volume' },

  // Imperial UK units (slightly different from US)
  { fromUnit: 'uk gal', toUnit: 'ml', factor: 4546.09, dimension: 'volume' }, // Imperial Gallon
  { fromUnit: 'uk qt', toUnit: 'ml', factor: 1136.52, dimension: 'volume' }, // Imperial Quart
  { fromUnit: 'uk pt', toUnit: 'ml', factor: 568.261, dimension: 'volume' }, // Imperial Pint
  { fromUnit: 'uk fl oz', toUnit: 'ml', factor: 28.4131, dimension: 'volume' }, // Imperial Fluid Ounce
];

/**
 * COUNT CONVERSIONS - All convert to unit as canonical unit
 */
const COUNT_CONVERSIONS: UnitConversionData[] = [
  // Counting units
  { fromUnit: 'unit', toUnit: 'unit', factor: 1, dimension: 'count' },
  { fromUnit: 'units', toUnit: 'unit', factor: 1, dimension: 'count' },
  { fromUnit: 'piece', toUnit: 'unit', factor: 1, dimension: 'count' },
  { fromUnit: 'pieces', toUnit: 'unit', factor: 1, dimension: 'count' },
  { fromUnit: 'each', toUnit: 'unit', factor: 1, dimension: 'count' },
  { fromUnit: 'ea', toUnit: 'unit', factor: 1, dimension: 'count' },
  { fromUnit: 'item', toUnit: 'unit', factor: 1, dimension: 'count' },
  { fromUnit: 'items', toUnit: 'unit', factor: 1, dimension: 'count' },
  { fromUnit: 'count', toUnit: 'unit', factor: 1, dimension: 'count' },
  { fromUnit: 'ct', toUnit: 'unit', factor: 1, dimension: 'count' },

  // Package-based counting
  { fromUnit: 'dozen', toUnit: 'unit', factor: 12, dimension: 'count' },
  { fromUnit: 'dz', toUnit: 'unit', factor: 12, dimension: 'count' },
  { fromUnit: 'pair', toUnit: 'unit', factor: 2, dimension: 'count' },
  { fromUnit: 'pack', toUnit: 'unit', factor: 1, dimension: 'count' }, // 1 pack = 1 unit by default
  { fromUnit: 'box', toUnit: 'unit', factor: 1, dimension: 'count' }, // 1 box = 1 unit by default

  // Pharmaceutical/supplement specific
  { fromUnit: 'tablet', toUnit: 'unit', factor: 1, dimension: 'count' },
  { fromUnit: 'tablets', toUnit: 'unit', factor: 1, dimension: 'count' },
  { fromUnit: 'tab', toUnit: 'unit', factor: 1, dimension: 'count' },
  { fromUnit: 'tabs', toUnit: 'unit', factor: 1, dimension: 'count' },
  { fromUnit: 'capsule', toUnit: 'unit', factor: 1, dimension: 'count' },
  { fromUnit: 'capsules', toUnit: 'unit', factor: 1, dimension: 'count' },
  { fromUnit: 'cap', toUnit: 'unit', factor: 1, dimension: 'count' },
  { fromUnit: 'caps', toUnit: 'unit', factor: 1, dimension: 'count' },
  { fromUnit: 'pill', toUnit: 'unit', factor: 1, dimension: 'count' },
  { fromUnit: 'pills', toUnit: 'unit', factor: 1, dimension: 'count' },
];

/**
 * LENGTH CONVERSIONS - All convert to meters (m) as canonical unit
 */
const LENGTH_CONVERSIONS: UnitConversionData[] = [
  // Metric length units
  { fromUnit: 'm', toUnit: 'm', factor: 1, dimension: 'length' },
  { fromUnit: 'meter', toUnit: 'm', factor: 1, dimension: 'length' },
  { fromUnit: 'metres', toUnit: 'm', factor: 1, dimension: 'length' },
  { fromUnit: 'km', toUnit: 'm', factor: 1000, dimension: 'length' },
  { fromUnit: 'kilometer', toUnit: 'm', factor: 1000, dimension: 'length' },
  { fromUnit: 'cm', toUnit: 'm', factor: 0.01, dimension: 'length' },
  { fromUnit: 'centimeter', toUnit: 'm', factor: 0.01, dimension: 'length' },
  { fromUnit: 'mm', toUnit: 'm', factor: 0.001, dimension: 'length' },
  { fromUnit: 'millimeter', toUnit: 'm', factor: 0.001, dimension: 'length' },
  { fromUnit: 'μm', toUnit: 'm', factor: 0.000001, dimension: 'length' },
  {
    fromUnit: 'micrometer',
    toUnit: 'm',
    factor: 0.000001,
    dimension: 'length',
  },

  // Imperial length units
  { fromUnit: 'ft', toUnit: 'm', factor: 0.3048, dimension: 'length' },
  { fromUnit: 'foot', toUnit: 'm', factor: 0.3048, dimension: 'length' },
  { fromUnit: 'feet', toUnit: 'm', factor: 0.3048, dimension: 'length' },
  { fromUnit: 'in', toUnit: 'm', factor: 0.0254, dimension: 'length' },
  { fromUnit: 'inch', toUnit: 'm', factor: 0.0254, dimension: 'length' },
  { fromUnit: 'inches', toUnit: 'm', factor: 0.0254, dimension: 'length' },
  { fromUnit: 'yd', toUnit: 'm', factor: 0.9144, dimension: 'length' },
  { fromUnit: 'yard', toUnit: 'm', factor: 0.9144, dimension: 'length' },
  { fromUnit: 'yards', toUnit: 'm', factor: 0.9144, dimension: 'length' },
  { fromUnit: 'mi', toUnit: 'm', factor: 1609.34, dimension: 'length' },
  { fromUnit: 'mile', toUnit: 'm', factor: 1609.34, dimension: 'length' },
  { fromUnit: 'miles', toUnit: 'm', factor: 1609.34, dimension: 'length' },
  { fromUnit: 'mil', toUnit: 'm', factor: 0.0000254, dimension: 'length' }, // Thousandth of an inch
];

/**
 * AREA CONVERSIONS - All convert to square meters (m2) as canonical unit
 */
const AREA_CONVERSIONS: UnitConversionData[] = [
  // Metric area units
  { fromUnit: 'm2', toUnit: 'm2', factor: 1, dimension: 'area' },
  { fromUnit: 'm²', toUnit: 'm2', factor: 1, dimension: 'area' },
  { fromUnit: 'sq m', toUnit: 'm2', factor: 1, dimension: 'area' },
  { fromUnit: 'km2', toUnit: 'm2', factor: 1000000, dimension: 'area' },
  { fromUnit: 'km²', toUnit: 'm2', factor: 1000000, dimension: 'area' },
  { fromUnit: 'cm2', toUnit: 'm2', factor: 0.0001, dimension: 'area' },
  { fromUnit: 'cm²', toUnit: 'm2', factor: 0.0001, dimension: 'area' },
  { fromUnit: 'mm2', toUnit: 'm2', factor: 0.000001, dimension: 'area' },
  { fromUnit: 'mm²', toUnit: 'm2', factor: 0.000001, dimension: 'area' },
  { fromUnit: 'ha', toUnit: 'm2', factor: 10000, dimension: 'area' }, // Hectare

  // Imperial area units
  { fromUnit: 'sq ft', toUnit: 'm2', factor: 0.092903, dimension: 'area' },
  { fromUnit: 'ft2', toUnit: 'm2', factor: 0.092903, dimension: 'area' },
  { fromUnit: 'ft²', toUnit: 'm2', factor: 0.092903, dimension: 'area' },
  { fromUnit: 'sq in', toUnit: 'm2', factor: 0.00064516, dimension: 'area' },
  { fromUnit: 'in2', toUnit: 'm2', factor: 0.00064516, dimension: 'area' },
  { fromUnit: 'in²', toUnit: 'm2', factor: 0.00064516, dimension: 'area' },
  { fromUnit: 'sq yd', toUnit: 'm2', factor: 0.836127, dimension: 'area' },
  { fromUnit: 'yd2', toUnit: 'm2', factor: 0.836127, dimension: 'area' },
  { fromUnit: 'yd²', toUnit: 'm2', factor: 0.836127, dimension: 'area' },
  { fromUnit: 'acre', toUnit: 'm2', factor: 4046.86, dimension: 'area' },
  { fromUnit: 'sq mi', toUnit: 'm2', factor: 2589988, dimension: 'area' },
];

/**
 * All unit conversions combined - exported for use by canonical-units.ts
 */
export const ALL_UNIT_CONVERSIONS: UnitConversionData[] = [
  ...MASS_CONVERSIONS,
  ...VOLUME_CONVERSIONS,
  ...COUNT_CONVERSIONS,
  ...LENGTH_CONVERSIONS,
  ...AREA_CONVERSIONS,
];
