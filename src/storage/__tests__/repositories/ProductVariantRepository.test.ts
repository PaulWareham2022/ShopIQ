/**
 * Unit tests for ProductVariantRepository
 */

import { ProductVariantRepository } from '../../repositories/ProductVariantRepository';
import { DatabaseError } from '../../types';
import { mockSQLiteResponse, resetAllMocks } from '../setup';

// Mock the database module
jest.mock('../../sqlite/database');
jest.mock('../../utils');
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web', // Use web platform for consistent test behavior
  },
}));

// Get mocked functions
import { executeSql } from '../../sqlite/database';
import {
  generateUUID,
  getCurrentTimestamp,
  validateTimestampFields,
} from '../../utils';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;
const mockGenerateUUID = generateUUID as jest.MockedFunction<
  typeof generateUUID
>;
const mockGetCurrentTimestamp = getCurrentTimestamp as jest.MockedFunction<
  typeof getCurrentTimestamp
>;
const mockValidateTimestampFields =
  validateTimestampFields as jest.MockedFunction<
    typeof validateTimestampFields
  >;

describe('ProductVariantRepository', () => {
  let repository: ProductVariantRepository;
  const mockTimestamp = '2024-01-01T00:00:00.000Z';

  // const sampleProductVariant: ProductVariant = {
  //   id: 'variant-1',
  //   inventoryItemId: 'item-1',
  //   packageSize: '500ml bottle',
  //   unit: 'ml',
  //   barcodeValue: '1234567890123',
  //   metadata: { brand: 'Generic', flavor: 'Original' },
  //   notes: 'Standard size bottle',
  //   created_at: mockTimestamp,
  //   updated_at: mockTimestamp,
  //   deleted_at: undefined,
  // };

  beforeEach(() => {
    resetAllMocks();
    repository = new ProductVariantRepository();

    // Setup default mock implementations
    mockGenerateUUID.mockReturnValue('variant-1');
    mockGetCurrentTimestamp.mockReturnValue(mockTimestamp);
    mockValidateTimestampFields.mockReturnValue([]);
  });

  describe('create', () => {
    it('should create a new product variant successfully', async () => {
      const newVariant = {
        inventoryItemId: 'item-1',
        packageSize: '500ml bottle',
        unit: 'ml',
        barcodeValue: '1234567890123',
        metadata: { brand: 'Generic' },
        notes: 'Standard size bottle',
      };

      // Mock barcode check (not in use)
      mockExecuteSql
        .mockResolvedValueOnce(mockSQLiteResponse([{ count: 0 }]))
        // Mock insert
        .mockResolvedValueOnce(mockSQLiteResponse([]));

      const result = await repository.create(newVariant);

      expect(result).toEqual({
        ...newVariant,
        id: 'variant-1',
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
        deleted_at: undefined,
      });

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count FROM product_variants'),
        ['1234567890123']
      );
    });

    it('should throw error if barcode is already in use', async () => {
      const newVariant = {
        inventoryItemId: 'item-1',
        packageSize: '500ml bottle',
        unit: 'ml',
        barcodeValue: '1234567890123',
      };

      // Mock barcode check (already in use)
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([{ count: 1 }]));

      await expect(repository.create(newVariant)).rejects.toThrow(
        "Barcode value '1234567890123' is already in use"
      );
    });

    it('should create variant without barcode', async () => {
      const newVariant = {
        inventoryItemId: 'item-1',
        packageSize: '500ml bottle',
        unit: 'ml',
      };

      // Mock insert (no barcode check needed)
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      const result = await repository.create(newVariant);

      expect(result).toEqual({
        ...newVariant,
        id: 'variant-1',
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
        deleted_at: undefined,
      });

      // Should not check barcode availability
      expect(mockExecuteSql).toHaveBeenCalledTimes(1);
    });
  });

  describe('findByInventoryItemId', () => {
    it('should find variants by inventory item ID', async () => {
      const mockRows = [
        {
          id: 'variant-1',
          inventory_item_id: 'item-1',
          package_size: '500ml bottle',
          unit: 'ml',
          barcode_value: '1234567890123',
          metadata: '{"brand":"Generic"}',
          notes: 'Standard size bottle',
          created_at: mockTimestamp,
          updated_at: mockTimestamp,
          deleted_at: null,
        },
      ];

      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse(mockRows));

      const result = await repository.findByInventoryItemId('item-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'variant-1',
        inventoryItemId: 'item-1',
        packageSize: '500ml bottle',
        unit: 'ml',
        barcodeValue: '1234567890123',
        metadata: { brand: 'Generic' },
        notes: 'Standard size bottle',
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
        deleted_at: undefined,
      });

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE inventory_item_id = ? AND deleted_at IS NULL'),
        ['item-1']
      );
    });

    it('should return empty array when no variants found', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      const result = await repository.findByInventoryItemId('item-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('findByBarcodeValue', () => {
    it('should find variant by barcode value', async () => {
      const mockRows = [
        {
          id: 'variant-1',
          inventory_item_id: 'item-1',
          package_size: '500ml bottle',
          unit: 'ml',
          barcode_value: '1234567890123',
          metadata: null,
          notes: null,
          created_at: mockTimestamp,
          updated_at: mockTimestamp,
          deleted_at: null,
        },
      ];

      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse(mockRows));

      const result = await repository.findByBarcodeValue('1234567890123');

      expect(result).toEqual({
        id: 'variant-1',
        inventoryItemId: 'item-1',
        packageSize: '500ml bottle',
        unit: 'ml',
        barcodeValue: '1234567890123',
        metadata: undefined,
        notes: undefined,
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
        deleted_at: undefined,
      });

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE barcode_value = ? AND deleted_at IS NULL'),
        ['1234567890123']
      );
    });

    it('should return null when barcode not found', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      const result = await repository.findByBarcodeValue('9999999999999');

      expect(result).toBeNull();
    });
  });

  describe('isBarcodeInUse', () => {
    it('should return true when barcode is in use', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([{ count: 1 }]));

      const result = await repository.isBarcodeInUse('1234567890123');

      expect(result).toBe(true);
    });

    it('should return false when barcode is not in use', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([{ count: 0 }]));

      const result = await repository.isBarcodeInUse('1234567890123');

      expect(result).toBe(false);
    });

    it('should exclude specific ID when checking barcode', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([{ count: 0 }]));

      const result = await repository.isBarcodeInUse('1234567890123', 'variant-1');

      expect(result).toBe(false);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('AND id != ?'),
        ['1234567890123', 'variant-1']
      );
    });
  });

  describe('countByInventoryItemId', () => {
    it('should return count of variants for inventory item', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([{ count: 3 }]));

      const result = await repository.countByInventoryItemId('item-1');

      expect(result).toBe(3);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count FROM product_variants'),
        ['item-1']
      );
    });
  });

  describe('update', () => {
    it('should update variant and check barcode uniqueness', async () => {
      const updates = {
        packageSize: '1L bottle',
        barcodeValue: '9876543210987',
      };

      // Mock barcode check (not in use)
      mockExecuteSql
        .mockResolvedValueOnce(mockSQLiteResponse([{ count: 0 }]))
        // Mock find by ID (for update validation)
        .mockResolvedValueOnce(mockSQLiteResponse([{
          id: 'variant-1',
          inventory_item_id: 'item-1',
          package_size: '500ml bottle',
          unit: 'ml',
          barcode_value: '1234567890123',
          metadata: null,
          notes: null,
          created_at: mockTimestamp,
          updated_at: mockTimestamp,
          deleted_at: null,
        }]))
        // Mock update
        .mockResolvedValueOnce(mockSQLiteResponse([], 1))
        // Mock find by ID (after update)
        .mockResolvedValueOnce(mockSQLiteResponse([{
          id: 'variant-1',
          inventory_item_id: 'item-1',
          package_size: '1L bottle',
          unit: 'ml',
          barcode_value: '9876543210987',
          metadata: null,
          notes: null,
          created_at: mockTimestamp,
          updated_at: mockTimestamp,
          deleted_at: null,
        }]));

      const result = await repository.update('variant-1', updates);

      expect(result).toBeDefined();
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count FROM product_variants'),
        ['9876543210987', 'variant-1']
      );
    });

    it('should throw error if updated barcode is already in use', async () => {
      const updates = {
        barcodeValue: '1234567890123',
      };

      // Reset mock to ensure clean state
      mockExecuteSql.mockReset();
      
      // Mock barcode check (already in use)
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([{ count: 1 }]));

      await expect(repository.update('variant-1', updates)).rejects.toThrow(
        "Barcode value '1234567890123' is already in use"
      );
    });
  });

  describe('migration helper methods', () => {
    describe('createDefaultVariantForItem', () => {
      it('should create a default variant for an inventory item', async () => {
        // Mock check for existing variants (none found)
        mockExecuteSql
          .mockResolvedValueOnce(mockSQLiteResponse([]))
          // Mock insert
          .mockResolvedValueOnce(mockSQLiteResponse([]));

        const result = await repository.createDefaultVariantForItem('item-1', '1 bottle', 'unit');

        expect(result).toEqual({
          inventoryItemId: 'item-1',
          packageSize: '1 bottle',
          unit: 'unit',
          barcodeValue: undefined,
          metadata: { isDefault: true, migrated: true },
          notes: 'Default variant created during migration',
          id: 'variant-1',
          created_at: mockTimestamp,
          updated_at: mockTimestamp,
          deleted_at: undefined,
        });
      });

      it('should throw error if item already has variants', async () => {
        const existingVariants = [{
          id: 'variant-1',
          inventory_item_id: 'item-1',
          package_size: '500ml bottle',
          unit: 'ml',
          barcode_value: null,
          metadata: null,
          notes: null,
          created_at: mockTimestamp,
          updated_at: mockTimestamp,
          deleted_at: null,
        }];

        mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse(existingVariants));

        await expect(repository.createDefaultVariantForItem('item-1')).rejects.toThrow(
          'Inventory item item-1 already has variants'
        );
      });
    });

    describe('migrateLegacyBarcodeData', () => {
      it('should migrate legacy barcode data to product variant', async () => {
        const legacyData = {
          barcodeValue: '1234567890123',
          packageSize: '500ml bottle',
          unit: 'ml',
          metadata: { brand: 'Legacy Brand' },
          notes: 'Legacy barcode data',
        };

        // Mock barcode check (not found)
        mockExecuteSql
          .mockResolvedValueOnce(mockSQLiteResponse([]))
          // Mock insert
          .mockResolvedValueOnce(mockSQLiteResponse([]));

        const result = await repository.migrateLegacyBarcodeData('item-1', legacyData);

        expect(result).toEqual({
          inventoryItemId: 'item-1',
          packageSize: '500ml bottle',
          unit: 'ml',
          barcodeValue: '1234567890123',
          metadata: {
            brand: 'Legacy Brand',
            migrated: true,
            migrationDate: expect.any(String),
          },
          notes: 'Legacy barcode data',
          id: 'variant-1',
          created_at: mockTimestamp,
          updated_at: mockTimestamp,
          deleted_at: undefined,
        });
      });

      it('should throw error if barcode already exists', async () => {
        const legacyData = {
          barcodeValue: '1234567890123',
          packageSize: '500ml bottle',
          unit: 'ml',
        };

        const existingVariant = [{
          id: 'variant-1',
          inventory_item_id: 'item-1',
          package_size: '500ml bottle',
          unit: 'ml',
          barcode_value: '1234567890123',
          metadata: null,
          notes: null,
          created_at: mockTimestamp,
          updated_at: mockTimestamp,
          deleted_at: null,
        }];

        mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse(existingVariant));

        await expect(repository.migrateLegacyBarcodeData('item-1', legacyData)).rejects.toThrow(
          'Barcode 1234567890123 already exists in variants'
        );
      });
    });

    describe('getMigrationStats', () => {
      it('should return migration statistics', async () => {
        mockExecuteSql
          .mockResolvedValueOnce(mockSQLiteResponse([{ count: 10 }])) // total variants
          .mockResolvedValueOnce(mockSQLiteResponse([{ count: 7 }]))  // variants with barcodes
          .mockResolvedValueOnce(mockSQLiteResponse([{ count: 5 }]))  // migrated variants
          .mockResolvedValueOnce(mockSQLiteResponse([{ count: 3 }])); // default variants

        const result = await repository.getMigrationStats();

        expect(result).toEqual({
          totalVariants: 10,
          variantsWithBarcodes: 7,
          migratedVariants: 5,
          defaultVariants: 3,
        });
      });
    });

    describe('findInventoryItemsNeedingVariants', () => {
      it('should find inventory items without variants', async () => {
        const mockRows = [
          { id: 'item-1' },
          { id: 'item-2' },
          { id: 'item-3' },
        ];

        mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse(mockRows));

        const result = await repository.findInventoryItemsNeedingVariants();

        expect(result).toEqual(['item-1', 'item-2', 'item-3']);
        
        // Verify the SQL contains the expected query structure
        const sqlCall = mockExecuteSql.mock.calls[0][0];
        expect(sqlCall).toContain('SELECT DISTINCT ii.id');
        expect(sqlCall).toContain('FROM products ii');
        expect(sqlCall).toContain('LEFT JOIN product_variants pv ON ii.id = pv.inventory_item_id');
        expect(sqlCall).toContain('WHERE ii.deleted_at IS NULL AND pv.id IS NULL');
      });

      it('should return empty array when all items have variants', async () => {
        mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

        const result = await repository.findInventoryItemsNeedingVariants();

        expect(result).toEqual([]);
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors in findByInventoryItemId', async () => {
      const dbError = new Error('Database connection failed');
      mockExecuteSql.mockRejectedValueOnce(dbError);

      await expect(repository.findByInventoryItemId('item-1')).rejects.toThrow(
        DatabaseError
      );
      await expect(repository.findByInventoryItemId('item-1')).rejects.toThrow(
        'Failed to find product variants by inventory item ID'
      );
    });

    it('should handle database errors in findByBarcodeValue', async () => {
      const dbError = new Error('Database connection failed');
      mockExecuteSql.mockRejectedValueOnce(dbError);

      await expect(repository.findByBarcodeValue('1234567890123')).rejects.toThrow(
        DatabaseError
      );
      await expect(repository.findByBarcodeValue('1234567890123')).rejects.toThrow(
        'Failed to find product variant by barcode'
      );
    });

    it('should handle database errors in migration methods', async () => {
      const dbError = new Error('Database connection failed');
      mockExecuteSql.mockRejectedValueOnce(dbError);

      await expect(repository.createDefaultVariantForItem('item-1')).rejects.toThrow(
        DatabaseError
      );
      await expect(repository.createDefaultVariantForItem('item-1')).rejects.toThrow(
        'Failed to create default variant for inventory item'
      );
    });
  });
});
