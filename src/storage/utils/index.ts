/**
 * Storage utilities index
 * Exports all utility functions for UUID and timestamp handling
 */

// UUID utilities
export { generateUUID, isValidUUID, generateShortUUID } from './uuid';

// Timestamp utilities
export {
  getCurrentTimestamp,
  isValidTimestamp,
  parseTimestamp,
  formatTimestamp,
  getTimestampDaysAgo,
  getTimestampHoursAgo,
  isWithinDays,
  daysBetween,
  isFuture,
  isPast,
  getRelativeTime,
  validateTimestampFields,
  type TimestampValidationError,
} from './timestamp';

// Canonical unit conversion utilities
export {
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
  type UnitValidationResult,
  type ConversionRequest,
  type ConversionResult,
} from './canonical-units';

// Unit conversion validation schemas
export {
  validateConversionRequest,
  validateBatchConversionRequest,
  validatePriceNormalization,
  validateOfferInput,
  safeValidate,
  ConversionRequestSchema,
  BatchConversionRequestSchema,
  PriceNormalizationSchema,
  OfferInputSchema,
  type BatchConversionRequest,
  type PriceNormalization,
  type ValidatedOfferInput,
} from './validation-schemas';

// ISO code validation utilities
export {
  validateCountryCode,
  validateRegionCode,
  validateCurrencyCode,
  validateUrlPatterns,
  validateShippingPolicy,
  validateSupplierFields,
  getCountryName,
  getCurrencyName,
  ISO_COUNTRY_CODES,
  ISO_CURRENCY_CODES,
  COMMON_REGION_CODES,
  type ValidationResult,
} from './iso-validation';
