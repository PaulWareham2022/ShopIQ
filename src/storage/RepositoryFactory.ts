/**
 * Repository Factory
 * Central factory for creating and managing all repository instances
 * Provides unified access to both SQL and key-value storage systems
 */

import {
  IRepositoryFactory,
  Repository,
  IKeyValueRepository,
  Transaction,
  StorageConfig,
  StorageError,
} from './types';

// Repository implementations
import { SupplierRepository } from './repositories/SupplierRepository';
import { InventoryItemRepository } from './repositories/InventoryItemRepository';
import { EnhancedOfferRepository } from './repositories/EnhancedOfferRepository';
import { HistoricalPriceRepository } from './repositories/HistoricalPriceRepository';
import {
  Supplier,
  InventoryItem,
  Offer,
  HistoricalPrice,
  UnitConversion,
  Bundle,
} from './types';
import { KeyValueRepository } from './repositories/base/KeyValueRepository';

// Storage layer imports
import { initializeDatabase, executeSql } from './sqlite/database';
import {
  appStorageWrapper,
  cacheStorageWrapper,
  userPreferencesStorageWrapper,
} from './mmkv/storage';

// Entity types are now imported from './types'

// Simple transaction implementation
class SQLiteTransaction implements Transaction {
  private committed = false;
  private rolledBack = false;

  async commit(): Promise<void> {
    if (this.rolledBack) {
      throw new StorageError(
        'Cannot commit a rolled back transaction',
        'TRANSACTION_ERROR'
      );
    }
    if (this.committed) {
      throw new StorageError(
        'Transaction already committed',
        'TRANSACTION_ERROR'
      );
    }

    try {
      await executeSql('COMMIT');
      this.committed = true;
    } catch (error) {
      throw new StorageError(
        'Failed to commit transaction',
        'TRANSACTION_COMMIT_ERROR',
        error as Error
      );
    }
  }

  async rollback(): Promise<void> {
    if (this.committed) {
      throw new StorageError(
        'Cannot rollback a committed transaction',
        'TRANSACTION_ERROR'
      );
    }
    if (this.rolledBack) {
      throw new StorageError(
        'Transaction already rolled back',
        'TRANSACTION_ERROR'
      );
    }

    try {
      await executeSql('ROLLBACK');
      this.rolledBack = true;
    } catch (error) {
      throw new StorageError(
        'Failed to rollback transaction',
        'TRANSACTION_ROLLBACK_ERROR',
        error as Error
      );
    }
  }

  async executeSql(sql: string, params?: any[]): Promise<any> {
    if (this.committed || this.rolledBack) {
      throw new StorageError(
        'Cannot execute SQL on completed transaction',
        'TRANSACTION_ERROR'
      );
    }

    try {
      return await executeSql(sql, params);
    } catch (error) {
      // Auto-rollback on error
      try {
        await this.rollback();
      } catch {
        // Ignore rollback errors
      }
      throw error;
    }
  }
}

export class RepositoryFactory implements IRepositoryFactory {
  private static instance: RepositoryFactory | null = null;
  private initialized = false;
  private config: StorageConfig;

  // Repository instances (lazy-loaded)
  private supplierRepository: SupplierRepository | null = null;
  private inventoryItemRepository: InventoryItemRepository | null = null;
  private offerRepository: EnhancedOfferRepository | null = null;
  private historicalPriceRepository: HistoricalPriceRepository | null = null;
  // TODO: Add other repositories as they are implemented
  // private unitConversionRepository: UnitConversionRepository | null = null;
  // private bundleRepository: BundleRepository | null = null;

  // Key-value repository instances
  private keyValueRepositories: Map<string, KeyValueRepository> = new Map();

  private constructor(config?: Partial<StorageConfig>) {
    this.config = {
      databaseName: 'shopiq.db',
      version: 1,
      encryption: false,
      ...config,
    };
  }

  /**
   * Get singleton instance of RepositoryFactory
   */
  static getInstance(config?: Partial<StorageConfig>): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory(config);
    }
    return RepositoryFactory.instance;
  }

  /**
   * Initialize the storage systems
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize SQLite database
      await initializeDatabase();

      // Initialize and run migrations
      await this.initializeMigrations();

      this.initialized = true;

      if (__DEV__) {
        console.log('🏭 RepositoryFactory initialized successfully');
      }
    } catch (error) {
      throw new StorageError(
        'Failed to initialize storage systems',
        'INITIALIZATION_ERROR',
        error as Error
      );
    }
  }

  /**
   * Initialize the migration system and run pending migrations
   * Currently disabled to avoid issues with example migrations
   */
  private async initializeMigrations(): Promise<void> {
    try {
      // Import migration system
      const {
        initializeMigrationSystem,
        runStartupMigrations,
        getMigrationSystemStatus,
      } = await import('./migrations');

      // Initialize migration system
      await initializeMigrationSystem();

      // Run pending migrations
      const migrationResult = await runStartupMigrations();

      if (!migrationResult.success) {
        const errorMessage = `Migration failed: ${migrationResult.errors.join('; ')}`;

        if (__DEV__) {
          console.error(
            '[RepositoryFactory] Migration errors:',
            migrationResult.errors
          );
        }

        throw new StorageError(errorMessage, 'MIGRATION_ERROR');
      }

      // Log migration status in development
      if (__DEV__ && migrationResult.results.length > 0) {
        const status = await getMigrationSystemStatus();
        console.log('[RepositoryFactory] Migration status:', {
          migrationsExecuted: migrationResult.results.length,
          currentVersions: status.versions,
          pendingMigrations: status.pending,
        });
      }
    } catch (error) {
      // Re-throw migration errors
      if (error instanceof StorageError) {
        throw error;
      }

      throw new StorageError(
        'Failed to initialize migration system',
        'MIGRATION_INIT_ERROR',
        error as Error
      );
    }
  }

  /**
   * Ensure the factory is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // Repository getters

  async getSupplierRepository(): Promise<Repository<Supplier>> {
    await this.ensureInitialized();

    if (!this.supplierRepository) {
      this.supplierRepository = new SupplierRepository();
    }
    return this.supplierRepository;
  }

  async getInventoryItemRepository(): Promise<Repository<InventoryItem>> {
    await this.ensureInitialized();

    if (!this.inventoryItemRepository) {
      this.inventoryItemRepository = new InventoryItemRepository();
    }
    return this.inventoryItemRepository;
  }

  async getOfferRepository(): Promise<Repository<Offer>> {
    await this.ensureInitialized();

    if (!this.offerRepository) {
      this.offerRepository = new EnhancedOfferRepository(this);
    }
    return this.offerRepository;
  }

  async getUnitConversionRepository(): Promise<Repository<UnitConversion>> {
    await this.ensureInitialized();
    throw new StorageError(
      'UnitConversionRepository not yet implemented',
      'NOT_IMPLEMENTED'
    );
  }

  async getBundleRepository(): Promise<Repository<Bundle>> {
    await this.ensureInitialized();
    throw new StorageError(
      'BundleRepository not yet implemented',
      'NOT_IMPLEMENTED'
    );
  }

  async getHistoricalPriceRepository(): Promise<Repository<HistoricalPrice>> {
    await this.ensureInitialized();

    if (!this.historicalPriceRepository) {
      this.historicalPriceRepository = new HistoricalPriceRepository();
    }
    return this.historicalPriceRepository;
  }

  getKeyValueRepository(namespace: string = 'default'): IKeyValueRepository {
    // Key-value repositories don't require async initialization
    if (!this.keyValueRepositories.has(namespace)) {
      let storage;

      // Choose storage based on namespace
      switch (namespace) {
        case 'cache':
        case 'temp':
          storage = cacheStorageWrapper;
          break;
        case 'preferences':
        case 'settings':
          storage = userPreferencesStorageWrapper;
          break;
        default:
          storage = appStorageWrapper;
          break;
      }

      const repo = new KeyValueRepository(storage, namespace);
      this.keyValueRepositories.set(namespace, repo);
    }

    return this.keyValueRepositories.get(namespace)!;
  }

  // Transaction support

  async beginTransaction(): Promise<Transaction> {
    await this.ensureInitialized();

    try {
      await executeSql('BEGIN TRANSACTION');
      return new SQLiteTransaction();
    } catch (error) {
      throw new StorageError(
        'Failed to begin transaction',
        'TRANSACTION_BEGIN_ERROR',
        error as Error
      );
    }
  }

  /**
   * Execute multiple operations in a transaction
   * Automatically commits on success or rolls back on error
   */
  async withTransaction<T>(
    operation: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    const transaction = await this.beginTransaction();

    try {
      const result = await operation(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        // Log rollback failure with context and original error, then rethrow original
        if (__DEV__) {
          console.error(
            'Failed to rollback transaction after operation error:',
            {
              originalError: error,
              rollbackError: rollbackError,
            }
          );
        }
        // Ensure proper cleanup - transaction state should be marked as failed
        // The SQLiteTransaction class handles its own state, so no additional cleanup needed here
      }
      throw error;
    }
  }

  // Utility methods

  /**
   * Get storage configuration
   */
  getConfig(): StorageConfig {
    return { ...this.config };
  }

  /**
   * Check if factory is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset factory (for testing purposes)
   */
  static reset(): void {
    RepositoryFactory.instance = null;
  }

  /**
   * Get storage statistics across all systems
   */
  async getStorageStats(): Promise<{
    database: {
      version: number;
      tableCount: number;
    };
    keyValue: {
      namespaces: string[];
      totalKeys: number;
    };
    migrations?: {
      versions: { database: number; data: number };
      pending: number;
      registry: { total: number; database: number; data: number };
      history: { executed: number; failed: number; rolledBack: number };
    };
  }> {
    await this.ensureInitialized();

    try {
      // Get database stats
      const tablesResult = await executeSql(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'"
      );
      const versionResult = await executeSql(
        "SELECT value FROM database_metadata WHERE key = 'version'"
      );

      // Get key-value stats
      const namespaces = Array.from(this.keyValueRepositories.keys());
      let totalKeys = 0;

      namespaces.forEach(namespace => {
        const repo = this.keyValueRepositories.get(namespace);
        if (repo) {
          totalKeys += repo.count();
        }
      });

      const stats = {
        database: {
          version:
            versionResult.rows.length > 0
              ? parseInt(versionResult.rows.item(0).value, 10)
              : 0,
          tableCount: tablesResult.rows.item(0).count,
        },
        keyValue: {
          namespaces,
          totalKeys,
        },
      };

      // Add migration stats if available
      try {
        const { getMigrationSystemStatus } = await import('./migrations');
        const migrationStatus = await getMigrationSystemStatus();
        (stats as any).migrations = migrationStatus;
      } catch (migrationError) {
        // Migration system might not be initialized, skip migration stats
        if (__DEV__) {
          console.warn(
            '[RepositoryFactory] Could not get migration stats:',
            migrationError
          );
        }
      }

      return stats;
    } catch (error) {
      throw new StorageError(
        'Failed to get storage statistics',
        'STATS_ERROR',
        error as Error
      );
    }
  }

  /**
   * Get migration system components (for advanced usage)
   */
  async getMigrationSystem(): Promise<{
    manager: any;
    registry: any;
    versionTracker: any;
  } | null> {
    await this.ensureInitialized();

    try {
      const { migrationManager, migrationRegistry, versionTracker } =
        await import('./migrations');
      return {
        manager: migrationManager,
        registry: migrationRegistry,
        versionTracker,
      };
    } catch (error) {
      if (__DEV__) {
        console.warn(
          '[RepositoryFactory] Migration system not available:',
          error
        );
      }
      return null;
    }
  }
}

// Export convenience function for getting the factory instance
export const getRepositoryFactory = (
  config?: Partial<StorageConfig>
): RepositoryFactory => {
  return RepositoryFactory.getInstance(config);
};

// Export a default instance for simple usage
export const repositories = RepositoryFactory.getInstance();
