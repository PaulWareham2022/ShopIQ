/**
 * UUID v4 generation utility
 * Uses react-native-uuid for UUID generation with fallback for web
 */

import { Platform } from 'react-native';

let uuidv4: () => string;

if (Platform.OS === 'web') {
  // Web fallback - simple UUID v4 implementation
  uuidv4 = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
} else {
  // Native platforms - use react-native-uuid
  try {
    const uuid = require('react-native-uuid');
    uuidv4 = () => uuid.v4();
  } catch (error) {
    // Fallback if react-native-uuid is not available
    console.warn('react-native-uuid not available, using fallback UUID generation');
    uuidv4 = (): string => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
  }
}

/**
 * Generate a UUID v4 string
 * @returns A UUID v4 string
 */
export const generateUUID = (): string => {
  return uuidv4();
};

/**
 * Validate if a string is a valid UUID v4
 * @param uuid The string to validate
 * @returns True if valid UUID v4, false otherwise
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Generate a short UUID (first 8 characters of UUID v4)
 * Useful for display purposes where full UUID is too long
 * @returns First 8 characters of a UUID v4
 */
export const generateShortUUID = (): string => {
  return generateUUID().substring(0, 8);
};
