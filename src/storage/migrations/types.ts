/**
 * Migration System Types and Interfaces
 * Defines the core types for database and data migrations
 */

import { Transaction } from '../types';

// Migration execution context
export interface MigrationContext {
  // SQLite transaction for database operations
  transaction?: Transaction;
  
  // Current versions before migration
  currentDatabaseVersion: number;
  currentDataVersion: number;
  
  // Target versions after migration
  targetDatabaseVersion: number;
  targetDataVersion: number;
  
  // Migration metadata
  migrationId: string;
  timestamp: string;
  
  // Rollback data storage
  rollbackData?: any;
}

// Migration execution result
export interface MigrationResult {
  success: boolean;
  migrationId: string;
  executionTimeMs: number;
  error?: Error;
  rollbackData?: any;
  warnings?: string[];
}

// Base migration interface
export interface Migration {
  readonly id: string;
  readonly version: number;
  readonly type: MigrationType;
  readonly description: string;
  
  // Dependencies on other migrations
  readonly dependencies?: string[];
  
  // Execute the migration
  up(context: MigrationContext): Promise<MigrationResult>;
  
  // Rollback the migration
  down(context: MigrationContext): Promise<MigrationResult>;
  
  // Validate prerequisites before running
  canRun(context: MigrationContext): Promise<boolean>;
}

// Migration types
export enum MigrationType {
  DATABASE = 'database',
  DATA = 'data'
}

// Database migration for schema changes
export interface DatabaseMigration extends Migration {
  type: MigrationType.DATABASE;
  
  // SQL statements for migration
  readonly upSql: string[];
  readonly downSql: string[];
  
  // Platform-specific SQL (optional)
  readonly webSql?: string[];
  readonly nativeSql?: string[];
  readonly webDownSql?: string[];
  readonly nativeDownSql?: string[];
}

// Data migration for MMKV and data format changes
export interface DataMigration extends Migration {
  type: MigrationType.DATA;
  
  // Data transformation functions
  transformUp(data: any, context: MigrationContext): Promise<any>;
  transformDown(data: any, context: MigrationContext): Promise<any>;
  
  // Affected storage namespaces
  readonly affectedNamespaces: string[];
}

// Migration registry entry
export interface MigrationRegistryEntry {
  migration: Migration;
  registeredAt: string;
  executed: boolean;
  executedAt?: string;
  executionResult?: MigrationResult;
}

// Migration registry interface
export interface MigrationRegistry {
  register(migration: Migration): void;
  unregister(migrationId: string): void;
  getMigration(migrationId: string): Migration | undefined;
  getAllMigrations(): MigrationRegistryEntry[];
  getPendingMigrations(currentDatabaseVersion: number, currentDataVersion: number): Migration[];
  getExecutedMigrations(): MigrationRegistryEntry[];
}

// Migration manager interface
export interface MigrationManager {
  // Execute pending migrations
  runPendingMigrations(): Promise<MigrationResult[]>;
  
  // Execute specific migration
  runMigration(migrationId: string): Promise<MigrationResult>;
  
  // Rollback specific migration
  rollbackMigration(migrationId: string): Promise<MigrationResult>;
  
  // Rollback to specific version
  rollbackToVersion(databaseVersion: number, dataVersion: number): Promise<MigrationResult[]>;
  
  // Get current versions
  getCurrentVersions(): Promise<{ database: number; data: number }>;
  
  // Validate migration chain
  validateMigrationChain(): Promise<{ valid: boolean; errors: string[] }>;
}

// Version tracking interface
export interface VersionTracker {
  // Database version methods
  getDatabaseVersion(): Promise<number>;
  setDatabaseVersion(version: number): Promise<void>;
  
  // Data version methods (stored in MMKV)
  getDataVersion(): Promise<number>;
  setDataVersion(version: number): Promise<void>;
  
  // Migration history
  recordMigrationExecution(migration: Migration, result: MigrationResult): Promise<void>;
  getMigrationHistory(): Promise<MigrationExecutionRecord[]>;
  
  // Rollback tracking
  recordRollback(migrationId: string, rollbackResult: MigrationResult): Promise<void>;
}

// Migration execution record for history tracking
export interface MigrationExecutionRecord {
  migrationId: string;
  type: MigrationType;
  version: number;
  executedAt: string;
  success: boolean;
  executionTimeMs: number;
  error?: string;
  rolledBack?: boolean;
  rolledBackAt?: string;
}

// Configuration for migration system
export interface MigrationConfig {
  // Version tracking configuration
  databaseVersionKey: string;
  dataVersionKey: string;
  migrationHistoryKey: string;
  
  // Execution configuration  
  enableAutoMigration: boolean;
  enableRollback: boolean;
  maxConcurrentMigrations: number;
  migrationTimeout: number; // ms
  
  // Error handling
  continueOnError: boolean;
  retryFailedMigrations: boolean;
  maxRetryAttempts: number;
  
  // Logging
  enableDetailedLogging: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

// Migration error types
export class MigrationError extends Error {
  constructor(
    message: string,
    public readonly migrationId: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

export class MigrationValidationError extends MigrationError {
  constructor(migrationId: string, validationMessage: string) {
    super(`Migration validation failed: ${validationMessage}`, migrationId, 'VALIDATION_ERROR');
  }
}

export class MigrationExecutionError extends MigrationError {
  constructor(migrationId: string, executionMessage: string, originalError?: Error) {
    super(`Migration execution failed: ${executionMessage}`, migrationId, 'EXECUTION_ERROR', originalError);
  }
}

export class MigrationRollbackError extends MigrationError {
  constructor(migrationId: string, rollbackMessage: string, originalError?: Error) {
    super(`Migration rollback failed: ${rollbackMessage}`, migrationId, 'ROLLBACK_ERROR', originalError);
  }
}

// Default migration configuration
export const DEFAULT_MIGRATION_CONFIG: MigrationConfig = {
  databaseVersionKey: 'database_version',
  dataVersionKey: 'data_version', 
  migrationHistoryKey: 'migration_history',
  enableAutoMigration: true,
  enableRollback: true,
  maxConcurrentMigrations: 1, // Sequential execution for safety
  migrationTimeout: 30000, // 30 seconds
  continueOnError: false,
  retryFailedMigrations: true,
  maxRetryAttempts: 3,
  enableDetailedLogging: __DEV__,
  logLevel: __DEV__ ? 'debug' : 'error',
};

