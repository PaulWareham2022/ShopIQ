/**
 * ISO 8601 Timestamp utility functions
 * Provides standardized timestamp handling for the storage layer
 */

/**
 * Generate current ISO 8601 timestamp
 * @returns Current timestamp in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
 */
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Validate if a string is a valid ISO 8601 timestamp
 * @param timestamp The string to validate
 * @returns True if valid ISO 8601 timestamp, false otherwise
 */
export const isValidTimestamp = (timestamp: string): boolean => {
  // ISO 8601 regex pattern for full date-time with timezone
  const iso8601Regex =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{3})?Z$/;

  if (!iso8601Regex.test(timestamp)) {
    return false;
  }

  // Validate that it's actually a valid date
  const date = new Date(timestamp);
  return !isNaN(date.getTime()) && date.toISOString() === timestamp;
};

/**
 * Parse ISO 8601 timestamp string to Date object
 * @param timestamp ISO 8601 timestamp string
 * @returns Date object or null if invalid
 */
export const parseTimestamp = (timestamp: string): Date | null => {
  if (!isValidTimestamp(timestamp)) {
    return null;
  }

  return new Date(timestamp);
};

/**
 * Format Date object to ISO 8601 timestamp string
 * @param date Date object to format
 * @returns ISO 8601 timestamp string
 */
export const formatTimestamp = (date: Date): string => {
  return date.toISOString();
};

/**
 * Get timestamp from days ago
 * @param daysAgo Number of days in the past
 * @returns ISO 8601 timestamp string
 */
export const getTimestampDaysAgo = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

/**
 * Get timestamp from hours ago
 * @param hoursAgo Number of hours in the past
 * @returns ISO 8601 timestamp string
 */
export const getTimestampHoursAgo = (hoursAgo: number): string => {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
};

/**
 * Check if timestamp is within the specified number of days
 * @param timestamp ISO 8601 timestamp string
 * @param days Number of days to check within
 * @returns True if timestamp is within the specified days, false otherwise
 */
export const isWithinDays = (timestamp: string, days: number): boolean => {
  const date = parseTimestamp(timestamp);
  if (!date) return false;

  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays <= days;
};

/**
 * Calculate days between two timestamps
 * @param timestamp1 First ISO 8601 timestamp
 * @param timestamp2 Second ISO 8601 timestamp
 * @returns Number of days between timestamps, or null if invalid timestamps
 */
export const daysBetween = (
  timestamp1: string,
  timestamp2: string
): number | null => {
  const date1 = parseTimestamp(timestamp1);
  const date2 = parseTimestamp(timestamp2);

  if (!date1 || !date2) return null;

  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Check if a timestamp is in the future
 * @param timestamp ISO 8601 timestamp string
 * @returns True if timestamp is in the future, false otherwise
 */
export const isFuture = (timestamp: string): boolean => {
  const date = parseTimestamp(timestamp);
  if (!date) return false;

  return date.getTime() > Date.now();
};

/**
 * Check if a timestamp is in the past
 * @param timestamp ISO 8601 timestamp string
 * @returns True if timestamp is in the past, false otherwise
 */
export const isPast = (timestamp: string): boolean => {
  const date = parseTimestamp(timestamp);
  if (!date) return false;

  return date.getTime() < Date.now();
};

/**
 * Get a human-readable relative time string
 * @param timestamp ISO 8601 timestamp string
 * @returns Human-readable relative time (e.g., "2 hours ago", "in 3 days")
 */
export const getRelativeTime = (timestamp: string): string => {
  const date = parseTimestamp(timestamp);
  if (!date) return 'Invalid date';

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);

  const seconds = Math.floor(absDiffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  const future = diffMs > 0;
  const prefix = future ? 'in ' : '';
  const suffix = future ? '' : ' ago';

  if (years > 0) {
    return `${prefix}${years} year${years > 1 ? 's' : ''}${suffix}`;
  } else if (months > 0) {
    return `${prefix}${months} month${months > 1 ? 's' : ''}${suffix}`;
  } else if (days > 0) {
    return `${prefix}${days} day${days > 1 ? 's' : ''}${suffix}`;
  } else if (hours > 0) {
    return `${prefix}${hours} hour${hours > 1 ? 's' : ''}${suffix}`;
  } else if (minutes > 0) {
    return `${prefix}${minutes} minute${minutes > 1 ? 's' : ''}${suffix}`;
  } else {
    return `${prefix}${seconds} second${seconds > 1 ? 's' : ''}${suffix}`;
  }
};

/**
 * Utility type for timestamp validation errors
 */
export interface TimestampValidationError {
  field: string;
  value: string;
  error: string;
}

/**
 * Validate multiple timestamp fields in an entity
 * @param entity Object containing timestamp fields
 * @param timestampFields Array of field names that should contain timestamps
 * @returns Array of validation errors (empty if all valid)
 */
export const validateTimestampFields = (
  entity: Record<string, any>,
  timestampFields: string[]
): TimestampValidationError[] => {
  const errors: TimestampValidationError[] = [];

  timestampFields.forEach(field => {
    const value = entity[field];
    if (value !== undefined && value !== null && !isValidTimestamp(value)) {
      errors.push({
        field,
        value: String(value),
        error: 'Invalid ISO 8601 timestamp format',
      });
    }
  });

  return errors;
};
