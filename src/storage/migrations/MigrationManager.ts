/**
 * Migration Manager Implementation
 * Coordinates the execution of database and data migrations
 */

import {
  MigrationManager as IMigrationManager,
  MigrationResult,
  MigrationContext,
  MigrationType,
  MigrationConfig,
  DEFAULT_MIGRATION_CONFIG,
  Migration,
  MigrationError,
  MigrationExecutionError,
  MigrationValidationError,
} from './types';
import { MigrationRegistry } from './MigrationRegistry';
import { VersionTracker } from './VersionTracker';
import { Transaction } from '../types';

export class MigrationManager implements IMigrationManager {
  private config: MigrationConfig;
  private registry: MigrationRegistry;
  private versionTracker: VersionTracker;
  private isRunning = false;

  constructor(
    config: Partial<MigrationConfig> = {},
    registry?: MigrationRegistry,
    versionTracker?: VersionTracker
  ) {
    this.config = { ...DEFAULT_MIGRATION_CONFIG, ...config };
    this.registry = registry || new MigrationRegistry();
    this.versionTracker = versionTracker || new VersionTracker(config);
  }

  // ===============================
  // Main Migration Execution
  // ===============================

  async runPendingMigrations(): Promise<MigrationResult[]> {
    if (this.isRunning) {
      throw new MigrationError(
        'Migration manager is already running',
        'migration_manager',
        'ALREADY_RUNNING'
      );
    }

    if (!this.config.enableAutoMigration) {
      if (this.config.enableDetailedLogging && __DEV__) {
        console.log('[MigrationManager] Auto-migration is disabled');
      }
      return [];
    }

    this.isRunning = true;

    try {
      // Get current versions
      const versions = await this.versionTracker.getCurrentVersions();
      
      if (this.config.enableDetailedLogging && __DEV__) {
        console.log(
          `[MigrationManager] Current versions - Database: ${versions.database}, Data: ${versions.data}`
        );
      }

      // Get pending migrations
      const pendingMigrations = this.registry.getPendingMigrations(
        versions.database,
        versions.data
      );

      if (pendingMigrations.length === 0) {
        if (this.config.enableDetailedLogging && __DEV__) {
          console.log('[MigrationManager] No pending migrations');
        }
        return [];
      }

      if (this.config.enableDetailedLogging && __DEV__) {
        console.log(
          `[MigrationManager] Found ${pendingMigrations.length} pending migrations:`,
          pendingMigrations.map(m => `${m.id} (v${m.version}, ${m.type})`)
        );
      }

      // Validate migration chain
      const validation = await this.validateMigrationChain();
      if (!validation.valid) {
        throw new MigrationValidationError('migration_manager', validation.errors.join('; '));
      }

      // Execute migrations
      const results: MigrationResult[] = [];

      for (const migration of pendingMigrations) {
        try {
          const result = await this.runMigration(migration.id);
          results.push(result);

          // Stop on failure if configured to do so
          if (!result.success && !this.config.continueOnError) {
            if (this.config.enableDetailedLogging && __DEV__) {
              console.error(
                `[MigrationManager] Stopping migration chain due to failure: ${migration.id}`
              );
            }
            break;
          }
        } catch (error) {
          const failureResult: MigrationResult = {
            success: false,
            migrationId: migration.id,
            executionTimeMs: 0,
            error: error as Error,
          };
          results.push(failureResult);

          if (!this.config.continueOnError) {
            break;
          }
        }
      }

      // Log final results
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      if (this.config.enableDetailedLogging && __DEV__) {
        console.log(
          `[MigrationManager] Migration batch complete - Success: ${successCount}, Failed: ${failureCount}`
        );
      }

      return results;
    } finally {
      this.isRunning = false;
    }
  }

  async runMigration(migrationId: string): Promise<MigrationResult> {
    const migration = this.registry.getMigration(migrationId);
    
    if (!migration) {
      throw new MigrationError(
        `Migration '${migrationId}' not found`,
        migrationId,
        'MIGRATION_NOT_FOUND'
      );
    }

    if (this.config.enableDetailedLogging && __DEV__) {
      console.log(
        `[MigrationManager] Starting migration: ${migration.id} (v${migration.version}, ${migration.type})`
      );
    }

    const startTime = Date.now();
    let context: MigrationContext;
    let transaction: Transaction | undefined;

    try {
      // Get current versions
      const versions = await this.versionTracker.getCurrentVersions();

      // Create migration context
      context = {
        currentDatabaseVersion: versions.database,
        currentDataVersion: versions.data,
        targetDatabaseVersion: migration.type === MigrationType.DATABASE ? migration.version : versions.database,
        targetDataVersion: migration.type === MigrationType.DATA ? migration.version : versions.data,
        migrationId: migration.id,
        timestamp: new Date().toISOString(),
      };

      // Check if migration can run
      const canRun = await migration.canRun(context);
      if (!canRun) {
        throw new MigrationValidationError(
          migration.id,
          'Migration prerequisites not met'
        );
      }

      // Create transaction for database migrations
      if (migration.type === MigrationType.DATABASE) {
        // Get transaction from RepositoryFactory
        const { getRepositoryFactory } = await import('../RepositoryFactory');
        const factory = getRepositoryFactory();
        transaction = await factory.beginTransaction();
        context.transaction = transaction;
      }

      // Execute migration with timeout
      const result = await this.executeWithTimeout(
        () => migration.up(context),
        this.config.migrationTimeout
      );

      // Commit transaction if successful
      if (transaction && result.success) {
        await transaction.commit();
      }

      // Update version tracking
      if (result.success) {
        if (migration.type === MigrationType.DATABASE) {
          await this.versionTracker.setDatabaseVersion(migration.version);
        } else {
          await this.versionTracker.setDataVersion(migration.version);
        }

        // Mark as executed in registry
        this.registry.markAsExecuted(migration.id, true, context.timestamp);
      }

      // Record execution in history
      await this.versionTracker.recordMigrationExecution(migration, result);

      if (this.config.enableDetailedLogging && __DEV__) {
        const duration = Date.now() - startTime;
        console.log(
          `[MigrationManager] Migration ${result.success ? 'completed' : 'failed'}: ${migration.id} (${duration}ms)`
        );
      }

      return result;
    } catch (error) {
      // Rollback transaction on error
      if (transaction) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          if (this.config.enableDetailedLogging && __DEV__) {
            console.error('[MigrationManager] Transaction rollback failed:', rollbackError);
          }
        }
      }

      const executionTime = Date.now() - startTime;
      const failureResult: MigrationResult = {
        success: false,
        migrationId: migration.id,
        executionTimeMs: executionTime,
        error: error as Error,
      };

      // Record failed execution
      await this.versionTracker.recordMigrationExecution(migration, failureResult);

      if (this.config.enableDetailedLogging && __DEV__) {
        console.error(`[MigrationManager] Migration failed: ${migration.id}`, error);
      }

      return failureResult;
    }
  }

  // ===============================
  // Rollback Operations
  // ===============================

  async rollbackMigration(migrationId: string): Promise<MigrationResult> {
    if (!this.config.enableRollback) {
      throw new MigrationError(
        'Rollback is disabled in configuration',
        migrationId,
        'ROLLBACK_DISABLED'
      );
    }

    const migration = this.registry.getMigration(migrationId);
    
    if (!migration) {
      throw new MigrationError(
        `Migration '${migrationId}' not found`,
        migrationId,
        'MIGRATION_NOT_FOUND'
      );
    }

    if (this.config.enableDetailedLogging && __DEV__) {
      console.log(`[MigrationManager] Starting rollback: ${migration.id}`);
    }

    const startTime = Date.now();
    let context: MigrationContext;
    let transaction: Transaction | undefined;

    try {
      // Get current versions
      const versions = await this.versionTracker.getCurrentVersions();

      // Create rollback context
      context = {
        currentDatabaseVersion: versions.database,
        currentDataVersion: versions.data,
        targetDatabaseVersion: migration.type === MigrationType.DATABASE ? migration.version - 1 : versions.database,
        targetDataVersion: migration.type === MigrationType.DATA ? migration.version - 1 : versions.data,
        migrationId: migration.id,
        timestamp: new Date().toISOString(),
      };

      // Create transaction for database migrations
      if (migration.type === MigrationType.DATABASE) {
        const { getRepositoryFactory } = await import('../RepositoryFactory');
        const factory = getRepositoryFactory();
        transaction = await factory.beginTransaction();
        context.transaction = transaction;
      }

      // Execute rollback with timeout
      const result = await this.executeWithTimeout(
        () => migration.down(context),
        this.config.migrationTimeout
      );

      // Commit transaction if successful
      if (transaction && result.success) {
        await transaction.commit();
      }

      // Update version tracking
      if (result.success) {
        if (migration.type === MigrationType.DATABASE) {
          await this.versionTracker.setDatabaseVersion(migration.version - 1);
        } else {
          await this.versionTracker.setDataVersion(migration.version - 1);
        }

        // Mark as not executed in registry
        this.registry.markAsNotExecuted(migration.id);
      }

      // Record rollback in history
      await this.versionTracker.recordRollback(migration.id, result);

      if (this.config.enableDetailedLogging && __DEV__) {
        const duration = Date.now() - startTime;
        console.log(
          `[MigrationManager] Rollback ${result.success ? 'completed' : 'failed'}: ${migration.id} (${duration}ms)`
        );
      }

      return result;
    } catch (error) {
      // Rollback transaction on error
      if (transaction) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          if (this.config.enableDetailedLogging && __DEV__) {
            console.error('[MigrationManager] Transaction rollback failed:', rollbackError);
          }
        }
      }

      const executionTime = Date.now() - startTime;
      const failureResult: MigrationResult = {
        success: false,
        migrationId: migration.id,
        executionTimeMs: executionTime,
        error: error as Error,
      };

      if (this.config.enableDetailedLogging && __DEV__) {
        console.error(`[MigrationManager] Rollback failed: ${migration.id}`, error);
      }

      return failureResult;
    }
  }

  async rollbackToVersion(databaseVersion: number, dataVersion: number): Promise<MigrationResult[]> {
    if (!this.config.enableRollback) {
      throw new MigrationError(
        'Rollback is disabled in configuration',
        'migration_manager',
        'ROLLBACK_DISABLED'
      );
    }

    const currentVersions = await this.versionTracker.getCurrentVersions();
    
    // Determine which migrations need to be rolled back
    const databaseMigrations = this.registry.getMigrationsByType(MigrationType.DATABASE)
      .filter(m => m.version > databaseVersion && m.version <= currentVersions.database)
      .reverse(); // Rollback in reverse order

    const dataMigrations = this.registry.getMigrationsByType(MigrationType.DATA)
      .filter(m => m.version > dataVersion && m.version <= currentVersions.data)
      .reverse(); // Rollback in reverse order

    const migrationsToRollback = [...databaseMigrations, ...dataMigrations]
      .sort((a, b) => b.version - a.version); // Highest version first

    const results: MigrationResult[] = [];

    for (const migration of migrationsToRollback) {
      try {
        const result = await this.rollbackMigration(migration.id);
        results.push(result);

        if (!result.success && !this.config.continueOnError) {
          break;
        }
      } catch (error) {
        const failureResult: MigrationResult = {
          success: false,
          migrationId: migration.id,
          executionTimeMs: 0,
          error: error as Error,
        };
        results.push(failureResult);

        if (!this.config.continueOnError) {
          break;
        }
      }
    }

    return results;
  }

  // ===============================
  // Utility Methods
  // ===============================

  async getCurrentVersions(): Promise<{ database: number; data: number }> {
    return await this.versionTracker.getCurrentVersions();
  }

  async validateMigrationChain(): Promise<{ valid: boolean; errors: string[] }> {
    return this.registry.validateDependencies();
  }

  // ===============================
  // Configuration Management
  // ===============================

  getConfig(): MigrationConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<MigrationConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // ===============================
  // Registry Access
  // ===============================

  getRegistry(): MigrationRegistry {
    return this.registry;
  }

  getVersionTracker(): VersionTracker {
    return this.versionTracker;
  }

  // ===============================
  // Status and Statistics
  // ===============================

  isRunningMigrations(): boolean {
    return this.isRunning;
  }

  async getMigrationStats(): Promise<{
    registry: { total: number; database: number; data: number; executed: number; pending: number };
    versions: { database: number; data: number };
    history: { totalExecuted: number; totalFailed: number; totalRolledBack: number };
  }> {
    const [registryStats, versions, historyStats] = await Promise.all([
      Promise.resolve(this.registry.getStats()),
      this.versionTracker.getCurrentVersions(),
      this.versionTracker.getMigrationStats(),
    ]);

    return {
      registry: registryStats,
      versions,
      history: {
        totalExecuted: historyStats.totalExecuted,
        totalFailed: historyStats.totalFailed,
        totalRolledBack: historyStats.totalRolledBack,
      },
    };
  }

  // ===============================
  // Private Helper Methods
  // ===============================

  /**
   * Execute a function with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new MigrationExecutionError(
          'timeout',
          `Migration execution timed out after ${timeoutMs}ms`
        ));
      }, timeoutMs);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
}

// Export a default instance
export const migrationManager = new MigrationManager();
