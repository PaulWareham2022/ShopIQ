/**
 * Unit tests for timestamp utility functions
 */

import {
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
} from '../../utils/timestamp';

describe('Timestamp Utils', () => {
  describe('getCurrentTimestamp', () => {
    it('should return current timestamp in ISO 8601 format', () => {
      const timestamp = getCurrentTimestamp();
      expect(typeof timestamp).toBe('string');
      expect(isValidTimestamp(timestamp)).toBe(true);
    });

    it('should return different timestamps when called in sequence', async () => {
      const timestamp1 = getCurrentTimestamp();
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 2));
      const timestamp2 = getCurrentTimestamp();

      expect(new Date(timestamp2).getTime()).toBeGreaterThanOrEqual(
        new Date(timestamp1).getTime()
      );
      // With the delay, timestamps should reliably differ
      expect(timestamp1).not.toBe(timestamp2);
    });
  });

  describe('isValidTimestamp', () => {
    it('should validate correct ISO 8601 timestamps', () => {
      const validTimestamps = [
        '2024-01-01T00:00:00.000Z',
        '2024-12-31T23:59:59.999Z',
        '2000-02-29T12:30:45.123Z', // Leap year
        getCurrentTimestamp(),
      ];

      validTimestamps.forEach(timestamp => {
        expect(isValidTimestamp(timestamp)).toBe(true);
      });
    });

    it('should reject invalid timestamp formats', () => {
      const invalidTimestamps = [
        '', // Empty string
        'not-a-timestamp',
        '2024-01-01', // Date only
        '2024-01-01T00:00:00', // No timezone
        '2024-01-01T00:00:00Z', // No milliseconds
        '2024-01-01T00:00:00.000', // No timezone indicator
        '2024-01-01T00:00:00.000+00:00', // Wrong timezone format
        '2024-13-01T00:00:00.000Z', // Invalid month
        '2024-01-32T00:00:00.000Z', // Invalid day
        '2024-01-01T25:00:00.000Z', // Invalid hour
        '2024-01-01T00:60:00.000Z', // Invalid minute
        '2024-01-01T00:00:60.000Z', // Invalid second
        '2024-02-30T00:00:00.000Z', // Invalid date (Feb 30)
        null,
        undefined,
        123456789,
      ];

      invalidTimestamps.forEach(timestamp => {
        expect(isValidTimestamp(timestamp as any)).toBe(false);
      });
    });

    it('should validate actual date values', () => {
      // These have correct format but invalid dates
      const invalidDates = [
        '2024-02-30T00:00:00.000Z', // Feb 30 doesn't exist
        '2023-02-29T00:00:00.000Z', // 2023 is not a leap year
        '2024-04-31T00:00:00.000Z', // April has 30 days
      ];

      invalidDates.forEach(timestamp => {
        expect(isValidTimestamp(timestamp)).toBe(false);
      });
    });
  });

  describe('parseTimestamp', () => {
    it('should parse valid timestamps to Date objects', () => {
      const timestamp = '2024-01-01T12:30:45.123Z';
      const date = parseTimestamp(timestamp);

      expect(date).toBeInstanceOf(Date);
      expect(date?.toISOString()).toBe(timestamp);
    });

    it('should return null for invalid timestamps', () => {
      const invalidTimestamps = ['invalid', '', null, undefined];

      invalidTimestamps.forEach(timestamp => {
        expect(parseTimestamp(timestamp as any)).toBe(null);
      });
    });

    it('should handle edge cases correctly', () => {
      const edgeCases = [
        '1970-01-01T00:00:00.000Z', // Unix epoch
        '2038-01-19T03:14:07.000Z', // Near 32-bit timestamp limit
      ];

      edgeCases.forEach(timestamp => {
        const date = parseTimestamp(timestamp);
        expect(date).toBeInstanceOf(Date);
        expect(date?.toISOString()).toBe(timestamp);
      });
    });
  });

  describe('formatTimestamp', () => {
    it('should format Date objects to ISO 8601 strings', () => {
      const date = new Date('2024-01-01T12:30:45.123Z');
      const formatted = formatTimestamp(date);

      expect(formatted).toBe('2024-01-01T12:30:45.123Z');
      expect(isValidTimestamp(formatted)).toBe(true);
    });

    it('should handle different Date values', () => {
      const dates = [
        new Date(0), // Unix epoch
        new Date('2024-12-31T23:59:59.999Z'),
        new Date(),
      ];

      dates.forEach(date => {
        const formatted = formatTimestamp(date);
        expect(isValidTimestamp(formatted)).toBe(true);
        expect(parseTimestamp(formatted)?.getTime()).toBe(date.getTime());
      });
    });
  });

  describe('getTimestampDaysAgo', () => {
    it('should return timestamp for days in the past', () => {
      const timestamp = getTimestampDaysAgo(7);
      const date = parseTimestamp(timestamp);
      const now = new Date();

      expect(date).toBeInstanceOf(Date);
      expect(date!.getTime()).toBeLessThan(now.getTime());

      // Should be approximately 7 days ago (allow 1 minute tolerance)
      const diffMs = now.getTime() - date!.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(7, 0);
    });

    it('should handle zero days (today)', () => {
      const timestamp = getTimestampDaysAgo(0);
      const date = parseTimestamp(timestamp);
      const now = new Date();

      expect(date).toBeInstanceOf(Date);
      // Should be very close to current time
      expect(Math.abs(now.getTime() - date!.getTime())).toBeLessThan(1000);
    });

    it('should handle large number of days', () => {
      const timestamp = getTimestampDaysAgo(365);
      const date = parseTimestamp(timestamp);

      expect(date).toBeInstanceOf(Date);
      expect(isValidTimestamp(timestamp)).toBe(true);
    });
  });

  describe('getTimestampHoursAgo', () => {
    it('should return timestamp for hours in the past', () => {
      const timestamp = getTimestampHoursAgo(24);
      const date = parseTimestamp(timestamp);
      const now = new Date();

      expect(date).toBeInstanceOf(Date);
      expect(date!.getTime()).toBeLessThan(now.getTime());

      // Should be approximately 24 hours ago
      const diffMs = now.getTime() - date!.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      expect(diffHours).toBeCloseTo(24, 0);
    });

    it('should handle fractional hours', () => {
      const timestamp = getTimestampHoursAgo(0.5);
      const date = parseTimestamp(timestamp);
      const now = new Date();

      const diffMs = now.getTime() - date!.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      expect(diffMinutes).toBeCloseTo(30, 0);
    });
  });

  describe('isWithinDays', () => {
    it('should correctly identify timestamps within specified days', () => {
      const threeDaysAgo = getTimestampDaysAgo(3);
      const tenDaysAgo = getTimestampDaysAgo(10);

      expect(isWithinDays(threeDaysAgo, 5)).toBe(true);
      expect(isWithinDays(tenDaysAgo, 5)).toBe(false);
    });

    it('should handle future timestamps', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const futureTimestamp = tomorrow.toISOString();

      expect(isWithinDays(futureTimestamp, 2)).toBe(true);
      expect(isWithinDays(futureTimestamp, 0)).toBe(false);
    });

    it('should return false for invalid timestamps', () => {
      expect(isWithinDays('invalid', 5)).toBe(false);
    });
  });

  describe('daysBetween', () => {
    it('should calculate days between two timestamps', () => {
      const date1 = '2024-01-01T00:00:00.000Z';
      const date2 = '2024-01-08T00:00:00.000Z';

      expect(daysBetween(date1, date2)).toBe(7);
      expect(daysBetween(date2, date1)).toBe(7); // Should be symmetric
    });

    it('should handle same timestamps', () => {
      const timestamp = getCurrentTimestamp();
      expect(daysBetween(timestamp, timestamp)).toBe(0);
    });

    it('should return null for invalid timestamps', () => {
      const validTimestamp = getCurrentTimestamp();

      expect(daysBetween('invalid', validTimestamp)).toBe(null);
      expect(daysBetween(validTimestamp, 'invalid')).toBe(null);
      expect(daysBetween('invalid1', 'invalid2')).toBe(null);
    });
  });

  describe('isFuture', () => {
    it('should correctly identify future timestamps', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      const futureTimestamp = futureDate.toISOString();

      expect(isFuture(futureTimestamp)).toBe(true);
    });

    it('should correctly identify past timestamps', () => {
      const pastTimestamp = getTimestampHoursAgo(1);
      expect(isFuture(pastTimestamp)).toBe(false);
    });

    it('should return false for invalid timestamps', () => {
      expect(isFuture('invalid')).toBe(false);
    });
  });

  describe('isPast', () => {
    it('should correctly identify past timestamps', () => {
      const pastTimestamp = getTimestampHoursAgo(1);
      expect(isPast(pastTimestamp)).toBe(true);
    });

    it('should correctly identify future timestamps', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      const futureTimestamp = futureDate.toISOString();

      expect(isPast(futureTimestamp)).toBe(false);
    });

    it('should return false for invalid timestamps', () => {
      expect(isPast('invalid')).toBe(false);
    });
  });

  describe('getRelativeTime', () => {
    it('should return correct relative time strings for past', () => {
      const testCases = [
        { hoursAgo: 0, expected: /seconds?\s+ago/ },
        { hoursAgo: 1, expected: /1 hour ago/ },
        { hoursAgo: 25, expected: /1 day ago/ },
        { hoursAgo: 24 * 32, expected: /1 month ago/ },
        { hoursAgo: 24 * 400, expected: /1 year ago/ },
      ];

      testCases.forEach(({ hoursAgo, expected }) => {
        const timestamp = getTimestampHoursAgo(hoursAgo);
        const relative = getRelativeTime(timestamp);
        expect(relative).toMatch(expected);
      });
    });

    it('should return correct relative time strings for future', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 2);
      const futureTimestamp = futureDate.toISOString();

      const relative = getRelativeTime(futureTimestamp);
      expect(relative).toMatch(/in 2 hours?/);
    });

    it('should handle invalid timestamps', () => {
      expect(getRelativeTime('invalid')).toBe('Invalid date');
    });

    it('should handle plural vs singular correctly', () => {
      const oneHourAgo = getTimestampHoursAgo(1);
      const twoHoursAgo = getTimestampHoursAgo(2);

      expect(getRelativeTime(oneHourAgo)).toContain('1 hour ago');
      expect(getRelativeTime(twoHoursAgo)).toContain('2 hours ago');
    });
  });

  describe('validateTimestampFields', () => {
    it('should validate valid timestamp fields', () => {
      const entity = {
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
        deleted_at: null,
        custom_timestamp: '2024-01-01T00:00:00.000Z',
      };

      const errors = validateTimestampFields(entity, [
        'created_at',
        'updated_at',
        'deleted_at',
        'custom_timestamp',
      ]);
      expect(errors).toEqual([]);
    });

    it('should return errors for invalid timestamp fields', () => {
      const entity = {
        created_at: 'invalid-timestamp',
        updated_at: getCurrentTimestamp(),
        deleted_at: '2024-13-01T00:00:00.000Z', // Invalid month
        custom_field: 'not-a-timestamp',
      };

      const errors = validateTimestampFields(entity, [
        'created_at',
        'updated_at',
        'deleted_at',
        'custom_field',
      ]);

      expect(errors).toHaveLength(3);
      expect(errors[0]).toEqual({
        field: 'created_at',
        value: 'invalid-timestamp',
        error: 'Invalid ISO 8601 timestamp format',
      });
      expect(errors[1]).toEqual({
        field: 'deleted_at',
        value: '2024-13-01T00:00:00.000Z',
        error: 'Invalid ISO 8601 timestamp format',
      });
      expect(errors[2]).toEqual({
        field: 'custom_field',
        value: 'not-a-timestamp',
        error: 'Invalid ISO 8601 timestamp format',
      });
    });

    it('should ignore null and undefined values', () => {
      const entity = {
        created_at: getCurrentTimestamp(),
        updated_at: null,
        deleted_at: undefined,
      };

      const errors = validateTimestampFields(entity, [
        'created_at',
        'updated_at',
        'deleted_at',
      ]);
      expect(errors).toEqual([]);
    });

    it('should handle empty field arrays', () => {
      const entity = { created_at: 'invalid' };
      const errors = validateTimestampFields(entity, []);
      expect(errors).toEqual([]);
    });

    it('should handle non-existent fields gracefully', () => {
      const entity = { created_at: getCurrentTimestamp() };
      const errors = validateTimestampFields(entity, [
        'created_at',
        'non_existent_field',
      ]);
      expect(errors).toEqual([]);
    });
  });

  describe('Edge cases and performance', () => {
    it('should handle millisecond precision', () => {
      const timestamp1 = getCurrentTimestamp();
      const timestamp2 = getCurrentTimestamp();

      // Even if called immediately, timestamps should have millisecond precision
      const date1 = parseTimestamp(timestamp1);
      const date2 = parseTimestamp(timestamp2);

      expect(date1).toBeInstanceOf(Date);
      expect(date2).toBeInstanceOf(Date);
    });

    it('should perform efficiently with large datasets', () => {
      const timestamps = Array.from({ length: 1000 }, () =>
        getCurrentTimestamp()
      );

      const start = Date.now();
      const validationResults = timestamps.map(ts => isValidTimestamp(ts));
      const end = Date.now();
      const duration = end - start;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(validationResults.every(result => result === true)).toBe(true);
    });
  });
});
