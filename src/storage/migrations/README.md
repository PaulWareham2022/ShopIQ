# Migration System Documentation

The ShopIQ migration system provides a robust way to handle schema changes in SQLite and data structure changes in MMKV storage. It supports automatic migration execution, rollback capabilities, and comprehensive error handling.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Creating Migrations](#creating-migrations)
- [Migration Types](#migration-types)
- [Version Management](#version-management)
- [Error Handling](#error-handling)
- [Testing Migrations](#testing-migrations)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)

## Overview

The migration system consists of several key components:

- **Migration Types**: Database (SQLite schema) and Data (MMKV structure) migrations
- **Version Tracking**: Separate version tracking for database and data migrations
- **Registry**: Manages all registered migrations and their execution state
- **Manager**: Coordinates migration execution and rollback operations
- **Error Handling**: Comprehensive error handling with rollback capabilities

## Quick Start

### 1. Automatic Initialization

The migration system is automatically initialized when you initialize the Repository Factory:

```typescript
import { repositories } from '@/storage';

// This will automatically run pending migrations
await repositories.initialize();
```

### 2. Manual Migration Management

For more control over migration execution:

```typescript
import { 
  initializeMigrationSystem,
  runStartupMigrations,
  getMigrationSystemStatus,
  migrationManager 
} from '@/storage/migrations';

// Initialize the migration system
await initializeMigrationSystem();

// Run pending migrations
const result = await runStartupMigrations();

if (!result.success) {
  console.error('Migration failed:', result.errors);
}

// Get migration status
const status = await getMigrationSystemStatus();
console.log('Current versions:', status.versions);
```

## Creating Migrations

### Database Migrations

Database migrations handle SQLite schema changes like adding tables, columns, or indexes.

```typescript
// src/storage/migrations/002_add_inventory_categories.ts
import { DatabaseMigration, MigrationType } from '../types';

export class AddInventoryCategoriesMigration extends DatabaseMigration {
  readonly id = '002_add_inventory_categories';
  readonly version = 3; // Next database version
  readonly type = MigrationType.DATABASE;
  readonly description = 'Add categories table and link to inventory items';

  readonly upSql = [
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );`,
    
    'ALTER TABLE inventory_items ADD COLUMN category_id TEXT;',
    
    'CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items (category_id);',
    
    // Add foreign key constraint (if supported)
    `UPDATE database_metadata SET value = '3' WHERE key = 'version';`
  ];

  readonly downSql = [
    'DROP INDEX IF EXISTS idx_inventory_category;',
    
    // Note: SQLite doesn't support DROP COLUMN easily
    // In production, you might need to recreate the table
    'UPDATE inventory_items SET category_id = NULL;',
    
    'DROP TABLE IF EXISTS categories;',
    
    `UPDATE database_metadata SET value = '2' WHERE key = 'version';`
  ];

  // Platform-specific SQL (optional)
  readonly nativeDownSql = [
    'DROP INDEX IF EXISTS idx_inventory_category;',
    
    // Full table recreation for proper column removal on native
    `CREATE TABLE inventory_items_backup AS SELECT 
       id, name, canonical_unit, shelf_life_sensitive, notes,
       created_at, updated_at, deleted_at
     FROM inventory_items;`,
    
    'DROP TABLE inventory_items;',
    
    `CREATE TABLE inventory_items (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      canonical_unit TEXT NOT NULL,
      shelf_life_sensitive INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );`,
    
    `INSERT INTO inventory_items SELECT * FROM inventory_items_backup;`,
    'DROP TABLE inventory_items_backup;',
    'DROP TABLE IF EXISTS categories;'
  ];
}

// Export the migration instance
export const migration002 = new AddInventoryCategoriesMigration();
```

### Data Migrations

Data migrations handle changes to data structures stored in MMKV.

```typescript
// src/storage/migrations/002_migrate_cache_format.ts
import { DataMigration, MigrationType, MigrationContext } from '../types';

export class MigrateCacheFormatMigration extends DataMigration {
  readonly id = '002_migrate_cache_format';
  readonly version = 2; // Next data version
  readonly type = MigrationType.DATA;
  readonly description = 'Migrate cache format to include timestamps and metadata';
  
  readonly affectedNamespaces = ['cache'];

  async transformUp(data: any, context: MigrationContext): Promise<any> {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Check if already in new format
    if (data._metadata && data._metadata.version === 2) {
      return data;
    }

    // Transform to new format
    return {
      data: data, // Wrap existing data
      _metadata: {
        version: 2,
        createdAt: context.timestamp,
        migratedAt: context.timestamp,
        originalFormat: 1,
      },
    };
  }

  async transformDown(data: any, context: MigrationContext): Promise<any> {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Check if in new format
    if (data._metadata && data._metadata.version === 2) {
      // Extract the original data
      return data.data || {};
    }

    // Already in old format
    return data;
  }
}

export const migration002Data = new MigrateCacheFormatMigration();
```

### Using Helper Functions

For simple migrations, you can use the helper functions:

```typescript
import { createDatabaseMigration, createDataMigration } from '@/storage/migrations';

// Simple database migration
const addIndexMigration = createDatabaseMigration({
  id: '003_add_supplier_indexes',
  version: 4,
  description: 'Add performance indexes to suppliers table',
  upSql: [
    'CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers (name);',
    'CREATE INDEX IF NOT EXISTS idx_suppliers_rating ON suppliers (quality_rating);'
  ],
  downSql: [
    'DROP INDEX IF EXISTS idx_suppliers_name;',
    'DROP INDEX IF EXISTS idx_suppliers_rating;'
  ]
});

// Simple data migration
const renameFieldMigration = createDataMigration({
  id: '003_rename_theme_field',
  version: 3,
  description: 'Rename theme field to uiTheme',
  affectedNamespaces: ['preferences'],
  transformUp: (data) => {
    if (data?.theme) {
      const { theme, ...rest } = data;
      return { ...rest, uiTheme: theme };
    }
    return data;
  },
  transformDown: (data) => {
    if (data?.uiTheme) {
      const { uiTheme, ...rest } = data;
      return { ...rest, theme: uiTheme };
    }
    return data;
  }
});
```

## Migration Types

### Database Migrations

- **Purpose**: Handle SQLite schema changes
- **Supported Operations**: CREATE/DROP TABLE, ADD/DROP COLUMN, CREATE/DROP INDEX, etc.
- **Transaction Support**: Automatic transaction wrapping
- **Platform Differences**: Support for platform-specific SQL (Web vs Native)

### Data Migrations  

- **Purpose**: Handle MMKV data structure changes
- **Affected Namespaces**: Specify which storage namespaces to transform
- **Rollback Data**: Automatic backup of original data for rollback
- **Transformation**: Custom transform functions for up/down migrations

## Version Management

The system maintains separate version counters:

- **Database Version**: Tracks SQLite schema version (stored in `database_metadata` table)
- **Data Version**: Tracks MMKV data format version (stored in MMKV app storage)

### Version Rules

1. **Sequential Versions**: Versions must be sequential integers starting from 1
2. **No Gaps**: Don't skip version numbers
3. **No Duplicates**: Each version number can only be used once per type
4. **Backward Compatibility**: Higher versions should be backward compatible when possible

## Error Handling

### Automatic Rollback

- **Database Migrations**: Automatic transaction rollback on error
- **Data Migrations**: Automatic restoration of original data on error
- **Chain Failures**: Option to stop or continue on individual migration failures

### Error Types

```typescript
import { 
  MigrationError,
  MigrationValidationError,
  MigrationExecutionError,
  MigrationRollbackError 
} from '@/storage/migrations';

try {
  await migrationManager.runPendingMigrations();
} catch (error) {
  if (error instanceof MigrationValidationError) {
    console.error('Migration validation failed:', error.message);
  } else if (error instanceof MigrationExecutionError) {
    console.error('Migration execution failed:', error.message);
    console.error('Migration ID:', error.migrationId);
  }
}
```

### Configuration

```typescript
import { MigrationManager } from '@/storage/migrations';

const migrationManager = new MigrationManager({
  continueOnError: false, // Stop on first error
  enableRollback: true,   // Allow rollback operations
  migrationTimeout: 30000, // 30 second timeout
  maxRetryAttempts: 3,    // Retry failed migrations
});
```

## Testing Migrations

### Unit Testing

```typescript
import { migration002 } from '../002_add_inventory_categories';
import { MigrationContext, MigrationType } from '../types';

describe('AddInventoryCategoriesMigration', () => {
  let mockContext: MigrationContext;
  let mockTransaction: any;

  beforeEach(() => {
    mockTransaction = {
      executeSql: jest.fn().mockResolvedValue({}),
    };
    
    mockContext = {
      currentDatabaseVersion: 2,
      currentDataVersion: 1,
      targetDatabaseVersion: 3,
      targetDataVersion: 1,
      migrationId: migration002.id,
      timestamp: '2024-01-01T00:00:00.000Z',
      transaction: mockTransaction,
    };
  });

  it('should execute up migration successfully', async () => {
    const result = await migration002.up(mockContext);
    
    expect(result.success).toBe(true);
    expect(mockTransaction.executeSql).toHaveBeenCalledTimes(4);
  });

  it('should execute down migration successfully', async () => {
    const result = await migration002.down(mockContext);
    
    expect(result.success).toBe(true);
    expect(mockTransaction.executeSql).toHaveBeenCalledTimes(4);
  });
});
```

### Integration Testing

```typescript
import { 
  migrationManager,
  migrationRegistry,
  versionTracker,
  resetMigrationSystem 
} from '@/storage/migrations';

describe('Migration System Integration', () => {
  beforeEach(async () => {
    // Reset migration state
    await resetMigrationSystem();
  });

  it('should run migrations in correct order', async () => {
    // Register migrations
    migrationRegistry.register(migration001);
    migrationRegistry.register(migration002);
    
    // Run migrations
    const results = await migrationManager.runPendingMigrations();
    
    // Verify results
    expect(results).toHaveLength(2);
    expect(results.every(r => r.success)).toBe(true);
    
    // Verify versions
    const versions = await versionTracker.getCurrentVersions();
    expect(versions.database).toBe(3);
  });
});
```

## Best Practices

### 1. Migration Naming

```typescript
// Good naming convention
// Format: {number}_{descriptive_name}
'001_add_supplier_contact_info'
'002_create_categories_table' 
'003_migrate_user_preferences_v2'

// Include version number and clear description
```

### 2. Safe Schema Changes

```typescript
// ✅ Safe operations
- CREATE TABLE IF NOT EXISTS
- ALTER TABLE ADD COLUMN (with DEFAULT)
- CREATE INDEX IF NOT EXISTS
- INSERT OR IGNORE

// ⚠️ Potentially unsafe operations  
- DROP TABLE (consider soft delete)
- ALTER TABLE DROP COLUMN (SQLite limitation)
- Changing column types
- Removing NOT NULL constraints
```

### 3. Data Migration Safety

```typescript
// ✅ Good practices
async transformUp(data: any, context: MigrationContext): Promise<any> {
  // Always check data existence
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Check if already migrated
  if (data.version === 2) {
    return data;
  }

  // Preserve unknown fields
  const { knownField, ...rest } = data;
  
  return {
    newField: knownField,
    version: 2,
    ...rest // Preserve other fields
  };
}
```

### 4. Testing Strategy

```typescript
// Test both directions
describe('Migration', () => {
  it('should migrate up correctly', async () => {
    const original = { theme: 'dark' };
    const migrated = await migration.transformUp(original, context);
    expect(migrated.ui.theme).toBe('dark');
  });

  it('should rollback correctly', async () => {
    const migrated = { ui: { theme: 'dark' }, version: 2 };
    const rolledBack = await migration.transformDown(migrated, context);
    expect(rolledBack.theme).toBe('dark');
  });

  it('should be idempotent', async () => {
    const data = { theme: 'dark' };
    const first = await migration.transformUp(data, context);
    const second = await migration.transformUp(first, context);
    expect(first).toEqual(second);
  });
});
```

## API Reference

### Core Classes

- `DatabaseMigration` - Base class for database schema migrations
- `DataMigration` - Base class for data structure migrations  
- `MigrationManager` - Coordinates migration execution
- `MigrationRegistry` - Manages migration registration
- `VersionTracker` - Handles version tracking and history

### Main Functions

- `initializeMigrationSystem()` - Initialize and register migrations
- `runStartupMigrations()` - Run all pending migrations
- `getMigrationSystemStatus()` - Get current migration status
- `resetMigrationSystem()` - Reset all migrations (testing)

### Helper Functions

- `createDatabaseMigration(config)` - Create simple database migration
- `createDataMigration(config)` - Create simple data migration

### Configuration Options

```typescript
interface MigrationConfig {
  enableAutoMigration: boolean;     // Run migrations automatically
  enableRollback: boolean;          // Allow rollback operations  
  maxConcurrentMigrations: number;  // Concurrent migration limit
  migrationTimeout: number;         // Timeout per migration (ms)
  continueOnError: boolean;         // Continue on migration failures
  retryFailedMigrations: boolean;   // Retry failed migrations
  maxRetryAttempts: number;         // Max retry attempts
  enableDetailedLogging: boolean;   // Detailed logging
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}
```

For more detailed information, refer to the type definitions in `types.ts` and the example migrations in the `examples/` directory.

