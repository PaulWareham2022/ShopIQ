/**
 * Comparison Engine Exports
 *
 * Main entry point for the comparison engine functionality.
 * Provides a clean API for comparing inventory item offers.
 */

// Core types and interfaces
export * from './types';

// Main comparison engine
export { ComparisonEngine } from './ComparisonEngine';

// Base comparator class
export { BaseComparator } from './BaseComparator';

// Concrete comparator implementations
export {
  PricePerCanonicalComparator,
  TotalPriceComparator,
  PricePerUnitComparator,
  QualityAdjustedPriceComparator,
} from './strategies/PriceComparators';

// Factory function for creating comparison engine
export { createComparisonEngine } from './factory';

// Utility functions
export * from './utils';

// Price calculation utilities
export * from './priceCalculations';

// Query builder for SQLite operations
export * from './queryBuilder';
