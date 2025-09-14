/**
 * Migration System Main Export
 * Provides a complete migration system for SQLite and MMKV storage
 */

// Core types and interfaces
export * from './types';

// Base classes for creating migrations
export {
  BaseMigration,
  DatabaseMigration,
  DataMigration,
} from './BaseMigration';

// Import for internal use
import { DatabaseMigration, DataMigration } from './BaseMigration';

// Core system components
export { VersionTracker, versionTracker } from './VersionTracker';
export { MigrationRegistry, migrationRegistry } from './MigrationRegistry';
export { MigrationManager, migrationManager } from './MigrationManager';

// Example migrations (for reference)
export { migration001 } from './examples/001_add_supplier_contact_info';
export { migration001Data } from './examples/001_migrate_user_preferences_v2';

// Production migrations
export { migration002 } from './002_add_supplier_rating';
export { migration003 } from './003_add_product_variants_table';
// Temporarily disable migration004 for fresh installs
// export { migration004 } from './004_rename_inventory_items_to_products';

// Convenience functions for setting up migrations
import { migrationRegistry } from './MigrationRegistry';
import { migrationManager } from './MigrationManager';
import { versionTracker } from './VersionTracker';

/**
 * Initialize the migration system and register default migrations
 * Call this during app startup after storage initialization
 */
export const initializeMigrationSystem = async (): Promise<void> => {
  try {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[Migration System] Initializing...');
    }

    // Only import migrations in development or when explicitly enabled
    // In production, empty migration system is safer unless explicitly needed
    const shouldImportMigrations =
      (typeof __DEV__ !== 'undefined' && __DEV__) ||
      process.env.ENABLE_MIGRATIONS === 'true';

    if (shouldImportMigrations) {
      try {
        // Import and register all migrations
        // Note: In a real app, you'd import all your migration files here
        const { migration001 } = await import(
          './examples/001_add_supplier_contact_info'
        );
        const { migration001Data } = await import(
          './examples/001_migrate_user_preferences_v2'
        );
        const { migration002 } = await import(
          './002_add_supplier_rating'
        );
        // Temporarily disable migration003 for fresh installs
        // const { migration003 } = await import(
        //   './003_add_product_variants_table'
        // );
        // Temporarily disable migration004 for fresh installs
        // const { migration004 } = await import(
        //   './004_rename_inventory_items_to_products'
        // );

        // Register migrations with error handling
        migrationRegistry.register(migration001);
        migrationRegistry.register(migration001Data);
        migrationRegistry.register(migration002);
        // Temporarily disable migration003 and migration004 for fresh installs
        // migrationRegistry.register(migration003);
        // migrationRegistry.register(migration004);
      } catch (importError) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn(
            '[Migration System] Failed to import example migrations:',
            importError
          );
        }
        // Don't fail initialization if example migrations can't be imported
      }
    }

    // Validate the migration chain
    const validation = await migrationManager.validateMigrationChain();
    if (!validation.valid) {
      throw new Error(
        `Migration chain validation failed: ${validation.errors.join('; ')}`
      );
    }

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      const stats = migrationRegistry.getStats();
      console.log('[Migration System] Initialized successfully', {
        totalMigrations: stats.total,
        databaseMigrations: stats.database,
        dataMigrations: stats.data,
      });
    }
  } catch (error) {
    console.error('[Migration System] Initialization failed:', error);
    throw error;
  }
};

/**
 * Run all pending migrations
 * Call this during app startup after initializing the migration system
 */
export const runStartupMigrations = async (): Promise<{
  success: boolean;
  results: any[];
  errors: string[];
}> => {
  try {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[Migration System] Running startup migrations...');
    }

    // Get current versions for logging
    const versions = await migrationManager.getCurrentVersions();
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[Migration System] Current versions:', versions);
    }

    // Run pending migrations
    const results = await migrationManager.runPendingMigrations();

    const errors = results
      .filter(r => !r.success)
      .map(r => `${r.migrationId}: ${r.error?.message || 'Unknown error'}`);

    const success = errors.length === 0;

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      const finalVersions = await migrationManager.getCurrentVersions();
      console.log('[Migration System] Startup migrations complete', {
        success,
        totalResults: results.length,
        errors: errors.length,
        initialVersions: versions,
        finalVersions,
      });
    }

    return { success, results, errors };
  } catch (error) {
    console.error('[Migration System] Startup migration failed:', error);
    return {
      success: false,
      results: [],
      errors: [error.message || 'Unknown error'],
    };
  }
};

/**
 * Get migration system status and statistics
 */
export const getMigrationSystemStatus = async (): Promise<{
  versions: { database: number; data: number };
  pending: number;
  registry: { total: number; database: number; data: number };
  history: { executed: number; failed: number; rolledBack: number };
  isRunning: boolean;
}> => {
  const [versions, stats] = await Promise.all([
    migrationManager.getCurrentVersions(),
    migrationManager.getMigrationStats(),
  ]);

  const pendingMigrations = migrationRegistry.getPendingMigrations(
    versions.database,
    versions.data
  );

  return {
    versions,
    pending: pendingMigrations.length,
    registry: stats.registry,
    history: stats.history,
    isRunning: migrationManager.isRunningMigrations(),
  };
};

/**
 * Reset all migrations (useful for testing or complete reset)
 * ⚠️ WARNING: This will reset all version tracking and migration history
 */
export const resetMigrationSystem = async (): Promise<void> => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[Migration System] Resetting all migrations and history');
  }

  // Reset version tracking
  await versionTracker.resetAllVersions();

  // Clear registry execution state
  const allMigrations = migrationRegistry.getAllMigrations();
  for (const entry of allMigrations) {
    migrationRegistry.markAsNotExecuted(entry.migration.id);
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[Migration System] Reset complete');
  }
};

/**
 * Utility function to create a simple database migration
 */
export const createDatabaseMigration = (config: {
  id: string;
  version: number;
  description: string;
  upSql: string[];
  downSql: string[];
  webSql?: string[];
  nativeSql?: string[];
  webDownSql?: string[];
  nativeDownSql?: string[];
  dependencies?: string[];
}) => {
  class CustomDatabaseMigration extends DatabaseMigration {
    readonly id = config.id;
    readonly version = config.version;
    readonly description = config.description;
    readonly upSql = config.upSql;
    readonly downSql = config.downSql;
    readonly webSql = config.webSql;
    readonly nativeSql = config.nativeSql;
    readonly webDownSql = config.webDownSql;
    readonly nativeDownSql = config.nativeDownSql;
    readonly dependencies = config.dependencies;
  }

  return new CustomDatabaseMigration();
};

/**
 * Utility function to create a simple data migration
 */
export const createDataMigration = (config: {
  id: string;
  version: number;
  description: string;
  affectedNamespaces: string[];
  transformUp: (data: any) => any;
  transformDown: (data: any) => any;
  dependencies?: string[];
}) => {
  class CustomDataMigration extends DataMigration {
    readonly id = config.id;
    readonly version = config.version;
    readonly description = config.description;
    readonly affectedNamespaces = config.affectedNamespaces;
    readonly dependencies = config.dependencies;

    async transformUp(data: any): Promise<any> {
      return config.transformUp(data);
    }

    async transformDown(data: any): Promise<any> {
      return config.transformDown(data);
    }
  }

  return new CustomDataMigration();
};
