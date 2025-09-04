/**
 * Jest test setup
 * Provides global mocks and configurations for testing the storage layer
 */

// Mock React Native platform detection
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web', // Default to web for testing
  },
}));

// Mock MMKV storage
const mockMMKVStorage = {
  set: jest.fn(),
  getString: jest.fn(),
  getNumber: jest.fn(),
  getBoolean: jest.fn(),
  delete: jest.fn(),
  clearAll: jest.fn(),
  getAllKeys: jest.fn(() => []),
};

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => mockMMKVStorage),
}));

// Mock SQLite
const mockSQLiteDatabase = {
  execAsync: jest.fn(),
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
  prepareAsync: jest.fn(),
  withTransactionAsync: jest.fn(),
  closeAsync: jest.fn(),
};

const mockSQLiteResult = {
  rows: {
    length: 0,
    item: jest.fn(),
    _array: [],
  },
  rowsAffected: 0,
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue(mockSQLiteDatabase),
}));

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock __DEV__ global
// Note: __DEV__ is already declared by React Native types

// Export mocks for use in tests
export {
  mockMMKVStorage,
  mockSQLiteDatabase,
  mockSQLiteResult,
};

// Helper to reset all mocks between tests
export const resetAllMocks = () => {
  jest.clearAllMocks();
  
  // Reset MMKV mocks
  mockMMKVStorage.set.mockReset();
  mockMMKVStorage.getString.mockReset();
  mockMMKVStorage.getNumber.mockReset();
  mockMMKVStorage.getBoolean.mockReset();
  mockMMKVStorage.delete.mockReset();
  mockMMKVStorage.clearAll.mockReset();
  mockMMKVStorage.getAllKeys.mockReturnValue([]);
  
  // Reset SQLite mocks
  mockSQLiteDatabase.execAsync.mockReset();
  mockSQLiteDatabase.getAllAsync.mockReset();
  mockSQLiteDatabase.getFirstAsync.mockReset();
  mockSQLiteDatabase.runAsync.mockReset();
  mockSQLiteDatabase.prepareAsync.mockReset();
  mockSQLiteDatabase.withTransactionAsync.mockReset();
  mockSQLiteDatabase.closeAsync.mockReset();
};

// Helper to simulate SQLite query results
export const mockSQLiteResponse = (rows: any[] = [], rowsAffected = 0) => {
  return {
    rows: {
      length: rows.length,
      item: (index: number) => rows[index],
      _array: rows,
    },
    rowsAffected,
  };
};

// Helper to create test entities
export const createTestSupplier = (overrides: any = {}) => ({
  id: 'test-supplier-id',
  name: 'Test Supplier',
  contact_name: 'John Doe',
  email: 'john@example.com',
  phone: '+1-555-123-4567',
  website: 'https://example.com',
  notes: 'Test notes',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  deleted_at: null,
  ...overrides,
});

export const createTestInventoryItem = (overrides: any = {}) => ({
  id: 'test-item-id',
  name: 'Test Item',
  sku: 'TEST-001',
  category: 'Test Category',
  unit: 'pcs',
  notes: 'Test item notes',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  deleted_at: null,
  ...overrides,
});

beforeEach(() => {
  resetAllMocks();
});
