/**
 * Unit tests for SupplierRepository
 */

import { SupplierRepository, Supplier } from '../../repositories/SupplierRepository';
import { DatabaseError } from '../../types';
import { mockSQLiteResponse, resetAllMocks } from '../setup';

// Mock the database module
const mockExecuteSql = jest.fn();
jest.mock('../../sqlite/database', () => ({
  executeSql: mockExecuteSql,
}));

describe('SupplierRepository', () => {
  let repository: SupplierRepository;
  const mockTimestamp = '2024-01-01T00:00:00.000Z';

  const sampleSupplier: Supplier = {
    id: 'supplier-1',
    name: 'Acme Corp',
    website: 'https://acme.com',
    notes: 'Reliable supplier',
    shipping_policy: 'Free shipping over $100',
    quality_rating: 4,
    created_at: mockTimestamp,
    updated_at: mockTimestamp,
    deleted_at: undefined,
  };

  const sampleSupplierRow = {
    id: 'supplier-1',
    name: 'Acme Corp',
    website: 'https://acme.com',
    notes: 'Reliable supplier',
    shipping_policy: 'Free shipping over $100',
    quality_rating: 4,
    created_at: mockTimestamp,
    updated_at: mockTimestamp,
    deleted_at: null,
  };

  beforeEach(() => {
    resetAllMocks();
    repository = new SupplierRepository();
  });

  describe('mapRowToEntity', () => {
    it('should map database row to Supplier entity correctly', () => {
      const result = (repository as any).mapRowToEntity(sampleSupplierRow);
      
      expect(result).toEqual(sampleSupplier);
    });

    it('should handle null/undefined optional fields', () => {
      const rowWithNulls = {
        ...sampleSupplierRow,
        website: null,
        notes: null,
        shipping_policy: null,
        quality_rating: null,
        deleted_at: null,
      };

      const result = (repository as any).mapRowToEntity(rowWithNulls);
      
      expect(result).toEqual({
        id: 'supplier-1',
        name: 'Acme Corp',
        website: undefined,
        notes: undefined,
        shipping_policy: undefined,
        quality_rating: undefined,
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
        deleted_at: undefined,
      });
    });

    it('should handle deleted entities', () => {
      const deletedRow = {
        ...sampleSupplierRow,
        deleted_at: mockTimestamp,
      };

      const result = (repository as any).mapRowToEntity(deletedRow);
      
      expect(result.deleted_at).toBe(mockTimestamp);
    });
  });

  describe('mapEntityToRow', () => {
    it('should map Supplier entity to database row correctly', () => {
      const result = (repository as any).mapEntityToRow(sampleSupplier);
      
      expect(result).toEqual(sampleSupplierRow);
    });

    it('should handle undefined optional fields by converting to null', () => {
      const entityWithUndefined = {
        ...sampleSupplier,
        website: undefined,
        notes: undefined,
        shipping_policy: undefined,
        quality_rating: undefined,
        deleted_at: undefined,
      };

      const result = (repository as any).mapEntityToRow(entityWithUndefined);
      
      expect(result).toEqual({
        id: 'supplier-1',
        name: 'Acme Corp',
        website: null,
        notes: null,
        shipping_policy: null,
        quality_rating: null,
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
        deleted_at: null,
      });
    });

    it('should handle partial entities for updates', () => {
      const partialEntity = {
        id: 'supplier-1',
        name: 'Updated Name',
        website: 'https://updated.com',
      };

      const result = (repository as any).mapEntityToRow(partialEntity);
      
      expect(result).toEqual({
        id: 'supplier-1',
        name: 'Updated Name',
        website: 'https://updated.com',
        notes: null,
        shipping_policy: null,
        quality_rating: null,
        created_at: undefined,
        updated_at: undefined,
        deleted_at: null,
      });
    });
  });

  describe('findByName', () => {
    it('should find suppliers by name with partial match', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([sampleSupplierRow]));

      const result = await repository.findByName('acme');

      expect(result).toEqual([sampleSupplier]);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE LOWER(name) LIKE LOWER(?)'),
        ['%acme%']
      );
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY name ASC'),
        ['%acme%']
      );
    });

    it('should return empty array when no suppliers match', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      const result = await repository.findByName('nonexistent');

      expect(result).toEqual([]);
    });

    it('should handle case insensitive search', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([sampleSupplierRow]));

      await repository.findByName('ACME');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(name) LIKE LOWER(?)'),
        ['%ACME%']
      );
    });

    it('should exclude soft-deleted suppliers', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([sampleSupplierRow]));

      await repository.findByName('acme');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('AND deleted_at IS NULL'),
        ['%acme%']
      );
    });

    it('should throw DatabaseError on SQL execution failure', async () => {
      const sqlError = new Error('SQL execution failed');
      mockExecuteSql.mockRejectedValueOnce(sqlError);

      await expect(repository.findByName('acme'))
        .rejects
        .toThrow(DatabaseError);

      await expect(repository.findByName('acme'))
        .rejects
        .toThrow('Failed to find suppliers by name');
    });

    it('should handle multiple matching suppliers', async () => {
      const secondSupplier = {
        ...sampleSupplierRow,
        id: 'supplier-2',
        name: 'Acme Industries',
      };

      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([sampleSupplierRow, secondSupplier]));

      const result = await repository.findByName('acme');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('supplier-1');
      expect(result[1].id).toBe('supplier-2');
    });
  });

  describe('findByMinQualityRating', () => {
    it('should find suppliers with quality rating above threshold', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([sampleSupplierRow]));

      const result = await repository.findByMinQualityRating(3);

      expect(result).toEqual([sampleSupplier]);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE quality_rating >= ?'),
        [3]
      );
    });

    it('should order by quality rating descending, then name ascending', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([sampleSupplierRow]));

      await repository.findByMinQualityRating(4);

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY quality_rating DESC, name ASC'),
        [4]
      );
    });

    it('should exclude soft-deleted suppliers', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([sampleSupplierRow]));

      await repository.findByMinQualityRating(3);

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('AND deleted_at IS NULL'),
        [3]
      );
    });

    it('should return empty array when no suppliers meet threshold', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      const result = await repository.findByMinQualityRating(5);

      expect(result).toEqual([]);
    });

    it('should throw DatabaseError on SQL execution failure', async () => {
      const sqlError = new Error('SQL execution failed');
      mockExecuteSql.mockRejectedValueOnce(sqlError);

      await expect(repository.findByMinQualityRating(3))
        .rejects
        .toThrow(DatabaseError);

      await expect(repository.findByMinQualityRating(3))
        .rejects
        .toThrow('Failed to find suppliers by quality rating');
    });

    it('should handle edge case ratings', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([sampleSupplierRow]));

      await repository.findByMinQualityRating(1);
      expect(mockExecuteSql).toHaveBeenCalledWith(expect.any(String), [1]);

      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));
      await repository.findByMinQualityRating(5);
      expect(mockExecuteSql).toHaveBeenCalledWith(expect.any(String), [5]);
    });
  });

  describe('getStats', () => {
    const mockStatsRow = {
      total: 10,
      with_rating: 8,
      average_rating: 3.75,
      with_website: 6,
    };

    it('should return supplier statistics', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([mockStatsRow]));

      const result = await repository.getStats();

      expect(result).toEqual({
        total: 10,
        withRating: 8,
        averageRating: 3.75,
        withWebsite: 6,
      });
    });

    it('should use correct SQL for statistics', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([mockStatsRow]));

      await repository.getStats();

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) as total')
      );
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(quality_rating) as with_rating')
      );
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('AVG(quality_rating) as average_rating')
      );
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(website) as with_website')
      );
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE deleted_at IS NULL')
      );
    });

    it('should handle null/empty statistics gracefully', async () => {
      const emptyStatsRow = {
        total: null,
        with_rating: null,
        average_rating: null,
        with_website: null,
      };
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([emptyStatsRow]));

      const result = await repository.getStats();

      expect(result).toEqual({
        total: 0,
        withRating: 0,
        averageRating: 0,
        withWebsite: 0,
      });
    });

    it('should throw DatabaseError on SQL execution failure', async () => {
      const sqlError = new Error('SQL execution failed');
      mockExecuteSql.mockRejectedValueOnce(sqlError);

      await expect(repository.getStats())
        .rejects
        .toThrow(DatabaseError);

      await expect(repository.getStats())
        .rejects
        .toThrow('Failed to get supplier statistics');
    });

    it('should exclude soft-deleted suppliers from statistics', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([mockStatsRow]));

      await repository.getStats();

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE deleted_at IS NULL')
      );
    });
  });

  describe('integration with BaseRepository', () => {
    beforeEach(() => {
      // Mock the BaseRepository dependencies
      jest.mock('../../utils', () => ({
        generateUUID: jest.fn(() => 'test-uuid'),
        getCurrentTimestamp: jest.fn(() => mockTimestamp),
        validateTimestampFields: jest.fn(() => []),
      }));
    });

    it('should inherit CRUD operations from BaseRepository', () => {
      expect(repository.create).toBeDefined();
      expect(repository.findById).toBeDefined();
      expect(repository.findAll).toBeDefined();
      expect(repository.update).toBeDefined();
      expect(repository.delete).toBeDefined();
    });

    it('should use correct table name for inherited operations', () => {
      expect((repository as any).tableName).toBe('suppliers');
    });

    it('should properly map entities in inherited operations', async () => {
      // Test that mapping works correctly in BaseRepository context
      const createData = {
        name: 'Test Supplier',
        website: 'https://test.com',
        quality_rating: 5,
      };

      // Mock successful creation
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 1));

      // This will internally use mapEntityToRow
      await expect(repository.create(createData)).resolves.toBeDefined();
    });
  });

  describe('data validation', () => {
    it('should handle valid quality ratings (1-5)', () => {
      const validRatings = [1, 2, 3, 4, 5];
      
      validRatings.forEach(rating => {
        const supplier = { ...sampleSupplier, quality_rating: rating };
        const mapped = (repository as any).mapEntityToRow(supplier);
        expect(mapped.quality_rating).toBe(rating);
      });
    });

    it('should handle edge case quality ratings', () => {
      const edgeCases = [0, 6, -1, 10];
      
      edgeCases.forEach(rating => {
        const supplier = { ...sampleSupplier, quality_rating: rating };
        const mapped = (repository as any).mapEntityToRow(supplier);
        expect(mapped.quality_rating).toBe(rating); // Repository doesn't validate, just stores
      });
    });

    it('should handle long text fields', () => {
      const longText = 'A'.repeat(1000);
      const supplier = {
        ...sampleSupplier,
        notes: longText,
        shipping_policy: longText,
      };

      const mapped = (repository as any).mapEntityToRow(supplier);
      expect(mapped.notes).toBe(longText);
      expect(mapped.shipping_policy).toBe(longText);
    });

    it('should handle special characters in fields', () => {
      const specialText = "Test with 'quotes', \"double quotes\", and émojis 🚀";
      const supplier = {
        ...sampleSupplier,
        name: specialText,
        notes: specialText,
      };

      const mapped = (repository as any).mapEntityToRow(supplier);
      expect(mapped.name).toBe(specialText);
      expect(mapped.notes).toBe(specialText);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle empty search strings', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([sampleSupplierRow]));

      const result = await repository.findByName('');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.any(String),
        ['%%'] // Empty string becomes %%
      );
      expect(result).toEqual([sampleSupplier]);
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

    it('should handle numeric quality rating edge cases', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      await repository.findByMinQualityRating(0);
      await repository.findByMinQualityRating(-1);
      await repository.findByMinQualityRating(100);

      expect(mockExecuteSql).toHaveBeenCalledTimes(3);
    });
  });
});

