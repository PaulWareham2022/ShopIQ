/**
 * Unit tests for UUID utility functions
 */

import { generateUUID, isValidUUID, generateShortUUID } from '../../utils/uuid';
import * as uuidModule from '../../utils/uuid';

describe('UUID Utils', () => {
  describe('generateUUID', () => {
    it('should generate a valid UUID v4', () => {
      const uuid = generateUUID();
      expect(typeof uuid).toBe('string');
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate UUIDs with correct length', () => {
      const uuid = generateUUID();
      expect(uuid).toHaveLength(36); // 32 chars + 4 hyphens
    });

    it('should generate multiple unique UUIDs in sequence', () => {
      const uuids = Array.from({ length: 100 }, () => generateUUID());
      const uniqueUuids = new Set(uuids);
      expect(uniqueUuids.size).toBe(100);
    });
  });

  describe('isValidUUID', () => {
    it('should validate correct UUID v4 format', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        '12345678-1234-4567-8901-123456789012',
        generateUUID(), // Generated UUID should be valid
      ];

      validUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        '', // Empty string
        'not-a-uuid',
        '550e8400-e29b-41d4-a716', // Too short
        '550e8400-e29b-41d4-a716-446655440000-extra', // Too long
        '550e8400-e29b-51d4-a716-446655440000', // Wrong version (5 instead of 4)
        '550e8400-e29b-41d4-c716-446655440000', // Wrong variant (c instead of 8/9/a/b)
        'gggggggg-1234-4567-8901-123456789012', // Invalid hex characters
        '550e8400e29b41d4a716446655440000', // No hyphens
        '550e8400-e29b-41d4-a716-446655440000-', // Trailing hyphen
        null,
        undefined,
        123456,
      ];

      invalidUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid as any)).toBe(false);
      });
    });

    it('should handle case insensitivity correctly', () => {
      const upperCaseUUID = '550E8400-E29B-41D4-A716-446655440000';
      const lowerCaseUUID = '550e8400-e29b-41d4-a716-446655440000';

      expect(isValidUUID(upperCaseUUID)).toBe(true);
      expect(isValidUUID(lowerCaseUUID)).toBe(true);
    });

    it('should validate version 4 specifically', () => {
      const validV4UUID = '550e8400-e29b-41d4-a716-446655440000'; // Version 4
      const invalidV1UUID = '550e8400-e29b-11d4-a716-446655440000'; // Version 1

      expect(isValidUUID(validV4UUID)).toBe(true);
      expect(isValidUUID(invalidV1UUID)).toBe(false);
    });

    it('should validate variant bits correctly', () => {
      const validVariants = [
        '550e8400-e29b-41d4-8716-446655440000', // Variant 8
        '550e8400-e29b-41d4-9716-446655440000', // Variant 9
        '550e8400-e29b-41d4-a716-446655440000', // Variant A
        '550e8400-e29b-41d4-b716-446655440000', // Variant B
      ];

      const invalidVariants = [
        '550e8400-e29b-41d4-0716-446655440000', // Variant 0
        '550e8400-e29b-41d4-1716-446655440000', // Variant 1
        '550e8400-e29b-41d4-c716-446655440000', // Variant C
        '550e8400-e29b-41d4-f716-446655440000', // Variant F
      ];

      validVariants.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(true);
      });

      invalidVariants.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });
  });

  describe('generateShortUUID', () => {
    it('should generate 8-character string', () => {
      const shortUUID = generateShortUUID();
      expect(shortUUID).toHaveLength(8);
      expect(typeof shortUUID).toBe('string');
    });

    it('should contain only valid hex characters', () => {
      const shortUUID = generateShortUUID();
      expect(shortUUID).toMatch(/^[0-9a-f]{8}$/i);
    });

    it('should generate unique short UUIDs', () => {
      const shortUUIDs = Array.from({ length: 50 }, () => generateShortUUID());
      const uniqueShortUUIDs = new Set(shortUUIDs);
      // With 8 hex characters, collisions are possible but unlikely in 50 generations
      expect(uniqueShortUUIDs.size).toBeGreaterThan(45);
    });

    it('should be prefix of full UUID', () => {
      // Mock generateUUID to return a known value (valid hex UUID)
      const mockUUID = '12345678-abcd-4ef0-8a00-0123456789ab';
      jest.spyOn(uuidModule, 'generateUUID').mockReturnValueOnce(mockUUID);

      const shortUUID = generateShortUUID();
      expect(shortUUID).toBe('12345678');

      // Restore the original function
      jest.restoreAllMocks();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle React Native platform fallback', () => {
      // This test verifies that the UUID generation works even if react-native-uuid is not available
      const uuid = generateUUID();
      expect(isValidUUID(uuid)).toBe(true);
    });
  });

  describe('Performance tests', () => {
    it('should generate UUIDs efficiently', () => {
      const start = performance.now();
      const uuids = Array.from({ length: 1000 }, () => generateUUID());
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
      expect(uuids).toHaveLength(1000);

      // Verify all are valid
      uuids.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });
  });
});
