/**
 * Tests for SQLite schema creation and validation
 */

import { createAllSchemas, validateSchema, getSchemaVersion, SCHEMA_VERSION } from '../schemas';
import { getBatchUnitConversionSQL } from '../seed-data';
import { db } from '../database';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    runSync: jest.fn().mockReturnValue({ changes: 1, lastInsertRowId: 1 }),
    getAllSync: jest.fn(),
  })),
}));

// Mock Platform for testing
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios', // Test with native platform
  },
}));

// Mock database
const mockDb = {
  execSync: jest.fn(),
  runSync: jest.fn().mockReturnValue({ changes: 1, lastInsertRowId: 1 }),
  getAllSync: jest.fn(),
};

// Mock the database module to return our mock
jest.mock('../database', () => ({
  db: mockDb,
  initializeDatabase: jest.fn(),
  getDatabaseVersion: jest.fn(),
  executeSql: jest.fn(),
}));

describe('SQLite Schemas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAllSchemas', () => {
    it('should execute all schema creation statements', async () => {
      await createAllSchemas();

      // Should have executed multiple SQL statements (schemas, indexes, triggers, version)
      expect(mockDb.execSync).toHaveBeenCalled();
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO database_metadata'),
        [SCHEMA_VERSION.toString()]
      );
    });

    it('should handle schema creation errors', async () => {
      mockDb.execSync.mockImplementationOnce(() => {
        throw new Error('Schema creation failed');
      });

      await expect(createAllSchemas()).rejects.toThrow('Schema creation failed');
    });
  });

  describe('validateSchema', () => {
    it('should return true when all required tables exist', async () => {
      const mockTables = [
        { name: 'suppliers' },
        { name: 'inventory_items' },
        { name: 'offers' },
        { name: 'unit_conversions' },
        { name: 'bundles' },
        { name: 'database_metadata' },
      ];

      mockDb.getAllSync.mockReturnValueOnce(mockTables);

      const result = await validateSchema();
      expect(result).toBe(true);
      expect(mockDb.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT name FROM sqlite_master')
      );
    });

    it('should return false when tables are missing', async () => {
      const mockTables = [
        { name: 'suppliers' },
        // Missing other required tables
      ];

      mockDb.getAllSync.mockReturnValueOnce(mockTables);

      const result = await validateSchema();
      expect(result).toBe(false);
    });

    it('should handle validation errors gracefully', async () => {
      mockDb.getAllSync.mockImplementationOnce(() => {
        throw new Error('Query failed');
      });

      const result = await validateSchema();
      expect(result).toBe(false);
    });
  });

  describe('getSchemaVersion', () => {
    it('should return current schema version', async () => {
      mockDb.getAllSync.mockReturnValueOnce([{ value: '1' }]);

      const version = await getSchemaVersion();
      expect(version).toBe(1);
      expect(mockDb.getAllSync).toHaveBeenCalledWith(
        'SELECT value FROM database_metadata WHERE key = ?',
        ['schema_version']
      );
    });

    it('should return 0 when no version is found', async () => {
      mockDb.getAllSync.mockReturnValueOnce([]);

      const version = await getSchemaVersion();
      expect(version).toBe(0);
    });

    it('should handle version query errors', async () => {
      mockDb.getAllSync.mockImplementationOnce(() => {
        throw new Error('Query failed');
      });

      const version = await getSchemaVersion();
      expect(version).toBe(0);
    });
  });

  describe('Schema Structure Validation', () => {
    it('should have all required fields in supplier schema', () => {
      const { SUPPLIERS_SCHEMA } = require('../schemas');
      
      // Check that the schema includes all PRD-required fields
      expect(SUPPLIERS_SCHEMA).toContain('id TEXT PRIMARY KEY');
      expect(SUPPLIERS_SCHEMA).toContain('name TEXT NOT NULL');
      expect(SUPPLIERS_SCHEMA).toContain('country_code TEXT NOT NULL');
      expect(SUPPLIERS_SCHEMA).toContain('default_currency TEXT NOT NULL');
      expect(SUPPLIERS_SCHEMA).toContain('membership_required INTEGER');
      expect(SUPPLIERS_SCHEMA).toContain('shipping_policy TEXT');
      expect(SUPPLIERS_SCHEMA).toContain('url_patterns TEXT');
      expect(SUPPLIERS_SCHEMA).toContain('created_at TEXT NOT NULL');
      expect(SUPPLIERS_SCHEMA).toContain('updated_at TEXT NOT NULL');
      expect(SUPPLIERS_SCHEMA).toContain('deleted_at TEXT');
    });

    it('should have all required fields in inventory items schema', () => {
      const { INVENTORY_ITEMS_SCHEMA } = require('../schemas');
      
      expect(INVENTORY_ITEMS_SCHEMA).toContain('id TEXT PRIMARY KEY');
      expect(INVENTORY_ITEMS_SCHEMA).toContain('name TEXT NOT NULL');
      expect(INVENTORY_ITEMS_SCHEMA).toContain('canonical_dimension TEXT NOT NULL');
      expect(INVENTORY_ITEMS_SCHEMA).toContain('canonical_unit TEXT NOT NULL');
      expect(INVENTORY_ITEMS_SCHEMA).toContain('shelf_life_sensitive INTEGER');
      expect(INVENTORY_ITEMS_SCHEMA).toContain('attributes TEXT');
      expect(INVENTORY_ITEMS_SCHEMA).toContain('equivalence_factor REAL DEFAULT 1.0');
    });

    it('should have all required fields in offers schema', () => {
      const { OFFERS_SCHEMA } = require('../schemas');
      
      expect(OFFERS_SCHEMA).toContain('id TEXT PRIMARY KEY');
      expect(OFFERS_SCHEMA).toContain('inventory_item_id TEXT NOT NULL');
      expect(OFFERS_SCHEMA).toContain('supplier_id TEXT NOT NULL');
      expect(OFFERS_SCHEMA).toContain('total_price REAL NOT NULL');
      expect(OFFERS_SCHEMA).toContain('currency TEXT NOT NULL');
      expect(OFFERS_SCHEMA).toContain('amount REAL NOT NULL');
      expect(OFFERS_SCHEMA).toContain('amount_unit TEXT NOT NULL');
      expect(OFFERS_SCHEMA).toContain('amount_canonical REAL NOT NULL');
      expect(OFFERS_SCHEMA).toContain('price_per_canonical_excl_shipping REAL');
      expect(OFFERS_SCHEMA).toContain('price_per_canonical_incl_shipping REAL');
      expect(OFFERS_SCHEMA).toContain('effective_price_per_canonical REAL');
      expect(OFFERS_SCHEMA).toContain('FOREIGN KEY (inventory_item_id)');
      expect(OFFERS_SCHEMA).toContain('FOREIGN KEY (supplier_id)');
    });

    it('should have all required fields in unit conversions schema', () => {
      const { UNIT_CONVERSIONS_SCHEMA } = require('../schemas');
      
      expect(UNIT_CONVERSIONS_SCHEMA).toContain('id TEXT PRIMARY KEY');
      expect(UNIT_CONVERSIONS_SCHEMA).toContain('from_unit TEXT NOT NULL');
      expect(UNIT_CONVERSIONS_SCHEMA).toContain('to_unit TEXT NOT NULL');
      expect(UNIT_CONVERSIONS_SCHEMA).toContain('factor REAL NOT NULL');
      expect(UNIT_CONVERSIONS_SCHEMA).toContain('dimension TEXT NOT NULL');
      expect(UNIT_CONVERSIONS_SCHEMA).toContain('UNIQUE (from_unit, to_unit, dimension)');
    });

    it('should include proper constraints and checks', () => {
      const { SUPPLIERS_SCHEMA, INVENTORY_ITEMS_SCHEMA, OFFERS_SCHEMA } = require('../schemas');
      
      // Check constraints (normalize whitespace for multiline checks)
      const normalizeWhitespace = (str: string) => str.replace(/\s+/g, ' ').trim();
      
      expect(SUPPLIERS_SCHEMA).toContain('CHECK (length(country_code) = 2)');
      expect(SUPPLIERS_SCHEMA).toContain('CHECK (length(default_currency) = 3)');
      expect(SUPPLIERS_SCHEMA).toContain('CHECK (membership_required IN (0, 1))');
      
      // For multiline constraints, check that all components are present
      const normalizedInventorySchema = normalizeWhitespace(INVENTORY_ITEMS_SCHEMA);
      expect(normalizedInventorySchema).toContain("canonical_dimension IN ('mass', 'volume', 'count', 'length', 'area')");
      expect(INVENTORY_ITEMS_SCHEMA).toContain('CHECK (equivalence_factor > 0)');
      
      expect(OFFERS_SCHEMA).toContain('CHECK (total_price >= 0)');
      expect(OFFERS_SCHEMA).toContain('CHECK (amount > 0)');
      const normalizedOfferSchema = normalizeWhitespace(OFFERS_SCHEMA);
      expect(normalizedOfferSchema).toContain("source_type IN ('manual', 'url', 'ocr', 'api')");
    });
  });
});

describe('Seed Data', () => {
  describe('getUnitConversionsInsertSql', () => {
    it('should return SQL and values for unit conversions', () => {
      const { sql, params } = getBatchUnitConversionSQL();

      expect(sql).toContain('INSERT OR REPLACE INTO unit_conversions');
      expect(sql).toContain('id, from_unit, to_unit, factor, dimension, created_at, updated_at');
      expect(sql).toContain('VALUES');

      expect(params.length).toBeGreaterThan(0);
      expect(params.length % 7).toBe(0); // Should have parameters in groups of 7
    });

    it('should include essential unit conversions', () => {
      const { params } = getBatchUnitConversionSQL();
      const flatValues = params;

      // Should include common conversions
      expect(flatValues).toContain('kg'); // from_unit
      expect(flatValues).toContain('g');  // to_unit
      expect(flatValues).toContain('L');  // from_unit 
      expect(flatValues).toContain('ml'); // to_unit
      expect(flatValues).toContain('mass');   // dimension
      expect(flatValues).toContain('volume'); // dimension
    });

    it('should have valid conversion factors', () => {
      const { params } = getBatchUnitConversionSQL();

      // Since params is flattened, we need to group by 7 (the number of parameters per conversion)
      for (let i = 0; i < params.length; i += 7) {
        const conversionParams = params.slice(i, i + 7);
        const factor = conversionParams[3]; // factor is the 4th parameter (index 3)
        expect(typeof factor).toBe('number');
        expect(factor).toBeGreaterThan(0);
      }
    });
  });
});
