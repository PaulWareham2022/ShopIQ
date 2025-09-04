/**
 * Unit tests for BaseRepository CRUD operations
 */

import { BaseRepository } from '../../repositories/base/BaseRepository';
import { BaseEntity, EntityNotFoundError, DatabaseError, ValidationError } from '../../types';
import { mockSQLiteResponse, resetAllMocks, createTestSupplier } from '../setup';

// Mock the database module
const mockExecuteSql = jest.fn();
jest.mock('../../sqlite/database', () => ({
  executeSql: mockExecuteSql,
}));

// Mock the utils module
const mockGenerateUUID = jest.fn();
const mockGetCurrentTimestamp = jest.fn();
const mockValidateTimestampFields = jest.fn();

jest.mock('../../utils', () => ({
  generateUUID: mockGenerateUUID,
  getCurrentTimestamp: mockGetCurrentTimestamp,
  validateTimestampFields: mockValidateTimestampFields,
}));

// Test entity interface
interface TestEntity extends BaseEntity {
  name: string;
  description?: string;
}

// Concrete implementation for testing
class TestRepository extends BaseRepository<TestEntity> {
  protected tableName = 'test_table';

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

describe('BaseRepository', () => {
  let repository: TestRepository;
  const mockTimestamp = '2024-01-01T00:00:00.000Z';
  const mockUUID = 'test-uuid-123';

  beforeEach(() => {
    resetAllMocks();
    repository = new TestRepository();
    
    mockGenerateUUID.mockReturnValue(mockUUID);
    mockGetCurrentTimestamp.mockReturnValue(mockTimestamp);
    mockValidateTimestampFields.mockReturnValue([]);
  });

  describe('create', () => {
    const testEntityData = {
      name: 'Test Entity',
      description: 'Test description',
    };

    it('should create a new entity successfully', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 1));

      const result = await repository.create(testEntityData);

      expect(result).toEqual({
        id: mockUUID,
        name: 'Test Entity',
        description: 'Test description',
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
      });

      expect(mockExecuteSql).toHaveBeenCalledWith(
        'INSERT INTO test_table (id, name, description, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?)',
        [mockUUID, 'Test Entity', 'Test description', mockTimestamp, mockTimestamp, null]
      );
    });

    it('should create entity without optional fields', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 1));

      const result = await repository.create({ name: 'Test Entity' });

      expect(result).toEqual({
        id: mockUUID,
        name: 'Test Entity',
        description: undefined,
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
      });
    });

    it('should throw DatabaseError on SQL execution failure', async () => {
      const sqlError = new Error('SQL execution failed');
      mockExecuteSql.mockRejectedValueOnce(sqlError);

      await expect(repository.create(testEntityData))
        .rejects
        .toThrow(DatabaseError);
    });

    it('should generate UUID and timestamps for entity', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 1));

      await repository.create(testEntityData);

      expect(mockGenerateUUID).toHaveBeenCalledTimes(1);
      expect(mockGetCurrentTimestamp).toHaveBeenCalledTimes(1);
    });
  });

  describe('createMany', () => {
    const testEntitiesData = [
      { name: 'Entity 1', description: 'Description 1' },
      { name: 'Entity 2', description: 'Description 2' },
    ];

    it('should create multiple entities successfully', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 2));

      const result = await repository.createMany(testEntitiesData);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Entity 1');
      expect(result[1].name).toBe('Entity 2');
      expect(mockExecuteSql).toHaveBeenCalledTimes(1);
    });

    it('should return empty array for empty input', async () => {
      const result = await repository.createMany([]);
      expect(result).toEqual([]);
      expect(mockExecuteSql).not.toHaveBeenCalled();
    });

    it('should throw DatabaseError on batch insert failure', async () => {
      const sqlError = new Error('Batch insert failed');
      mockExecuteSql.mockRejectedValueOnce(sqlError);

      await expect(repository.createMany(testEntitiesData))
        .rejects
        .toThrow(DatabaseError);
    });
  });

  describe('findById', () => {
    const testEntity = {
      id: 'test-id',
      name: 'Test Entity',
      description: 'Test description',
      created_at: mockTimestamp,
      updated_at: mockTimestamp,
      deleted_at: null,
    };

    it('should find entity by ID successfully', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([testEntity]));

      const result = await repository.findById('test-id');

      expect(result).toEqual({
        id: 'test-id',
        name: 'Test Entity',
        description: 'Test description',
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
        deleted_at: undefined,
      });

      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE id = ? AND deleted_at IS NULL',
        ['test-id']
      );
    });

    it('should return null when entity not found', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      const result = await repository.findById('non-existent-id');
      expect(result).toBe(null);
    });

    it('should throw DatabaseError on SQL execution failure', async () => {
      const sqlError = new Error('Query failed');
      mockExecuteSql.mockRejectedValueOnce(sqlError);

      await expect(repository.findById('test-id'))
        .rejects
        .toThrow(DatabaseError);
    });
  });

  describe('findAll', () => {
    const testEntities = [
      {
        id: 'test-id-1',
        name: 'Entity 1',
        description: 'Description 1',
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
        deleted_at: null,
      },
      {
        id: 'test-id-2',
        name: 'Entity 2',
        description: 'Description 2',
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
        deleted_at: null,
      },
    ];

    it('should find all entities without options', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse(testEntities));

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE deleted_at IS NULL',
        []
      );
    });

    it('should find all entities with pagination', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([testEntities[0]]));

      const result = await repository.findAll({ limit: 1, offset: 0 });

      expect(result).toHaveLength(1);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE deleted_at IS NULL LIMIT ? OFFSET ?',
        [1, 0]
      );
    });

    it('should find all entities with ordering', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse(testEntities));

      await repository.findAll({ orderBy: 'name', orderDirection: 'DESC' });

      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE deleted_at IS NULL ORDER BY name DESC',
        []
      );
    });

    it('should include deleted entities when requested', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse(testEntities));

      await repository.findAll({ includeDeleted: true });

      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM test_table',
        []
      );
    });

    it('should throw DatabaseError on query failure', async () => {
      const sqlError = new Error('Query failed');
      mockExecuteSql.mockRejectedValueOnce(sqlError);

      await expect(repository.findAll())
        .rejects
        .toThrow(DatabaseError);
    });
  });

  describe('findWhere', () => {
    const conditions = { name: 'Test Entity' };
    const testEntity = {
      id: 'test-id',
      name: 'Test Entity',
      description: 'Test description',
      created_at: mockTimestamp,
      updated_at: mockTimestamp,
      deleted_at: null,
    };

    it('should find entities matching conditions', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([testEntity]));

      const result = await repository.findWhere(conditions);

      expect(result).toHaveLength(1);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE name = ? AND deleted_at IS NULL',
        ['Test Entity']
      );
    });

    it('should handle multiple conditions', async () => {
      const multipleConditions = { name: 'Test', description: 'Description' };
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([testEntity]));

      await repository.findWhere(multipleConditions);

      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE name = ? AND description = ? AND deleted_at IS NULL',
        ['Test', 'Description']
      );
    });

    it('should support query options', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([testEntity]));

      await repository.findWhere(conditions, { 
        orderBy: 'created_at', 
        limit: 10 
      });

      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE name = ? AND deleted_at IS NULL ORDER BY created_at LIMIT ?',
        ['Test Entity', 10]
      );
    });
  });

  describe('count', () => {
    it('should count entities without conditions', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([{ count: 5 }]));

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM test_table WHERE deleted_at IS NULL',
        []
      );
    });

    it('should count entities with conditions', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([{ count: 2 }]));

      const result = await repository.count({ name: 'Test' });

      expect(result).toBe(2);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM test_table WHERE name = ? AND deleted_at IS NULL',
        ['Test']
      );
    });
  });

  describe('update', () => {
    const testEntity = {
      id: 'test-id',
      name: 'Original Name',
      description: 'Original description',
      created_at: mockTimestamp,
      updated_at: mockTimestamp,
      deleted_at: null,
    };

    const updates = {
      name: 'Updated Name',
      description: 'Updated description',
    };

    beforeEach(() => {
      // Mock findById call first
      mockExecuteSql
        .mockResolvedValueOnce(mockSQLiteResponse([testEntity])) // findById call
        .mockResolvedValueOnce(mockSQLiteResponse([], 1)); // update call
    });

    it('should update entity successfully', async () => {
      const result = await repository.update('test-id', updates);

      expect(result).toEqual({
        id: 'test-id',
        name: 'Updated Name',
        description: 'Updated description',
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
      });

      expect(mockExecuteSql).toHaveBeenCalledTimes(2);
      expect(mockExecuteSql).toHaveBeenNthCalledWith(2,
        'UPDATE test_table SET name = ?, description = ?, created_at = ?, updated_at = ?, deleted_at = ? WHERE id = ?',
        ['Updated Name', 'Updated description', mockTimestamp, mockTimestamp, null, 'test-id']
      );
    });

    it('should throw EntityNotFoundError when entity does not exist', async () => {
      mockExecuteSql.mockReset();
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([])); // findById returns nothing

      await expect(repository.update('non-existent-id', updates))
        .rejects
        .toThrow(EntityNotFoundError);
    });

    it('should throw EntityNotFoundError when update affects no rows', async () => {
      mockExecuteSql.mockReset();
      mockExecuteSql
        .mockResolvedValueOnce(mockSQLiteResponse([testEntity])) // findById succeeds
        .mockResolvedValueOnce(mockSQLiteResponse([], 0)); // update affects 0 rows

      await expect(repository.update('test-id', updates))
        .rejects
        .toThrow(EntityNotFoundError);
    });
  });

  describe('updateMany', () => {
    const conditions = { name: 'Test' };
    const updates = { description: 'Updated description' };

    it('should update multiple entities successfully', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 3));

      const result = await repository.updateMany(conditions, updates);

      expect(result).toBe(3);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'UPDATE test_table SET description = ?, updated_at = ? WHERE name = ? AND deleted_at IS NULL',
        ['Updated description', mockTimestamp, 'Test']
      );
    });

    it('should return 0 when no entities match conditions', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 0));

      const result = await repository.updateMany(conditions, updates);
      expect(result).toBe(0);
    });
  });

  describe('delete (soft delete)', () => {
    it('should soft delete entity successfully', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 1));

      const result = await repository.delete('test-id');

      expect(result).toBe(true);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'UPDATE test_table SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
        [mockTimestamp, mockTimestamp, 'test-id']
      );
    });

    it('should return false when entity does not exist', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 0));

      const result = await repository.delete('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('deleteMany (soft delete)', () => {
    const conditions = { name: 'Test' };

    it('should soft delete multiple entities successfully', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 3));

      const result = await repository.deleteMany(conditions);

      expect(result).toBe(3);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'UPDATE test_table SET deleted_at = ?, updated_at = ? WHERE name = ? AND deleted_at IS NULL',
        [mockTimestamp, mockTimestamp, 'Test']
      );
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete entity successfully', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 1));

      const result = await repository.hardDelete('test-id');

      expect(result).toBe(true);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'DELETE FROM test_table WHERE id = ?',
        ['test-id']
      );
    });

    it('should return false when entity does not exist', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 0));

      const result = await repository.hardDelete('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('hardDeleteMany', () => {
    const conditions = { name: 'Test' };

    it('should permanently delete multiple entities successfully', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 5));

      const result = await repository.hardDeleteMany(conditions);

      expect(result).toBe(5);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'DELETE FROM test_table WHERE name = ?',
        ['Test']
      );
    });
  });

  describe('exists', () => {
    it('should return true when entity exists', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([{ id: 'test-id' }]));

      const result = await repository.exists('test-id');

      expect(result).toBe(true);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT 1 FROM test_table WHERE id = ? AND deleted_at IS NULL LIMIT 1',
        ['test-id']
      );
    });

    it('should return false when entity does not exist', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      const result = await repository.exists('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('restore', () => {
    const deletedEntity = {
      id: 'test-id',
      name: 'Test Entity',
      description: 'Test description',
      created_at: mockTimestamp,
      updated_at: mockTimestamp,
      deleted_at: mockTimestamp,
    };

    it('should restore soft-deleted entity successfully', async () => {
      mockExecuteSql
        .mockResolvedValueOnce(mockSQLiteResponse([], 1)) // restore operation
        .mockResolvedValueOnce(mockSQLiteResponse([{ ...deletedEntity, deleted_at: null }])); // findById call

      const result = await repository.restore('test-id');

      expect(result).toBeDefined();
      expect(result?.id).toBe('test-id');
      expect(mockExecuteSql).toHaveBeenNthCalledWith(1,
        'UPDATE test_table SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL',
        [mockTimestamp, 'test-id']
      );
    });

    it('should return null when entity cannot be restored', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 0));

      const result = await repository.restore('test-id');
      expect(result).toBe(null);
    });
  });

  describe('timestamp validation', () => {
    it('should call timestamp validation during operations', async () => {
      const testEntity = { name: 'Test' };
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([], 1));

      await repository.create(testEntity);

      // Timestamp validation should be called during entity creation
      expect(mockValidateTimestampFields).toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid timestamps', async () => {
      const validationErrors = [
        { field: 'created_at', value: 'invalid', error: 'Invalid timestamp' }
      ];
      mockValidateTimestampFields.mockReturnValueOnce(validationErrors);

      await expect(repository.create({ name: 'Test' }))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const connectionError = new Error('Database connection failed');
      mockExecuteSql.mockRejectedValueOnce(connectionError);

      await expect(repository.findAll())
        .rejects
        .toThrow(DatabaseError);
    });

    it('should preserve original error information', async () => {
      const originalError = new Error('Original SQL error');
      mockExecuteSql.mockRejectedValueOnce(originalError);

      try {
        await repository.create({ name: 'Test' });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        expect((error as DatabaseError).originalError).toBe(originalError);
      }
    });
  });
});
