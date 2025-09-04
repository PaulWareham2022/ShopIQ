/**
 * UUID v4 generation utility
 * Uses react-native-uuid as primary method with secure fallbacks
 */

// Platform detection without importing react-native (for future use)
// const isReactNative = (): boolean => {
//   try {
//     return (
//       typeof global !== 'undefined' &&
//       typeof global.navigator !== 'undefined' &&
//       global.navigator.product === 'ReactNative'
//     );
//   } catch {
//     return false;
//   }
// };

let uuidv4: () => string;

const hasCrypto = typeof globalThis.crypto !== 'undefined';
const canRandomUUID =
  hasCrypto && typeof globalThis.crypto.randomUUID === 'function';
const canGRV =
  hasCrypto && typeof globalThis.crypto.getRandomValues === 'function';

const insecureFallback = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const secureV4 = (): string => {
  if (canRandomUUID) return globalThis.crypto.randomUUID();
  if (canGRV) {
    const b = new Uint8Array(16);
    globalThis.crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant 10
    const hex = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return insecureFallback();
};

// Initialize UUID generation function
// Priority: react-native-uuid > crypto API > insecure fallback
try {
  const rn = require('react-native-uuid');
  // Handle both CJS and ESM module shapes
  const factory = rn.default ?? rn;
  uuidv4 = () => factory.v4();
  console.log('Using react-native-uuid for UUID generation');
} catch {
  console.warn('react-native-uuid not available; falling back to crypto API');
  // Choose fallback based solely on crypto capability, not platform
  if (canRandomUUID || canGRV) {
    uuidv4 = secureV4;
    console.log('Using crypto API for UUID generation');
  } else {
    console.warn('Crypto API not available; using insecure UUID fallback');
    uuidv4 = insecureFallback;
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
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
