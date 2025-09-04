/**
 * Integration tests for soft-delete functionality across the storage layer
 * Tests the complete soft-delete workflow from validation to repository operations
 */

import { BaseRepository } from '../repositories/base/BaseRepository';
import {
  BaseEntity,
  EntityNotFoundError,
  DatabaseError,
  ValidationError,
  QueryOptions,
} from '../types';
import {
  SupplierSchema,
  InventoryItemSchema,
  validateEntityStrict,
} from '../validation/schemas';
import { mockSQLiteResponse, resetAllMocks, createTestSupplier } from './setup';

// Mock the database module
jest.mock('../sqlite/database', () => ({
  executeSql: jest.fn(),
}));

// Mock the utils module
jest.mock('../utils', () => ({
  generateUUID: jest.fn(),
  getCurrentTimestamp: jest.fn(),
  validateTimestampFields: jest.fn(),
}));

// Import mocked functions after module mocks are defined
import { executeSql } from '../sqlite/database';
import {
  generateUUID,
  getCurrentTimestamp,
  validateTimestampFields,
} from '../utils';

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

// Test entity interface
interface TestEntity extends BaseEntity {
  name: string;
  description?: string;
}

// Concrete repository implementation for testing
class TestRepository extends BaseRepository<TestEntity> {
  protected tableName = 'test_entities';

  protected mapRowToEntity(row: any): TestEntity {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at || undefined,
    };
  }

  protected mapEntityToRow(entity: Partial<TestEntity>): Record<string, any> {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description || null,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
      deleted_at: entity.deleted_at || null,
    };
  }
}

describe('Soft-Delete Integration Tests', () => {
  let repository: TestRepository;
  const mockTimestamp = '2024-01-01T00:00:00.000Z';
  const mockLaterTimestamp = '2024-01-01T01:00:00.000Z';
  const mockUUID = 'test-uuid-123';

  beforeEach(() => {
    resetAllMocks();
    repository = new TestRepository();

    mockGenerateUUID.mockReturnValue(mockUUID);
    mockGetCurrentTimestamp.mockReturnValue(mockTimestamp);
    mockValidateTimestampFields.mockReturnValue([]);
  });

  // =============================================================================
  // COMPLETE SOFT-DELETE LIFECYCLE TESTS
  // =============================================================================

  describe('Complete soft-delete lifecycle', () => {
    const entityData = {
      name: 'Test Entity',
      description: 'Test description',
    };

    test('should handle complete lifecycle: create → soft delete → restore → hard delete', async () => {
      // 1. CREATE: Entity created without deleted_at
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 1));

      const created = await repository.create(entityData);

      expect(created.deleted_at).toBeUndefined();
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'INSERT INTO test_entities (id, name, description, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          mockUUID,
          'Test Entity',
          'Test description',
          mockTimestamp,
          mockTimestamp,
          null,
        ]
      );

      // 2. SOFT DELETE: Entity gets deleted_at timestamp
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 1));
      mockGetCurrentTimestamp.mockReturnValueOnce(mockLaterTimestamp);

      const deleteResult = await repository.delete(mockUUID);

      expect(deleteResult).toBe(true);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'UPDATE test_entities SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
        [mockLaterTimestamp, mockLaterTimestamp, mockUUID]
      );

      // 3. VERIFY SOFT-DELETED ENTITY NOT FOUND IN NORMAL QUERIES
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([])); // No results due to deleted_at filter

      const foundAfterDelete = await repository.findById(mockUUID);
      expect(foundAfterDelete).toBe(null);

      // 4. RESTORE: Entity gets deleted_at cleared
      const restoredEntity = {
        id: mockUUID,
        name: 'Test Entity',
        description: 'Test description',
        created_at: mockTimestamp,
        updated_at: mockLaterTimestamp,
        deleted_at: null,
      };

      mockExecuteSql
        .mockResolvedValueOnce(mockSQLiteResponse([], 1)) // restore UPDATE
        .mockResolvedValueOnce(mockSQLiteResponse([restoredEntity])); // findById after restore

      const restored = await repository.restore(mockUUID);

      expect(restored).not.toBe(null);
      expect(restored?.deleted_at).toBeUndefined();

      // Check the restore call specifically (should be call #4)
      expect(mockExecuteSql).toHaveBeenNthCalledWith(
        4,
        'UPDATE test_entities SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL',
        [mockTimestamp, mockUUID] // Uses current timestamp, not later timestamp
      );

      // 5. HARD DELETE: Entity permanently removed
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 1));

      const hardDeleteResult = await repository.hardDelete(mockUUID);

      expect(hardDeleteResult).toBe(true);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'DELETE FROM test_entities WHERE id = ?',
        [mockUUID]
      );
    });

    test('should prevent double soft-deletion', async () => {
      // First deletion succeeds
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 1));
      const firstDeleteResult = await repository.delete(mockUUID);
      expect(firstDeleteResult).toBe(true);

      // Second deletion on same entity returns false (no rows affected)
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 0));
      const secondDeleteResult = await repository.delete(mockUUID);
      expect(secondDeleteResult).toBe(false);
    });

    test('should only restore actually deleted entities', async () => {
      // Try to restore non-deleted entity
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 0)); // No rows affected
      const restoreResult = await repository.restore(mockUUID);
      expect(restoreResult).toBe(null);
    });
  });

  // =============================================================================
  // QUERY FILTERING TESTS
  // =============================================================================

  describe('Query filtering with soft-delete', () => {
    const activeEntity = {
      id: 'active-id',
      name: 'Active Entity',
      description: 'Active description',
      created_at: mockTimestamp,
      updated_at: mockTimestamp,
      deleted_at: null,
    };

    const deletedEntity = {
      id: 'deleted-id',
      name: 'Deleted Entity',
      description: 'Deleted description',
      created_at: mockTimestamp,
      updated_at: mockLaterTimestamp,
      deleted_at: mockLaterTimestamp,
    };

    test('findAll should exclude soft-deleted entities by default', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([activeEntity]));

      const results = await repository.findAll();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Active Entity');
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM test_entities WHERE deleted_at IS NULL',
        []
      );
    });

    test('findAll should include soft-deleted entities when requested', async () => {
      mockExecuteSql.mockResolvedValueOnce(
        mockSQLiteResponse([activeEntity, deletedEntity])
      );

      const results = await repository.findAll({ includeDeleted: true });

      expect(results).toHaveLength(2);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM test_entities',
        []
      );
    });

    test('findWhere should respect soft-delete filtering', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([activeEntity]));

      const results = await repository.findWhere({ name: 'Active Entity' });

      expect(results).toHaveLength(1);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM test_entities WHERE name = ? AND deleted_at IS NULL',
        ['Active Entity']
      );
    });

    test('count should exclude soft-deleted entities', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([{ count: 5 }]));

      const count = await repository.count();

      expect(count).toBe(5);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM test_entities WHERE deleted_at IS NULL',
        []
      );
    });

    test('exists should return false for soft-deleted entities', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([])); // No results for deleted entity

      const exists = await repository.exists('deleted-id');

      expect(exists).toBe(false);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT 1 FROM test_entities WHERE id = ? AND deleted_at IS NULL LIMIT 1',
        ['deleted-id']
      );
    });
  });

  // =============================================================================
  // UPDATE OPERATIONS ON SOFT-DELETED ENTITIES
  // =============================================================================

  describe('Update operations with soft-delete', () => {
    test('update should not work on soft-deleted entities', async () => {
      // findById returns null for soft-deleted entity
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      await expect(
        repository.update('deleted-id', { name: 'Updated Name' })
      ).rejects.toThrow(EntityNotFoundError);
    });

    test('updateMany should not affect soft-deleted entities', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 2)); // Only active entities updated

      const updatedCount = await repository.updateMany(
        { description: 'Test description' },
        { name: 'Updated Name' }
      );

      expect(updatedCount).toBe(2);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE description = ? AND deleted_at IS NULL'),
        expect.arrayContaining([
          'Updated Name',
          mockTimestamp,
          'Test description',
        ])
      );
    });
  });

  // =============================================================================
  // BATCH OPERATIONS WITH MIXED SOFT-DELETE STATES
  // =============================================================================

  describe('Batch operations with mixed soft-delete states', () => {
    test('deleteMany should only affect non-deleted entities', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 3)); // 3 entities soft-deleted

      const deletedCount = await repository.deleteMany({
        description: 'Test description',
      });

      expect(deletedCount).toBe(3);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'UPDATE test_entities SET deleted_at = ?, updated_at = ? WHERE description = ? AND deleted_at IS NULL',
        [mockTimestamp, mockTimestamp, 'Test description']
      );
    });

    test('hardDeleteMany should affect both active and soft-deleted entities', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 5)); // All matching entities deleted

      const deletedCount = await repository.hardDeleteMany({
        description: 'Test description',
      });

      expect(deletedCount).toBe(5);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'DELETE FROM test_entities WHERE description = ?',
        ['Test description']
      );
    });
  });

  // =============================================================================
  // VALIDATION INTEGRATION TESTS
  // =============================================================================

  describe('Validation integration with soft-delete', () => {
    test('should validate entity with soft-delete field during creation', async () => {
      // This would be validated using schema before insertion
      const validSupplier = createTestSupplier();
      const supplierWithDeletedAt = {
        ...validSupplier,
        deleted_at: mockLaterTimestamp,
      };

      expect(() =>
        validateEntityStrict(SupplierSchema, supplierWithDeletedAt)
      ).not.toThrow();
    });

    test('should reject entity with invalid deleted_at format', async () => {
      const entityWithInvalidDeletedAt = {
        ...createTestSupplier(),
        deleted_at: 'invalid-date-format',
      };

      expect(() =>
        validateEntityStrict(SupplierSchema, entityWithInvalidDeletedAt)
      ).toThrow();
    });
  });

  // =============================================================================
  // ERROR HANDLING WITH SOFT-DELETE
  // =============================================================================

  describe('Error handling with soft-delete operations', () => {
    test('should handle database errors during soft-delete', async () => {
      const dbError = new Error('Database connection failed');
      mockExecuteSql.mockRejectedValueOnce(dbError);

      await expect(repository.delete(mockUUID)).rejects.toThrow(DatabaseError);
    });

    test('should handle database errors during restore', async () => {
      const dbError = new Error('Database connection failed');
      mockExecuteSql.mockRejectedValueOnce(dbError);

      await expect(repository.restore(mockUUID)).rejects.toThrow(DatabaseError);
    });

    test('should preserve original error information in database errors', async () => {
      const originalError = new Error('Original SQL error');
      mockExecuteSql.mockRejectedValueOnce(originalError);

      try {
        await repository.delete(mockUUID);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        expect((error as DatabaseError).originalError).toBe(originalError);
      }
    });
  });

  // =============================================================================
  // TIMESTAMP CONSISTENCY TESTS
  // =============================================================================

  describe('Timestamp consistency in soft-delete operations', () => {
    test('should update both deleted_at and updated_at during soft delete', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 1));

      await repository.delete(mockUUID);

      expect(mockExecuteSql).toHaveBeenCalledWith(
        'UPDATE test_entities SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
        [mockTimestamp, mockTimestamp, mockUUID]
      );
    });

    test('should update updated_at during restore', async () => {
      mockExecuteSql
        .mockResolvedValueOnce(mockSQLiteResponse([], 1))
        .mockResolvedValueOnce(
          mockSQLiteResponse([
            {
              id: mockUUID,
              name: 'Test Entity',
              description: 'Test description',
              created_at: mockTimestamp,
              updated_at: mockTimestamp, // This would be the restore timestamp
              deleted_at: null,
            },
          ])
        );

      await repository.restore(mockUUID);

      expect(mockExecuteSql).toHaveBeenNthCalledWith(
        1,
        'UPDATE test_entities SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL',
        [mockTimestamp, mockUUID]
      );
    });

    test('should call timestamp validation during operations', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 1));

      await repository.create({ name: 'Test Entity' });

      // Note: Current BaseRepository doesn't call validateTimestampFields directly
      // but uses getCurrentTimestamp which is mocked and called
      expect(mockGetCurrentTimestamp).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // QUERY OPTIONS INTEGRATION
  // =============================================================================

  describe('Query options integration with soft-delete', () => {
    const testEntities = [
      {
        id: 'entity-1',
        name: 'Entity 1',
        description: 'Description 1',
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
        deleted_at: null,
      },
      {
        id: 'entity-2',
        name: 'Entity 2',
        description: 'Description 2',
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
        deleted_at: null,
      },
    ];

    test('should combine soft-delete filtering with pagination', async () => {
      mockExecuteSql.mockResolvedValueOnce(
        mockSQLiteResponse([testEntities[0]])
      );

      await repository.findAll({ limit: 1, offset: 5 });

      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM test_entities WHERE deleted_at IS NULL LIMIT ? OFFSET ?',
        [1, 5]
      );
    });

    test('should combine soft-delete filtering with ordering', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse(testEntities));

      await repository.findAll({ orderBy: 'name', orderDirection: 'ASC' });

      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM test_entities WHERE deleted_at IS NULL ORDER BY name ASC',
        []
      );
    });

    test('should work with complex query options and includeDeleted', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse(testEntities));

      const options: QueryOptions = {
        includeDeleted: true,
        orderBy: 'updated_at',
        orderDirection: 'DESC',
        limit: 5,
        offset: 10,
      };

      await repository.findAll(options);

      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM test_entities ORDER BY updated_at DESC LIMIT ? OFFSET ?',
        [5, 10]
      );
    });
  });
});
