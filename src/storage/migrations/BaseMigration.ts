/**
 * Base Migration Classes
 * Provides abstract base classes for database and data migrations
 */

import { Platform } from 'react-native';
import {
  Migration,
  DatabaseMigration as IDatabaseMigration,
  DataMigration as IDataMigration,
  MigrationContext,
  MigrationResult,
  MigrationType,
  MigrationError,
  MigrationExecutionError,
  MigrationValidationError,
} from './types';
import { executeSql } from '../sqlite/database';
import { appStorageWrapper, cacheStorageWrapper, userPreferencesStorageWrapper } from '../mmkv/storage';

// ===============================
// Base Migration Class
// ===============================

// Helper function to validate SQL identifiers
function validateSqlIdentifier(identifier: string): void {
  const identifierRegex = /^[A-Za-z_][A-Za-z0-9_]*$/;
  if (!identifierRegex.test(identifier)) {
    throw new Error(`Invalid SQL identifier: identifier contains invalid characters`);
  }
}

// Helper function to safely quote SQL identifiers
function quoteSqlIdentifier(identifier: string): string {
  validateSqlIdentifier(identifier);
  return `"${identifier.replace(/"/g, '""')}"`;
}

// Helper function to sanitize error messages
function sanitizeErrorMessage(message: string): string {
  // Remove or mask potentially sensitive information
  return message.replace(/['"`].*?['"`]/g, '[SANITIZED]');
}

export abstract class BaseMigration implements Migration {
  abstract readonly id: string;
  abstract readonly version: number;
  abstract readonly type: MigrationType;
  abstract readonly description: string;
  
  readonly dependencies?: string[];

  constructor(dependencies?: string[]) {
    this.dependencies = dependencies;
  }

  // Default implementation - can be overridden
  async canRun(context: MigrationContext): Promise<boolean> {
    // Basic validation - check if we're not going backwards
    if (this.type === MigrationType.DATABASE) {
      return this.version > context.currentDatabaseVersion;
    } else {
      return this.version > context.currentDataVersion;
    }
  }

  // Abstract methods that must be implemented
  abstract up(context: MigrationContext): Promise<MigrationResult>;
  abstract down(context: MigrationContext): Promise<MigrationResult>;

  // Helper method to create a successful result
  protected createSuccessResult(
    executionTimeMs: number,
    rollbackData?: any,
    warnings?: string[]
  ): MigrationResult {
    return {
      success: true,
      migrationId: this.id,
      executionTimeMs,
      rollbackData,
      warnings,
    };
  }

  // Helper method to create a failed result
  protected createFailureResult(
    executionTimeMs: number,
    error: Error,
    rollbackData?: any
  ): MigrationResult {
    return {
      success: false,
      migrationId: this.id,
      executionTimeMs,
      error,
      rollbackData,
    };
  }

  // Helper method to measure execution time
  protected async measureExecutionTime<T>(operation: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
    const startTime = Date.now();
    const result = await operation();
    const timeMs = Date.now() - startTime;
    return { result, timeMs };
  }
}

// ===============================
// Database Migration Base Class
// ===============================

export abstract class DatabaseMigration extends BaseMigration implements IDatabaseMigration {
  readonly type = MigrationType.DATABASE;
  
  // SQL statements for migration
  abstract readonly upSql: string[];
  abstract readonly downSql: string[];
  
  // Platform-specific SQL (optional)
  readonly webSql?: string[];
  readonly nativeSql?: string[];
  readonly webDownSql?: string[];
  readonly nativeDownSql?: string[];

  async up(context: MigrationContext): Promise<MigrationResult> {
    if (!context) {
      throw new MigrationValidationError(this.id, 'Migration context is required');
    }
    if (!context.transaction) {
      throw new MigrationValidationError(this.id, 'Database migrations require a transaction');
    }

    const { result, timeMs } = await this.measureExecutionTime(async () => {
      try {
        // Get the appropriate SQL statements for the current platform
        const sqlStatements = this.getSqlForPlatform('up');
        
        if (sqlStatements.length === 0) {
          throw new Error('No SQL statements provided for migration');
        }

        // Execute all SQL statements in order with validation
        for (const sql of sqlStatements) {
          const trimmedSql = sql.trim();
          if (trimmedSql) {
            // Basic SQL validation to prevent obviously dangerous statements
            if (this.isValidMigrationSql(trimmedSql)) {
              await context.transaction!.executeSql(trimmedSql);
            } else {
              throw new Error('SQL statement failed validation checks');
            }
          }
        }

        // Store rollback data if needed
        const rollbackData = {
          downSql: this.getSqlForPlatform('down'),
          executedStatements: sqlStatements.length,
        };

        return { rollbackData };
      } catch (error) {
        throw new MigrationExecutionError(
          this.id,
          'Failed to execute database migration',
          error as Error
        );
      }
    });

    return this.createSuccessResult(timeMs, result.rollbackData);
  }

  // Helper method to validate SQL statements for migrations
  private isValidMigrationSql(sql: string): boolean {
    const upperSql = sql.toUpperCase().trim();
    
    // Allow common DDL/DML operations for migrations
    const allowedPatterns = [
      /^CREATE\s+(TABLE|INDEX|UNIQUE\s+INDEX)/,
      /^ALTER\s+TABLE/,
      /^DROP\s+(TABLE|INDEX)/,
      /^INSERT\s+INTO/,
      /^UPDATE\s+\w+\s+SET/,
      /^DELETE\s+FROM/,
      /^PRAGMA/
    ];
    
    // Check if SQL matches allowed patterns
    const isAllowed = allowedPatterns.some(pattern => pattern.test(upperSql));
    if (!isAllowed) {
      return false;
    }
    
    // Check for potentially dangerous elements
    const dangerousPatterns = [
      /;.*;/,  // Multiple statements
      /--/,    // Comments
      /\/\*/,  // Block comments
      /\bEXEC\b/,
      /\bEVAL\b/,
      /\bSYSTEM\b/
    ];
    
    const isDangerous = dangerousPatterns.some(pattern => pattern.test(upperSql));
    return !isDangerous;
  }

  async down(context: MigrationContext): Promise<MigrationResult> {
    if (!context.transaction) {
      throw new MigrationValidationError(this.id, 'Database migrations require a transaction');
    }

    const { result, timeMs } = await this.measureExecutionTime(async () => {
      try {
        // Get the appropriate rollback SQL statements
        const rollbackSql = this.getSqlForPlatform('down');
        
        if (rollbackSql.length === 0) {
          throw new Error('No rollback SQL statements provided');
        }

        // Execute rollback statements in order
        for (const sql of rollbackSql) {
          if (sql.trim()) {
            await context.transaction!.executeSql(sql);
          }
        }

        return {};
      } catch (error) {
        throw new MigrationExecutionError(
          this.id,
          `Failed to rollback database migration: ${error.message}`,
          error as Error
        );
      }
    });

    return this.createSuccessResult(timeMs);
  }

  // Get the appropriate SQL statements for the current platform and direction
  private getSqlForPlatform(direction: 'up' | 'down'): string[] {
    const isWeb = Platform.OS === 'web';
    
    if (direction === 'up') {
      // For up migrations, prefer platform-specific SQL if available
      if (isWeb && this.webSql) {
        return this.webSql;
      } else if (!isWeb && this.nativeSql) {
        return this.nativeSql;
      }
      return this.upSql;
    } else {
      // For down migrations, prefer platform-specific SQL if available
      if (isWeb && this.webDownSql) {
        return this.webDownSql;
      } else if (!isWeb && this.nativeDownSql) {
        return this.nativeDownSql;
      }
      return this.downSql;
    }
  }

  // Utility method for creating table creation SQL
  protected createTable(tableName: string, columns: string[], constraints: string[] = []): string {
    const quotedTableName = quoteSqlIdentifier(tableName);
    const allDefinitions = [...columns, ...constraints];
    return `CREATE TABLE IF NOT EXISTS ${quotedTableName} (\n  ${allDefinitions.join(',\n  ')}\n);`;
  }

  // Utility method for adding columns
  protected addColumn(tableName: string, columnName: string, columnDefinition: string): string {
    const quotedTableName = quoteSqlIdentifier(tableName);
    const quotedColumnName = quoteSqlIdentifier(columnName);
    // Note: columnDefinition should come from trusted source or be validated separately
    return `ALTER TABLE ${quotedTableName} ADD COLUMN ${quotedColumnName} ${columnDefinition};`;
  }

  // Utility method for creating indexes
  protected createIndex(indexName: string, tableName: string, columns: string[], unique = false): string {
    const quotedIndexName = quoteSqlIdentifier(indexName);
    const quotedTableName = quoteSqlIdentifier(tableName);
    const quotedColumns = columns.map(col => quoteSqlIdentifier(col));
    const uniqueKeyword = unique ? 'UNIQUE ' : '';
    return `CREATE ${uniqueKeyword}INDEX IF NOT EXISTS ${quotedIndexName} ON ${quotedTableName} (${quotedColumns.join(', ')});`;
  }

  // Utility method for dropping indexes
  protected dropIndex(indexName: string): string {
    const quotedIndexName = quoteSqlIdentifier(indexName);
    return `DROP INDEX IF EXISTS ${quotedIndexName};`;
  }
}

// ===============================
// Data Migration Base Class
// ===============================

export abstract class DataMigration extends BaseMigration implements IDataMigration {
  readonly type = MigrationType.DATA;
  
  // Affected storage namespaces
  abstract readonly affectedNamespaces: string[];
  
  // Configurable batch size for processing large namespaces
  protected readonly BATCH_SIZE = 100;
  
  // Abstract transformation methods
  abstract transformUp(data: any, context: MigrationContext): Promise<any>;
  abstract transformDown(data: any, context: MigrationContext): Promise<any>;

  async up(context: MigrationContext): Promise<MigrationResult> {
    const { result, timeMs } = await this.measureExecutionTime(async () => {
      try {
        const rollbackData: { [namespace: string]: any } = {};
        const warnings: string[] = [];

        // Process each affected namespace
        for (const namespace of this.affectedNamespaces) {
          const storage = this.getStorageForNamespace(namespace);
          
          // Get all keys for this namespace
          const allKeys = storage.getAllKeys();
          
          if (allKeys.length === 0) {
            warnings.push(`No data found in namespace: ${namespace}`);
            continue;
          }

          // Process keys in batches to avoid memory issues
          const rollbackDataForNamespace: { [key: string]: any } = {};
          
          for (let offset = 0; offset < allKeys.length; offset += this.BATCH_SIZE) {
            const batchKeys = allKeys.slice(offset, offset + this.BATCH_SIZE);
            
            for (const key of batchKeys) {
              const originalValue = storage.getObject(key);
              if (originalValue !== undefined) {
                // Store only minimal rollback info for modified keys
                rollbackDataForNamespace[key] = originalValue;
                
                try {
                  // Transform the data
                  const transformedValue = await this.transformUp(originalValue, context);
                  
                  // Store transformed data
                  if (transformedValue !== undefined) {
                    storage.setObject(key, transformedValue);
                  } else {
                    // If transform returns undefined, remove the key
                    storage.delete(key);
                  }
                } catch (error) {
                  // Restore original value on transformation error
                  storage.setObject(key, originalValue);
                  const sanitizedKey = key.length > 50 ? '[LONG_KEY]' : '[KEY_SANITIZED]';
                  throw new Error(`Failed to transform key '${sanitizedKey}' in namespace '${namespace}': ${sanitizeErrorMessage(error.message)}`);
                }
              }
            }
            
            // Allow event loop to process between batches
            await new Promise(resolve => setTimeout(resolve, 0));
          }
          
          rollbackData[namespace] = rollbackDataForNamespace;
        }

        return { rollbackData, warnings };
      } catch (error) {
        throw new MigrationExecutionError(
          this.id,
          'Failed to execute data migration',
          error as Error
        );
      }
    });

    return this.createSuccessResult(timeMs, result.rollbackData, result.warnings);
  }

  async down(context: MigrationContext): Promise<MigrationResult> {
    const { result, timeMs } = await this.measureExecutionTime(async () => {
      try {
        const rollbackData = context.rollbackData;
        
        if (!rollbackData) {
          throw new Error('No rollback data available for data migration');
        }

        // Restore original data for each namespace
        for (const namespace of this.affectedNamespaces) {
          const storage = this.getStorageForNamespace(namespace);
          const originalData = rollbackData[namespace];
          
          if (!originalData) {
            continue; // No original data for this namespace
          }

          // Clear current data in namespace
          const currentKeys = storage.getAllKeys();
          for (const key of currentKeys) {
            storage.delete(key);
          }

          // Restore original data
          for (const [key, value] of Object.entries(originalData)) {
            if (value !== undefined) {
              storage.setObject(key, value);
            }
          }
        }

        return {};
      } catch (error) {
        throw new MigrationExecutionError(
          this.id,
          `Failed to rollback data migration: ${error.message}`,
          error as Error
        );
      }
    });

    return this.createSuccessResult(timeMs);
  }

  // Get the appropriate storage wrapper for a namespace
  private getStorageForNamespace(namespace: string) {
    switch (namespace) {
      case 'cache':
      case 'temp':
        return cacheStorageWrapper;
      case 'preferences':
      case 'settings':
        return userPreferencesStorageWrapper;
      default:
        return appStorageWrapper;
    }
  }

  // Helper method to safely parse JSON data
  protected safeJsonParse(data: any, fallback: any = null): any {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return fallback;
      }
    }
    return data;
  }

  // Helper method to migrate object structure
  protected migrateObjectStructure(
    data: any,
    fieldMappings: { [oldField: string]: string | null },
    defaultValues: { [field: string]: any } = {}
  ): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const migrated: any = { ...defaultValues };

    // Apply field mappings
    for (const [oldField, newField] of Object.entries(fieldMappings)) {
      if (Object.prototype.hasOwnProperty.call(data, oldField)) {
        if (newField === null) {
          // Field is being removed, don't copy
          continue;
        } else if (newField) {
          // Field is being renamed
          migrated[newField] = data[oldField];
        } else {
          // Field keeps the same name
          migrated[oldField] = data[oldField];
        }
      }
    }

    // Copy any unmapped fields
    for (const [field, value] of Object.entries(data)) {
      if (!Object.prototype.hasOwnProperty.call(fieldMappings, field) && !Object.prototype.hasOwnProperty.call(migrated, field)) {
        migrated[field] = value;
      }
    }

    return migrated;
  }
}

