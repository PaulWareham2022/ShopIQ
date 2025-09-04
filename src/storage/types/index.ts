/**
 * Core types and interfaces for the storage layer
 * This file defines the base types used across all repositories
 */

// Base entity interface - all entities must have these fields
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Generic repository interface for CRUD operations
export interface Repository<T extends BaseEntity> {
  // Create operations
  create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;
  createMany(entities: Omit<T, 'id' | 'created_at' | 'updated_at'>[]): Promise<T[]>;

  // Read operations
  findById(id: string): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<T[]>;
  findWhere(conditions: Partial<T>, options?: QueryOptions): Promise<T[]>;
  count(conditions?: Partial<T>): Promise<number>;

  // Update operations
  update(id: string, updates: Partial<Omit<T, 'id' | 'created_at'>>): Promise<T | null>;
  updateMany(conditions: Partial<T>, updates: Partial<Omit<T, 'id' | 'created_at'>>): Promise<number>;

  // Delete operations (soft delete by default)
  delete(id: string): Promise<boolean>;
  deleteMany(conditions: Partial<T>): Promise<number>;
  
  // Hard delete operations (permanent removal)
  hardDelete(id: string): Promise<boolean>;
  hardDeleteMany(conditions: Partial<T>): Promise<number>;

  // Utility operations
  exists(id: string): Promise<boolean>;
  restore(id: string): Promise<T | null>; // Restore soft-deleted entity
}

// Key-value storage interface for MMKV-backed repositories
export interface KeyValueRepository {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  delete(key: string): void;
  exists(key: string): boolean;
  getAllKeys(): string[];
  clear(): void;
  
  // JSON-specific operations
  getObject<T>(key: string): T | undefined;
  setObject<T>(key: string, value: T): void;
}

// Query options for filtering, sorting, and pagination
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  includeDeleted?: boolean; // Include soft-deleted entities
}

// Sort direction for queries
export type SortDirection = 'ASC' | 'DESC';

// Database transaction interface
export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  executeSql(sql: string, params?: any[]): Promise<any>;
}

// Repository factory interface
export interface RepositoryFactory {
  getSupplierRepository(): Repository<any>;
  getInventoryItemRepository(): Repository<any>;
  getOfferRepository(): Repository<any>;
  getUnitConversionRepository(): Repository<any>;
  getBundleRepository(): Repository<any>;
  getKeyValueRepository(namespace: string): KeyValueRepository;
  
  // Transaction support
  beginTransaction(): Promise<Transaction>;
}

// Storage configuration
export interface StorageConfig {
  databaseName: string;
  version: number;
  encryption?: boolean;
  encryptionKey?: string;
}

// Error types for storage operations
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class EntityNotFoundError extends StorageError {
  constructor(entityType: string, id: string) {
    super(`${entityType} with id ${id} not found`, 'ENTITY_NOT_FOUND');
  }
}

export class ValidationError extends StorageError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class DatabaseError extends StorageError {
  constructor(message: string, originalError?: Error) {
    super(message, 'DATABASE_ERROR', originalError);
  }
}
