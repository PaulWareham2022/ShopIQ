/**
 * Unit tests for InventoryItemRepository
 */

import {
  InventoryItemRepository,
  InventoryItem,
} from '../../repositories/InventoryItemRepository';
import { DatabaseError } from '../../types';
import { mockSQLiteResponse, resetAllMocks } from '../setup';

// Mock the database module
jest.mock('../../sqlite/database');
jest.mock('../../utils');

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

describe('InventoryItemRepository', () => {
  let repository: InventoryItemRepository;
  const mockTimestamp = '2024-01-01T00:00:00.000Z';

  const sampleInventoryItem: InventoryItem = {
    id: 'item-1',
    name: 'Organic Tomatoes',
    canonical_unit: 'kg',
    shelf_life_sensitive: true,
    notes: 'Fresh organic tomatoes',
    created_at: mockTimestamp,
    updated_at: mockTimestamp,
    deleted_at: undefined,
  };

  const sampleInventoryItemRow = {
    id: 'item-1',
    name: 'Organic Tomatoes',
    canonical_unit: 'kg',
    shelf_life_sensitive: 1,
    notes: 'Fresh organic tomatoes',
    created_at: mockTimestamp,
    updated_at: mockTimestamp,
    deleted_at: null,
  };

  beforeEach(() => {
    resetAllMocks();
    repository = new InventoryItemRepository();

    // Setup default mock returns
    mockGenerateUUID.mockReturnValue('test-uuid');
    mockGetCurrentTimestamp.mockReturnValue('2024-01-01T00:00:00.000Z');
    mockValidateTimestampFields.mockReturnValue([]);
  });

  describe('mapRowToEntity', () => {
    it('should map database row to InventoryItem entity correctly', () => {
      const result = (repository as any).mapRowToEntity(sampleInventoryItemRow);

      expect(result).toEqual(sampleInventoryItem);
    });

    it('should handle null/undefined optional fields', () => {
      const rowWithNulls = {
        ...sampleInventoryItemRow,
        notes: null,
        deleted_at: null,
      };

      const result = (repository as any).mapRowToEntity(rowWithNulls);

      expect(result).toEqual({
        id: 'item-1',
        name: 'Organic Tomatoes',
        canonical_unit: 'kg',
        shelf_life_sensitive: true,
        notes: undefined,
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
        deleted_at: undefined,
      });
    });

    it('should correctly convert shelf_life_sensitive boolean', () => {
      const trueRow = { ...sampleInventoryItemRow, shelf_life_sensitive: 1 };
      const falseRow = { ...sampleInventoryItemRow, shelf_life_sensitive: 0 };
      const truthyRow = {
        ...sampleInventoryItemRow,
        shelf_life_sensitive: 'true',
      };
      const falsyRow = { ...sampleInventoryItemRow, shelf_life_sensitive: '' };

      expect(
        (repository as any).mapRowToEntity(trueRow).shelf_life_sensitive
      ).toBe(true);
      expect(
        (repository as any).mapRowToEntity(falseRow).shelf_life_sensitive
      ).toBe(false);
      expect(
        (repository as any).mapRowToEntity(truthyRow).shelf_life_sensitive
      ).toBe(true);
      expect(
        (repository as any).mapRowToEntity(falsyRow).shelf_life_sensitive
      ).toBe(false);
    });

    it('should handle deleted entities', () => {
      const deletedRow = {
        ...sampleInventoryItemRow,
        deleted_at: mockTimestamp,
      };

      const result = (repository as any).mapRowToEntity(deletedRow);

      expect(result.deleted_at).toBe(mockTimestamp);
    });
  });

  describe('mapEntityToRow', () => {
    it('should map InventoryItem entity to database row correctly', () => {
      const result = (repository as any).mapEntityToRow(sampleInventoryItem);

      expect(result).toEqual(sampleInventoryItemRow);
    });

    it('should convert shelf_life_sensitive boolean to integer', () => {
      const trueEntity = { ...sampleInventoryItem, shelf_life_sensitive: true };
      const falseEntity = {
        ...sampleInventoryItem,
        shelf_life_sensitive: false,
      };

      const trueResult = (repository as any).mapEntityToRow(trueEntity);
      const falseResult = (repository as any).mapEntityToRow(falseEntity);

      expect(trueResult.shelf_life_sensitive).toBe(1);
      expect(falseResult.shelf_life_sensitive).toBe(0);
    });

    it('should handle undefined optional fields by converting to null', () => {
      const entityWithUndefined = {
        ...sampleInventoryItem,
        notes: undefined,
        deleted_at: undefined,
      };

      const result = (repository as any).mapEntityToRow(entityWithUndefined);

      expect(result).toEqual({
        id: 'item-1',
        name: 'Organic Tomatoes',
        canonical_unit: 'kg',
        shelf_life_sensitive: 1,
        notes: null,
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
        deleted_at: null,
      });
    });

    it('should handle partial entities for updates', () => {
      const partialEntity = {
        id: 'item-1',
        name: 'Updated Tomatoes',
        canonical_unit: 'lbs',
      };

      const result = (repository as any).mapEntityToRow(partialEntity);

      expect(result).toEqual({
        id: 'item-1',
        name: 'Updated Tomatoes',
        canonical_unit: 'lbs',
        shelf_life_sensitive: 0, // undefined converts to false, then 0
        notes: null,
        created_at: undefined,
        updated_at: undefined,
        deleted_at: null,
      });
    });
  });

  describe('findByName', () => {
    it('should find inventory items by name with partial match', async () => {
      mockExecuteSql.mockResolvedValueOnce(
        mockSQLiteResponse([sampleInventoryItemRow])
      );

      const result = await repository.findByName('tomato');

      expect(result).toEqual([sampleInventoryItem]);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE LOWER(name) LIKE LOWER(?)'),
        ['%tomato%']
      );
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY name ASC'),
        ['%tomato%']
      );
    });

    it('should return empty array when no items match', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      const result = await repository.findByName('nonexistent');

      expect(result).toEqual([]);
    });

    it('should handle case insensitive search', async () => {
      mockExecuteSql.mockResolvedValueOnce(
        mockSQLiteResponse([sampleInventoryItemRow])
      );

      await repository.findByName('TOMATO');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(name) LIKE LOWER(?)'),
        ['%TOMATO%']
      );
    });

    it('should exclude soft-deleted items', async () => {
      mockExecuteSql.mockResolvedValueOnce(
        mockSQLiteResponse([sampleInventoryItemRow])
      );

      await repository.findByName('tomato');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('AND deleted_at IS NULL'),
        ['%tomato%']
      );
    });

    it('should throw DatabaseError on SQL execution failure', async () => {
      const sqlError = new Error('SQL execution failed');
      mockExecuteSql.mockRejectedValueOnce(sqlError);

      await expect(repository.findByName('tomato')).rejects.toThrow(
        DatabaseError
      );

      await expect(repository.findByName('tomato')).rejects.toThrow(
        'Failed to find inventory items by name'
      );
    });

    it('should handle multiple matching items', async () => {
      const secondItem = {
        ...sampleInventoryItemRow,
        id: 'item-2',
        name: 'Cherry Tomatoes',
      };

      mockExecuteSql.mockResolvedValueOnce(
        mockSQLiteResponse([sampleInventoryItemRow, secondItem])
      );

      const result = await repository.findByName('tomato');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('item-1');
      expect(result[1].id).toBe('item-2');
    });
  });

  describe('findByCanonicalUnit', () => {
    it('should find items by exact canonical unit match', async () => {
      mockExecuteSql.mockResolvedValueOnce(
        mockSQLiteResponse([sampleInventoryItemRow])
      );

      const result = await repository.findByCanonicalUnit('kg');

      expect(result).toEqual([sampleInventoryItem]);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE canonical_unit = ?'),
        ['kg']
      );
    });

    it('should order results by name', async () => {
      mockExecuteSql.mockResolvedValueOnce(
        mockSQLiteResponse([sampleInventoryItemRow])
      );

      await repository.findByCanonicalUnit('kg');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY name ASC'),
        ['kg']
      );
    });

    it('should exclude soft-deleted items', async () => {
      mockExecuteSql.mockResolvedValueOnce(
        mockSQLiteResponse([sampleInventoryItemRow])
      );

      await repository.findByCanonicalUnit('kg');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('AND deleted_at IS NULL'),
        ['kg']
      );
    });

    it('should return empty array when no items match unit', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      const result = await repository.findByCanonicalUnit('nonexistent');

      expect(result).toEqual([]);
    });

    it('should throw DatabaseError on SQL execution failure', async () => {
      const sqlError = new Error('SQL execution failed');
      mockExecuteSql.mockRejectedValueOnce(sqlError);

      await expect(repository.findByCanonicalUnit('kg')).rejects.toThrow(
        DatabaseError
      );

      await expect(repository.findByCanonicalUnit('kg')).rejects.toThrow(
        'Failed to find inventory items by canonical unit'
      );
    });

    it('should handle different unit types', async () => {
      const units = ['kg', 'lbs', 'pcs', 'liters', 'gallons'];

      for (const unit of units) {
        mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));
        await repository.findByCanonicalUnit(unit);
        expect(mockExecuteSql).toHaveBeenLastCalledWith(expect.any(String), [
          unit,
        ]);
      }
    });
  });

  describe('findShelfLifeSensitive', () => {
    it('should find shelf-life sensitive items', async () => {
      mockExecuteSql.mockResolvedValueOnce(
        mockSQLiteResponse([sampleInventoryItemRow])
      );

      const result = await repository.findShelfLifeSensitive();

      expect(result).toEqual([sampleInventoryItem]);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE shelf_life_sensitive = 1')
      );
    });

    it('should order results by name', async () => {
      mockExecuteSql.mockResolvedValueOnce(
        mockSQLiteResponse([sampleInventoryItemRow])
      );

      await repository.findShelfLifeSensitive();

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY name ASC')
      );
    });

    it('should exclude soft-deleted items', async () => {
      mockExecuteSql.mockResolvedValueOnce(
        mockSQLiteResponse([sampleInventoryItemRow])
      );

      await repository.findShelfLifeSensitive();

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('AND deleted_at IS NULL')
      );
    });

    it('should return empty array when no shelf-life sensitive items exist', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      const result = await repository.findShelfLifeSensitive();

      expect(result).toEqual([]);
    });

    it('should throw DatabaseError on SQL execution failure', async () => {
      const sqlError = new Error('SQL execution failed');
      mockExecuteSql.mockRejectedValueOnce(sqlError);

      await expect(repository.findShelfLifeSensitive()).rejects.toThrow(
        DatabaseError
      );

      await expect(repository.findShelfLifeSensitive()).rejects.toThrow(
        'Failed to find shelf-life sensitive items'
      );
    });

    it('should handle multiple shelf-life sensitive items', async () => {
      const shelfLifeItems = [
        sampleInventoryItemRow,
        { ...sampleInventoryItemRow, id: 'item-2', name: 'Fresh Milk' },
        { ...sampleInventoryItemRow, id: 'item-3', name: 'Yogurt' },
      ];

      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse(shelfLifeItems));

      const result = await repository.findShelfLifeSensitive();

      expect(result).toHaveLength(3);
      expect(result.every(item => item.shelf_life_sensitive)).toBe(true);
    });
  });

  describe('getStats', () => {
    const mockCountRow = {
      total: 25,
      shelf_life_sensitive_count: 8,
    };

    const mockUnitRows = [
      { canonical_unit: 'kg', count: 10 },
      { canonical_unit: 'pcs', count: 8 },
      { canonical_unit: 'liters', count: 5 },
      { canonical_unit: 'lbs', count: 2 },
    ];

    it('should return inventory statistics', async () => {
      mockExecuteSql
        .mockResolvedValueOnce(mockSQLiteResponse([mockCountRow])) // count query
        .mockResolvedValueOnce(mockSQLiteResponse(mockUnitRows)); // unit query

      const result = await repository.getStats();

      expect(result).toEqual({
        total: 25,
        shelfLifeSensitive: 8,
        unitDistribution: {
          kg: 10,
          pcs: 8,
          liters: 5,
          lbs: 2,
        },
      });
    });

    it('should execute both count and unit distribution queries', async () => {
      mockExecuteSql
        .mockResolvedValueOnce(mockSQLiteResponse([mockCountRow]))
        .mockResolvedValueOnce(mockSQLiteResponse(mockUnitRows));

      await repository.getStats();

      expect(mockExecuteSql).toHaveBeenCalledTimes(2);

      // First call should be count query
      expect(mockExecuteSql).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('COUNT(*) as total')
      );
      expect(mockExecuteSql).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining(
          'SUM(shelf_life_sensitive) as shelf_life_sensitive_count'
        )
      );

      // Second call should be unit distribution query
      expect(mockExecuteSql).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('GROUP BY canonical_unit')
      );
    });

    it('should exclude soft-deleted items from statistics', async () => {
      mockExecuteSql
        .mockResolvedValueOnce(mockSQLiteResponse([mockCountRow]))
        .mockResolvedValueOnce(mockSQLiteResponse(mockUnitRows));

      await repository.getStats();

      expect(mockExecuteSql).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('WHERE deleted_at IS NULL')
      );
      expect(mockExecuteSql).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('WHERE deleted_at IS NULL')
      );
    });

    it('should handle null/empty statistics gracefully', async () => {
      const emptyCountRow = {
        total: null,
        shelf_life_sensitive_count: null,
      };
      mockExecuteSql
        .mockResolvedValueOnce(mockSQLiteResponse([emptyCountRow]))
        .mockResolvedValueOnce(mockSQLiteResponse([]));

      const result = await repository.getStats();

      expect(result).toEqual({
        total: 0,
        shelfLifeSensitive: 0,
        unitDistribution: {},
      });
    });

    it('should order unit distribution by count descending', async () => {
      mockExecuteSql
        .mockResolvedValueOnce(mockSQLiteResponse([mockCountRow]))
        .mockResolvedValueOnce(mockSQLiteResponse(mockUnitRows));

      await repository.getStats();

      expect(mockExecuteSql).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('ORDER BY count DESC')
      );
    });

    it('should throw DatabaseError on count query failure', async () => {
      const sqlError = new Error('Count query failed');
      mockExecuteSql.mockRejectedValueOnce(sqlError);

      await expect(repository.getStats()).rejects.toThrow(DatabaseError);

      await expect(repository.getStats()).rejects.toThrow(
        'Failed to get inventory statistics'
      );
    });

    it('should throw DatabaseError on unit query failure', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([mockCountRow]));
      const sqlError = new Error('Unit query failed');
      mockExecuteSql.mockRejectedValueOnce(sqlError);

      await expect(repository.getStats()).rejects.toThrow(DatabaseError);
    });
  });

  describe('findWithOfferCounts', () => {
    const mockItemWithOffers = {
      ...sampleInventoryItemRow,
      offer_count: 3,
    };

    const mockItemWithoutOffers = {
      id: 'item-2',
      name: 'No Offers Item',
      canonical_unit: 'pcs',
      shelf_life_sensitive: 0,
      notes: null,
      created_at: mockTimestamp,
      updated_at: mockTimestamp,
      deleted_at: null,
      offer_count: 0,
    };

    it('should return items with their offer counts', async () => {
      mockExecuteSql.mockResolvedValueOnce(
        mockSQLiteResponse([mockItemWithOffers, mockItemWithoutOffers])
      );

      const result = await repository.findWithOfferCounts();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        ...sampleInventoryItem,
        offerCount: 3,
      });
      expect(result[1]).toEqual({
        id: 'item-2',
        name: 'No Offers Item',
        canonical_unit: 'pcs',
        shelf_life_sensitive: false,
        notes: undefined,
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
        deleted_at: undefined,
        offerCount: 0,
      });
    });

    it('should use LEFT JOIN to include items without offers', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      await repository.findWithOfferCounts();

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN offers o ON')
      );
    });

    it('should exclude soft-deleted items and offers', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      await repository.findWithOfferCounts();

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE i.deleted_at IS NULL')
      );
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('o.deleted_at IS NULL')
      );
    });

    it('should group by item id and order by name', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      await repository.findWithOfferCounts();

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY i.id')
      );
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY i.name ASC')
      );
    });

    it('should handle null offer counts gracefully', async () => {
      const itemWithNullCount = {
        ...sampleInventoryItemRow,
        offer_count: null,
      };
      mockExecuteSql.mockResolvedValueOnce(
        mockSQLiteResponse([itemWithNullCount])
      );

      const result = await repository.findWithOfferCounts();

      expect(result[0].offerCount).toBe(0);
    });

    it('should throw DatabaseError on SQL execution failure', async () => {
      const sqlError = new Error('SQL execution failed');
      mockExecuteSql.mockRejectedValueOnce(sqlError);

      await expect(repository.findWithOfferCounts()).rejects.toThrow(
        DatabaseError
      );

      await expect(repository.findWithOfferCounts()).rejects.toThrow(
        'Failed to find inventory items with offer counts'
      );
    });
  });

  describe('integration with BaseRepository', () => {
    it('should inherit CRUD operations from BaseRepository', () => {
      expect(repository.create).toBeDefined();
      expect(repository.findById).toBeDefined();
      expect(repository.findAll).toBeDefined();
      expect(repository.update).toBeDefined();
      expect(repository.delete).toBeDefined();
    });

    it('should use correct table name for inherited operations', () => {
      expect((repository as any).tableName).toBe('products');
    });

    it('should properly map entities in inherited operations', async () => {
      // Test that mapping works correctly in BaseRepository context
      const createData = {
        name: 'Test Item',
        canonical_unit: 'kg',
        shelf_life_sensitive: true,
        notes: 'Test notes',
      };

      // Mock successful creation
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 1));

      // This will internally use mapEntityToRow
      await expect(repository.create(createData)).resolves.toBeDefined();
    });
  });

  describe('data validation and edge cases', () => {
    it('should handle boolean shelf_life_sensitive correctly', () => {
      const testCases = [
        { input: true, expected: 1 },
        { input: false, expected: 0 },
        { input: 'true', expected: 0 }, // String 'true' is truthy but not boolean true
        { input: 'false', expected: 0 }, // String 'false' is truthy
        { input: 1, expected: 1 },
        { input: 0, expected: 0 },
        { input: null, expected: 0 },
        { input: undefined, expected: 0 },
      ];

      testCases.forEach(({ input, expected }) => {
        const item = {
          ...sampleInventoryItem,
          shelf_life_sensitive: input as boolean,
        };
        const mapped = (repository as any).mapEntityToRow(item);
        expect(mapped.shelf_life_sensitive).toBe(expected);
      });
    });

    it('should handle various canonical units', () => {
      const units = [
        'kg',
        'lbs',
        'oz',
        'g',
        'pcs',
        'each',
        'liters',
        'ml',
        'gallons',
        'cups',
      ];

      units.forEach(unit => {
        const item = { ...sampleInventoryItem, canonical_unit: unit };
        const mapped = (repository as any).mapEntityToRow(item);
        expect(mapped.canonical_unit).toBe(unit);
      });
    });

    it('should handle long text fields', () => {
      const longText = 'A'.repeat(1000);
      const item = {
        ...sampleInventoryItem,
        name: longText,
        notes: longText,
      };

      const mapped = (repository as any).mapEntityToRow(item);
      expect(mapped.name).toBe(longText);
      expect(mapped.notes).toBe(longText);
    });

    it('should handle special characters in fields', () => {
      const specialText =
        'Item with \'quotes\', "double quotes", and émojis 🍅';
      const item = {
        ...sampleInventoryItem,
        name: specialText,
        notes: specialText,
      };

      const mapped = (repository as any).mapEntityToRow(item);
      expect(mapped.name).toBe(specialText);
      expect(mapped.notes).toBe(specialText);
    });

    it('should handle empty search strings in findByName', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      const result = await repository.findByName('');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.any(String),
        ['%%'] // Empty string becomes %%
      );
      expect(result).toEqual([]);
    });

    it('should handle whitespace-only search strings', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      const result = await repository.findByName('   ');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.any(String),
        ['%   %'] // Whitespace preserved in search
      );
      expect(result).toEqual([]);
    });
  });
});
