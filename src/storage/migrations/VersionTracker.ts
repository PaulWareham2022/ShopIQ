/**
 * Version Tracker Implementation
 * Manages version tracking for both SQLite database and MMKV data migrations
 */

import {
  VersionTracker as IVersionTracker,
  MigrationExecutionRecord,
  Migration,
  MigrationResult,
  MigrationConfig,
  DEFAULT_MIGRATION_CONFIG,
  MigrationError,
} from './types';
import { executeSql } from '../sqlite/database';
import { appStorageWrapper } from '../mmkv/storage';
import { StorageError } from '../types';

export class VersionTracker implements IVersionTracker {
  private config: MigrationConfig;

  constructor(config: Partial<MigrationConfig> = {}) {
    this.config = { ...DEFAULT_MIGRATION_CONFIG, ...config };
  }

  // ===============================
  // Database Version Management
  // ===============================

  async getDatabaseVersion(): Promise<number> {
    try {
      const result = await executeSql(
        'SELECT value FROM database_metadata WHERE key = ?',
        [this.config.databaseVersionKey]
      );

      if (result.rows.length > 0) {
        const version = parseInt(result.rows.item(0).value, 10);
        return isNaN(version) ? 0 : version;
      }

      // If no version record exists, this is a fresh install
      return 0;
    } catch (error) {
      if (this.config.logLevel === 'debug' && __DEV__) {
        console.error('[VersionTracker] Error getting database version:', error);
      }
      
      // On error, assume version 0 (fresh install)
      return 0;
    }
  }

  async setDatabaseVersion(version: number): Promise<void> {
    try {
      // Use INSERT OR REPLACE to handle both initial insert and updates
      await executeSql(`
        INSERT OR REPLACE INTO database_metadata (key, value, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
      `, [this.config.databaseVersionKey, version.toString()]);

      if (this.config.enableDetailedLogging && __DEV__) {
        console.log(`[VersionTracker] Database version set to: ${version}`);
      }
    } catch (error) {
      throw new MigrationError(
        `Failed to set database version to ${version}`,
        'version_tracker',
        'VERSION_UPDATE_ERROR',
        error as Error
      );
    }
  }

  // ===============================
  // Data Version Management (MMKV)
  // ===============================

  async getDataVersion(): Promise<number> {
    try {
      const version = appStorageWrapper.getNumber(this.config.dataVersionKey);
      return version ?? 0;
    } catch (error) {
      if (this.config.logLevel === 'debug' && __DEV__) {
        console.error('[VersionTracker] Error getting data version:', error);
      }
      
      // On error, assume version 0
      return 0;
    }
  }

  async setDataVersion(version: number): Promise<void> {
    try {
      appStorageWrapper.set(this.config.dataVersionKey, version);
      
      if (this.config.enableDetailedLogging && __DEV__) {
        console.log(`[VersionTracker] Data version set to: ${version}`);
      }
    } catch (error) {
      throw new MigrationError(
        `Failed to set data version to ${version}`,
        'version_tracker',
        'VERSION_UPDATE_ERROR',
        error as Error
      );
    }
  }

  // ===============================
  // Migration History Management
  // ===============================

  async recordMigrationExecution(migration: Migration, result: MigrationResult): Promise<void> {
    try {
      const record: MigrationExecutionRecord = {
        migrationId: migration.id,
        type: migration.type,
        version: migration.version,
        executedAt: new Date().toISOString(),
        success: result.success,
        executionTimeMs: result.executionTimeMs,
        error: result.error?.message,
      };

      await this.addToMigrationHistory(record);

      if (this.config.enableDetailedLogging && __DEV__) {
        console.log(
          `[VersionTracker] Recorded migration execution: ${migration.id} (${result.success ? 'SUCCESS' : 'FAILED'})`
        );
      }
    } catch (error) {
      // Don't throw here - migration history recording is not critical
      if (this.config.logLevel !== 'error' && __DEV__) {
        console.warn('[VersionTracker] Failed to record migration execution:', error);
      }
    }
  }

  async getMigrationHistory(): Promise<MigrationExecutionRecord[]> {
    try {
      const historyData = appStorageWrapper.getObject<MigrationExecutionRecord[]>(
        this.config.migrationHistoryKey
      );
      
      return historyData || [];
    } catch (error) {
      if (this.config.logLevel === 'debug' && __DEV__) {
        console.error('[VersionTracker] Error getting migration history:', error);
      }
      
      return [];
    }
  }

  async recordRollback(migrationId: string, rollbackResult: MigrationResult): Promise<void> {
    try {
      const history = await this.getMigrationHistory();
      
      // Find the migration record and mark it as rolled back
      const recordIndex = history.findIndex(record => record.migrationId === migrationId);
      
      if (recordIndex !== -1) {
        history[recordIndex].rolledBack = true;
        history[recordIndex].rolledBackAt = new Date().toISOString();
        
        // Save the updated history
        appStorageWrapper.setObject(this.config.migrationHistoryKey, history);
      }

      if (this.config.enableDetailedLogging && __DEV__) {
        console.log(
          `[VersionTracker] Recorded rollback: ${migrationId} (${rollbackResult.success ? 'SUCCESS' : 'FAILED'})`
        );
      }
    } catch (error) {
      // Don't throw here - rollback recording is not critical
      if (this.config.logLevel !== 'error' && __DEV__) {
        console.warn('[VersionTracker] Failed to record rollback:', error);
      }
    }
  }

  // ===============================
  // Private Helper Methods
  // ===============================

  private async addToMigrationHistory(record: MigrationExecutionRecord): Promise<void> {
    const history = await this.getMigrationHistory();
    
    // Remove any existing record for this migration (in case of retry)
    const filteredHistory = history.filter(h => h.migrationId !== record.migrationId);
    
    // Add the new record
    filteredHistory.push(record);
    
    // Sort by execution time (most recent first)
    filteredHistory.sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
    
    // Keep only the last 100 migration records to prevent unlimited growth
    const trimmedHistory = filteredHistory.slice(0, 100);
    
    // Save to storage
    appStorageWrapper.setObject(this.config.migrationHistoryKey, trimmedHistory);
  }

  // ===============================
  // Utility Methods
  // ===============================

  /**
   * Get both current versions in a single call
   */
  async getCurrentVersions(): Promise<{ database: number; data: number }> {
    const [database, data] = await Promise.all([
      this.getDatabaseVersion(),
      this.getDataVersion(),
    ]);

    return { database, data };
  }

  /**
   * Check if a specific migration has been executed
   */
  async isMigrationExecuted(migrationId: string): Promise<boolean> {
    const history = await this.getMigrationHistory();
    const record = history.find(h => h.migrationId === migrationId);
    
    return record ? record.success && !record.rolledBack : false;
  }

  /**
   * Get the last successful migration for a given type
   */
  async getLastSuccessfulMigration(type: 'database' | 'data'): Promise<MigrationExecutionRecord | null> {
    const history = await this.getMigrationHistory();
    
    const typeRecords = history.filter(
      h => h.type === type && h.success && !h.rolledBack
    );
    
    if (typeRecords.length === 0) {
      return null;
    }
    
    // Sort by version (highest first)
    typeRecords.sort((a, b) => b.version - a.version);
    
    return typeRecords[0];
  }

  /**
   * Clear all migration history (useful for testing or reset scenarios)
   */
  async clearMigrationHistory(): Promise<void> {
    try {
      appStorageWrapper.delete(this.config.migrationHistoryKey);
      
      if (this.config.enableDetailedLogging && __DEV__) {
        console.log('[VersionTracker] Migration history cleared');
      }
    } catch (error) {
      throw new MigrationError(
        'Failed to clear migration history',
        'version_tracker',
        'HISTORY_CLEAR_ERROR',
        error as Error
      );
    }
  }

  /**
   * Reset all version tracking (useful for testing or complete reset)
   */
  async resetAllVersions(): Promise<void> {
    try {
      // Reset database version
      await this.setDatabaseVersion(0);
      
      // Reset data version
      await this.setDataVersion(0);
      
      // Clear migration history
      await this.clearMigrationHistory();
      
      if (this.config.enableDetailedLogging && __DEV__) {
        console.log('[VersionTracker] All versions and history reset');
      }
    } catch (error) {
      throw new MigrationError(
        'Failed to reset all versions',
        'version_tracker',
        'RESET_ERROR',
        error as Error
      );
    }
  }

  /**
   * Get migration statistics
   */
  async getMigrationStats(): Promise<{
    totalExecuted: number;
    totalFailed: number;
    totalRolledBack: number;
    currentDatabaseVersion: number;
    currentDataVersion: number;
    lastMigrationAt?: string;
  }> {
    const [history, versions] = await Promise.all([
      this.getMigrationHistory(),
      this.getCurrentVersions(),
    ]);

    const stats = {
      totalExecuted: history.filter(h => h.success).length,
      totalFailed: history.filter(h => !h.success).length,
      totalRolledBack: history.filter(h => h.rolledBack).length,
      currentDatabaseVersion: versions.database,
      currentDataVersion: versions.data,
      lastMigrationAt: history.length > 0 ? history[0].executedAt : undefined,
    };

    return stats;
  }
}

// Export a default instance
export const versionTracker = new VersionTracker();

