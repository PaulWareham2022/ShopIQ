/**
 * Jest test setup
 * Provides global mocks and configurations for testing the storage layer
 */

// Mock React Native platform detection
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web', // Default to web for testing
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles,
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  FlatList: 'FlatList',
  TextInput: 'TextInput',
  ScrollView: 'ScrollView',
  Alert: {
    alert: jest.fn(),
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
export { mockMMKVStorage, mockSQLiteDatabase, mockSQLiteResult };

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
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Test Supplier',
  countryCode: 'CA',
  regionCode: 'CA-NS',
  storeCode: 'test-store',
  defaultCurrency: 'CAD',
  membershipRequired: false,
  membershipType: 'Basic',
  shippingPolicy: {
    freeShippingThreshold: 35.0,
    shippingBaseCost: 5.99,
    pickupAvailable: true,
  },
  urlPatterns: ['https://example.com'],
  notes: 'Test notes',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

export const createTestInventoryItem = (overrides: any = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174001',
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

// Test database setup and cleanup functions
export const setupTestDatabase = async (): Promise<void> => {
  // Mock database setup - in real tests this would initialize a test database
  // For now, we'll just ensure mocks are properly configured
  mockSQLiteDatabase.execAsync.mockResolvedValue(mockSQLiteResult);
  mockSQLiteDatabase.getAllAsync.mockResolvedValue([]);
  mockSQLiteDatabase.getFirstAsync.mockResolvedValue(null);
  mockSQLiteDatabase.runAsync.mockResolvedValue(mockSQLiteResult);
};

export const cleanupTestDatabase = async (): Promise<void> => {
  // Mock database cleanup - in real tests this would clean up test data
  // For now, we'll just reset mocks
  resetAllMocks();
};

beforeEach(() => {
  resetAllMocks();
});
