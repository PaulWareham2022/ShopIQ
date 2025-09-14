/**
 * Mock for expo-secure-store
 */

/* eslint-disable no-undef */
const mockSecureStore = {
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
};
/* eslint-enable no-undef */

module.exports = mockSecureStore;
