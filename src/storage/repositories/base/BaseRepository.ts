/**
 * Base Repository Implementation
 * Provides common functionality for all SQL-based repositories
 */

import { executeSql } from '../../sqlite/database';
import {
  Repository,
  BaseEntity,
  QueryOptions,
  EntityNotFoundError,
  DatabaseError,
  ValidationError,
} from '../../types';
import {
  generateUUID,
  getCurrentTimestamp,
  validateTimestampFields,
} from '../../utils';

export abstract class BaseRepository<T extends BaseEntity>
  implements Repository<T>
{
  protected abstract tableName: string;
  protected abstract mapRowToEntity(row: any): T;
  protected abstract mapEntityToRow(entity: Partial<T>): Record<string, any>;

  // Override this in subclasses to define allowed ORDER BY columns
  protected getAllowedOrderByColumns(): string[] {
    return ['id', 'created_at', 'updated_at'];
  }

  // Helper method to validate and sanitize ORDER BY column
  private validateOrderByColumn(column: string): string {
    const allowedColumns = this.getAllowedOrderByColumns();
    const normalizedColumn = column.toLowerCase().trim();

    if (!allowedColumns.includes(normalizedColumn)) {
      throw new ValidationError(
        `Invalid orderBy column: ${normalizedColumn}. Allowed columns: ${allowedColumns.join(', ')}`
      );
    }

    return normalizedColumn;
  }

  // Helper method to validate ORDER BY direction
  private validateOrderDirection(direction?: string): string {
    if (!direction) {
      return 'ASC';
    }

    const normalizedDirection = direction.toUpperCase().trim();
    if (normalizedDirection !== 'ASC' && normalizedDirection !== 'DESC') {
      return 'ASC'; // Default to ASC for invalid directions
    }

    return normalizedDirection;
  }

  // Helper method to convert camelCase to snake_case
  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Validate timestamp fields in an entity
   * @param entity Entity to validate
   * @param additionalTimestampFields Additional timestamp fields beyond the base ones
   * @throws ValidationError if any timestamp fields are invalid
   */
  protected validateTimestamps(
    entity: Partial<T>,
    additionalTimestampFields: string[] = []
  ): void {
    const baseTimestampFields = ['created_at', 'updated_at', 'deleted_at'];
    const allTimestampFields = [
      ...baseTimestampFields,
      ...additionalTimestampFields,
    ];

    const errors = validateTimestampFields(
      entity as Record<string, any>,
      allTimestampFields
    );

    if (errors.length > 0) {
      const errorMessages = errors
        .map(e => `${e.field}: ${e.error}`)
        .join(', ');
      throw new ValidationError(`Invalid timestamp fields: ${errorMessages}`);
    }
  }

  async create(
    entityData: Omit<T, 'id' | 'created_at' | 'updated_at'>
  ): Promise<T> {
    const now = getCurrentTimestamp();
    const id = generateUUID();

    const entity = {
      ...entityData,
      id,
      created_at: now,
      updated_at: now,
    } as T;

    try {
      const row = this.mapEntityToRow(entity);
      const columns = Object.keys(row).join(', ');
      const placeholders = Object.keys(row)
        .map(() => '?')
        .join(', ');
      const values = Object.values(row);

      const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;

      await executeSql(sql, values);
      return entity;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create entity in ${this.tableName}`,
        error as Error
      );
    }
  }

  async createMany(
    entitiesData: Omit<T, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<T[]> {
    if (entitiesData.length === 0) return [];

    const now = getCurrentTimestamp();
    const entities: T[] = entitiesData.map(
      data =>
        ({
          ...data,
          id: generateUUID(),
          created_at: now,
          updated_at: now,
        }) as T
    );

    try {
      // Build batch insert
      const firstRow = this.mapEntityToRow(entities[0]);
      const columns = Object.keys(firstRow).join(', ');
      const placeholders = Object.keys(firstRow)
        .map(() => '?')
        .join(', ');

      let sql = `INSERT INTO ${this.tableName} (${columns}) VALUES `;
      const valueGroups: string[] = [];
      const allValues: any[] = [];

      entities.forEach(entity => {
        const row = this.mapEntityToRow(entity);
        valueGroups.push(`(${placeholders})`);
        allValues.push(...Object.values(row));
      });

      sql += valueGroups.join(', ');

      await executeSql(sql, allValues);
      return entities;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create entities in ${this.tableName}`,
        error as Error
      );
    }
  }

  async findById(id: string): Promise<T | null> {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ? AND deleted_at IS NULL`;
      const result = await executeSql(sql, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows.item(0));
    } catch (error) {
      throw new DatabaseError(
        `Failed to find entity by id in ${this.tableName}`,
        error as Error
      );
    }
  }

  async findAll(options: QueryOptions = {}): Promise<T[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];

      // Add soft delete filter unless explicitly requested
      if (!options.includeDeleted) {
        sql += ' WHERE deleted_at IS NULL';
      }

      // Add ordering with validation
      if (options.orderBy) {
        const validOrderBy = this.validateOrderByColumn(options.orderBy);
        const validDirection = this.validateOrderDirection(
          options.orderDirection
        );
        sql += ` ORDER BY ${validOrderBy} ${validDirection}`;
      }

      // Add pagination
      if (options.limit) {
        sql += ' LIMIT ?';
        params.push(options.limit);

        if (options.offset) {
          sql += ' OFFSET ?';
          params.push(options.offset);
        }
      }

      const result = await executeSql(sql, params);
      const entities: T[] = [];

      for (let i = 0; i < result.rows.length; i++) {
        entities.push(this.mapRowToEntity(result.rows.item(i)));
      }

      return entities;
    } catch (error) {
      throw new DatabaseError(
        `Failed to find all entities in ${this.tableName}`,
        error as Error
      );
    }
  }

  async findWhere(
    conditions: Partial<T>,
    options: QueryOptions = {}
  ): Promise<T[]> {
    try {
      const whereConditions: string[] = [];
      const params: any[] = [];

      // Build WHERE conditions
      Object.entries(conditions).forEach(([key, value]) => {
        // Convert camelCase to snake_case for database columns
        const dbColumn = this.camelToSnakeCase(key);
        whereConditions.push(`${dbColumn} = ?`);
        params.push(value);
      });

      // Add soft delete filter unless explicitly requested
      if (!options.includeDeleted) {
        whereConditions.push('deleted_at IS NULL');
      }

      let sql = `SELECT * FROM ${this.tableName}`;
      if (whereConditions.length > 0) {
        sql += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      // Add ordering with validation
      if (options.orderBy) {
        const validOrderBy = this.validateOrderByColumn(options.orderBy);
        const validDirection = this.validateOrderDirection(
          options.orderDirection
        );
        sql += ` ORDER BY ${validOrderBy} ${validDirection}`;
      }

      // Add pagination
      if (options.limit) {
        sql += ' LIMIT ?';
        params.push(options.limit);

        if (options.offset) {
          sql += ' OFFSET ?';
          params.push(options.offset);
        }
      }

      if (__DEV__) {
        console.log(`[BaseRepository] Executing findWhere query for ${this.tableName}:`, sql, params);
      }
      
      const result = await executeSql(sql, params);
      const entities: T[] = [];

      for (let i = 0; i < result.rows.length; i++) {
        entities.push(this.mapRowToEntity(result.rows.item(i)));
      }

      if (__DEV__) {
        console.log(`[BaseRepository] findWhere result for ${this.tableName}:`, entities.length, 'entities');
      }

      return entities;
    } catch (error) {
      if (__DEV__) {
        console.error(`[BaseRepository] findWhere error for ${this.tableName}:`, error);
      }
      throw new DatabaseError(
        `Failed to find entities with conditions in ${this.tableName}`,
        error as Error
      );
    }
  }

  async count(conditions?: Partial<T>): Promise<number> {
    try {
      let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const params: any[] = [];
      const whereConditions: string[] = [];

      if (conditions) {
        Object.entries(conditions).forEach(([key, value]) => {
          // Convert camelCase to snake_case for database columns
          const dbColumn = this.camelToSnakeCase(key);
          whereConditions.push(`${dbColumn} = ?`);
          params.push(value);
        });
      }

      // Always exclude soft deleted records in count
      whereConditions.push('deleted_at IS NULL');

      if (whereConditions.length > 0) {
        sql += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      const result = await executeSql(sql, params);
      return result.rows.item(0).count;
    } catch (error) {
      throw new DatabaseError(
        `Failed to count entities in ${this.tableName}`,
        error as Error
      );
    }
  }

  async update(
    id: string,
    updates: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<T | null> {
    try {
      // First check if entity exists
      const existing = await this.findById(id);
      if (!existing) {
        throw new EntityNotFoundError(this.tableName, id);
      }

      const updatedEntity = {
        ...existing,
        ...updates,
        updated_at: getCurrentTimestamp(),
      };

      const row = this.mapEntityToRow(updatedEntity);
      console.log('BaseRepository.update - mapped row:', row);
      
      const setClause = Object.keys(row)
        .filter(key => key !== 'id')
        .map(key => `${key} = ?`)
        .join(', ');

      const values = Object.values(row).filter(
        (_, index) => Object.keys(row)[index] !== 'id'
      );
      values.push(id);

      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
      console.log('BaseRepository.update - SQL:', sql);
      console.log('BaseRepository.update - values:', values);

      const result = await executeSql(sql, values);
      console.log('BaseRepository.update - result:', result);

      if (result.rowsAffected === 0) {
        throw new EntityNotFoundError(this.tableName, id);
      }

      return updatedEntity;
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new DatabaseError(
        `Failed to update entity in ${this.tableName}`,
        error as Error
      );
    }
  }

  async updateMany(
    conditions: Partial<T>,
    updates: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<number> {
    try {
      const whereConditions: string[] = [];
      const params: any[] = [];

      // Build UPDATE SET clause
      const updatesWithTimestamp = {
        ...updates,
        updated_at: getCurrentTimestamp(),
      };

      const row = this.mapEntityToRow(updatesWithTimestamp as Partial<T>);
      const setClause = Object.keys(row)
        .map(key => `${key} = ?`)
        .join(', ');

      Object.values(row).forEach(value => params.push(value));

      // Build WHERE conditions
      Object.entries(conditions).forEach(([key, value]) => {
        whereConditions.push(`${key} = ?`);
        params.push(value);
      });

      // Ensure we don't update soft-deleted records
      whereConditions.push('deleted_at IS NULL');

      let sql = `UPDATE ${this.tableName} SET ${setClause}`;
      if (whereConditions.length > 0) {
        sql += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      const result = await executeSql(sql, params);
      return result.rowsAffected || 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to update entities in ${this.tableName}`,
        error as Error
      );
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Soft delete - set deleted_at timestamp
      const sql = `UPDATE ${this.tableName} SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`;
      const now = getCurrentTimestamp();

      const result = await executeSql(sql, [now, now, id]);
      return (result.rowsAffected || 0) > 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete entity in ${this.tableName}`,
        error as Error
      );
    }
  }

  async deleteMany(conditions: Partial<T>): Promise<number> {
    try {
      const whereConditions: string[] = [];
      const params: any[] = [];
      const now = getCurrentTimestamp();

      // Add timestamp params first
      params.push(now, now);

      // Build WHERE conditions
      Object.entries(conditions).forEach(([key, value]) => {
        whereConditions.push(`${key} = ?`);
        params.push(value);
      });

      // Ensure we don't re-delete already soft-deleted records
      whereConditions.push('deleted_at IS NULL');

      let sql = `UPDATE ${this.tableName} SET deleted_at = ?, updated_at = ?`;
      if (whereConditions.length > 0) {
        sql += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      const result = await executeSql(sql, params);
      return result.rowsAffected || 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete entities in ${this.tableName}`,
        error as Error
      );
    }
  }

  async hardDelete(id: string): Promise<boolean> {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await executeSql(sql, [id]);
      return (result.rowsAffected || 0) > 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to hard delete entity in ${this.tableName}`,
        error as Error
      );
    }
  }

  async hardDeleteMany(conditions: Partial<T>): Promise<number> {
    try {
      const whereConditions: string[] = [];
      const params: any[] = [];

      // Build WHERE conditions
      Object.entries(conditions).forEach(([key, value]) => {
        whereConditions.push(`${key} = ?`);
        params.push(value);
      });

      let sql = `DELETE FROM ${this.tableName}`;
      if (whereConditions.length > 0) {
        sql += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      const result = await executeSql(sql, params);
      return result.rowsAffected || 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to hard delete entities in ${this.tableName}`,
        error as Error
      );
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const sql = `SELECT 1 FROM ${this.tableName} WHERE id = ? AND deleted_at IS NULL LIMIT 1`;
      const result = await executeSql(sql, [id]);
      return result.rows.length > 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to check entity existence in ${this.tableName}`,
        error as Error
      );
    }
  }

  async restore(id: string): Promise<T | null> {
    try {
      const sql = `UPDATE ${this.tableName} SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL`;
      const now = getCurrentTimestamp();

      const result = await executeSql(sql, [now, id]);

      if (result.rowsAffected === 0) {
        return null; // Either doesn't exist or wasn't deleted
      }

      // Return the restored entity
      return this.findById(id);
    } catch (error) {
      throw new DatabaseError(
        `Failed to restore entity in ${this.tableName}`,
        error as Error
      );
    }
  }
}
