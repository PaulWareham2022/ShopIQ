/**
 * Storage utilities index
 * Exports all utility functions for UUID and timestamp handling
 */

// UUID utilities
export {
  generateUUID,
  isValidUUID,
  generateShortUUID
} from './uuid';

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
  type TimestampValidationError
} from './timestamp';
