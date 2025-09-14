/**
 * Unit tests for AddProductVariantsTableMigration
 */

import { AddProductVariantsTableMigration, migration003 } from '../../migrations/003_add_product_variants_table';
import { MigrationContext, MigrationType } from '../../migrations/types';

describe('AddProductVariantsTableMigration', () => {
  let migration: AddProductVariantsTableMigration;
  let mockContext: MigrationContext;
  let mockTransaction: any;

  beforeEach(() => {
    migration = new AddProductVariantsTableMigration();
    
    mockTransaction = {
      executeSql: jest.fn().mockResolvedValue({}),
    };
    
    mockContext = {
      currentDatabaseVersion: 2,
      currentDataVersion: 1,
      targetDatabaseVersion: 3,
      targetDataVersion: 1,
      migrationId: migration003.id,
      timestamp: '2024-01-01T00:00:00.000Z',
      transaction: mockTransaction,
    };
  });

  describe('migration properties', () => {
    it('should have correct migration properties', () => {
      expect(migration.id).toBe('003_add_product_variants_table');
      expect(migration.version).toBe(3);
      expect(migration.type).toBe(MigrationType.DATABASE);
      expect(migration.description).toContain('product_variants table');
    });
  });

  describe('up migration', () => {
    it('should execute up migration successfully', async () => {
      const result = await migration.up(mockContext);
      
      expect(result.success).toBe(true);
      expect(result.migrationId).toBe('003_add_product_variants_table');
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.rollbackData).toBeDefined();
      expect(result.rollbackData.downSql).toBeDefined();
      expect(result.rollbackData.executedStatements).toBe(3);
    });

    it('should execute all SQL statements in correct order', async () => {
      await migration.up(mockContext);
      
      expect(mockTransaction.executeSql).toHaveBeenCalledTimes(3);
      
      // Check that CREATE TABLE is called first
      const firstCall = mockTransaction.executeSql.mock.calls[0][0];
      expect(firstCall).toContain('CREATE TABLE IF NOT EXISTS product_variants');
      
      // Check that indexes are created
      const secondCall = mockTransaction.executeSql.mock.calls[1][0];
      expect(secondCall).toContain('CREATE INDEX IF NOT EXISTS idx_product_variants_inventory_item_id');
      
      const thirdCall = mockTransaction.executeSql.mock.calls[2][0];
      expect(thirdCall).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_barcode_value');
    });

    it('should create table with correct schema', async () => {
      await migration.up(mockContext);
      
      const createTableCall = mockTransaction.executeSql.mock.calls[0][0];
      
      // Check for required columns
      expect(createTableCall).toContain('id TEXT PRIMARY KEY NOT NULL');
      expect(createTableCall).toContain('inventory_item_id TEXT NOT NULL');
      expect(createTableCall).toContain('package_size TEXT NOT NULL');
      expect(createTableCall).toContain('unit TEXT NOT NULL');
      expect(createTableCall).toContain('barcode_value TEXT');
      expect(createTableCall).toContain('metadata TEXT');
      expect(createTableCall).toContain('notes TEXT');
      expect(createTableCall).toContain('created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))');
      expect(createTableCall).toContain('updated_at TEXT NOT NULL DEFAULT (datetime(\'now\'))');
      expect(createTableCall).toContain('deleted_at TEXT');
      
      // Check for foreign key constraint
      expect(createTableCall).toContain('FOREIGN KEY (inventory_item_id) REFERENCES products (id) ON DELETE CASCADE');
      
      // Check for barcode validation
      expect(createTableCall).toContain('CHECK (barcode_value IS NULL OR (length(barcode_value) >= 8 AND length(barcode_value) <= 20))');
    });

    it('should create indexes with correct definitions', async () => {
      await migration.up(mockContext);
      
      // Check inventory item index
      const inventoryIndexCall = mockTransaction.executeSql.mock.calls[1][0];
      expect(inventoryIndexCall).toContain('CREATE INDEX IF NOT EXISTS idx_product_variants_inventory_item_id ON product_variants (inventory_item_id)');
      
      // Check barcode unique index
      const barcodeIndexCall = mockTransaction.executeSql.mock.calls[2][0];
      expect(barcodeIndexCall).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_barcode_value ON product_variants (barcode_value) WHERE barcode_value IS NOT NULL');
    });

    it('should handle transaction errors', async () => {
      const dbError = new Error('Database error');
      mockTransaction.executeSql.mockRejectedValueOnce(dbError);
      
      await expect(migration.up(mockContext)).rejects.toThrow();
    });
  });

  describe('down migration', () => {
    it('should execute down migration successfully', async () => {
      const result = await migration.down(mockContext);
      
      expect(result.success).toBe(true);
      expect(result.migrationId).toBe('003_add_product_variants_table');
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should execute rollback SQL statements in correct order', async () => {
      await migration.down(mockContext);
      
      expect(mockTransaction.executeSql).toHaveBeenCalledTimes(3);
      
      // Check that indexes are dropped first
      const firstCall = mockTransaction.executeSql.mock.calls[0][0];
      expect(firstCall).toContain('DROP INDEX IF EXISTS idx_product_variants_barcode_value');
      
      const secondCall = mockTransaction.executeSql.mock.calls[1][0];
      expect(secondCall).toContain('DROP INDEX IF EXISTS idx_product_variants_inventory_item_id');
      
      // Check that table is dropped last
      const thirdCall = mockTransaction.executeSql.mock.calls[2][0];
      expect(thirdCall).toContain('DROP TABLE IF EXISTS product_variants');
    });

    it('should handle transaction errors in down migration', async () => {
      const dbError = new Error('Database error');
      mockTransaction.executeSql.mockRejectedValueOnce(dbError);
      
      await expect(migration.down(mockContext)).rejects.toThrow();
    });
  });

  describe('canRun', () => {
    it('should return true when current version is lower than migration version', async () => {
      const result = await migration.canRun(mockContext);
      expect(result).toBe(true);
    });

    it('should return false when current version is equal to migration version', async () => {
      mockContext.currentDatabaseVersion = 3;
      const result = await migration.canRun(mockContext);
      expect(result).toBe(false);
    });

    it('should return false when current version is higher than migration version', async () => {
      mockContext.currentDatabaseVersion = 4;
      const result = await migration.canRun(mockContext);
      expect(result).toBe(false);
    });
  });

  describe('migration003 instance', () => {
    it('should be an instance of AddProductVariantsTableMigration', () => {
      expect(migration003).toBeInstanceOf(AddProductVariantsTableMigration);
    });

    it('should have correct properties', () => {
      expect(migration003.id).toBe('003_add_product_variants_table');
      expect(migration003.version).toBe(3);
      expect(migration003.type).toBe(MigrationType.DATABASE);
    });
  });
});
