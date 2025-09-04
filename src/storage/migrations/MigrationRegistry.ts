/**
 * Migration Registry Implementation
 * Manages registration and organization of all migrations
 */

import {
  Migration,
  MigrationRegistry as IMigrationRegistry,
  MigrationRegistryEntry,
  MigrationType,
  MigrationError,
} from './types';

export class MigrationRegistry implements IMigrationRegistry {
  private migrations = new Map<string, MigrationRegistryEntry>();

  register(migration: Migration): void {
    // Validation
    this.validateMigration(migration);

    // Check for duplicate IDs
    if (this.migrations.has(migration.id)) {
      throw new MigrationError(
        `Migration with ID '${migration.id}' is already registered`,
        migration.id,
        'DUPLICATE_MIGRATION'
      );
    }

    // Check for version conflicts (same version for same type)
    const existingWithSameVersion = this.findMigrationByVersionAndType(
      migration.version,
      migration.type
    );

    if (existingWithSameVersion) {
      throw new MigrationError(
        `Migration version ${migration.version} for type '${migration.type}' already exists (${existingWithSameVersion.id})`,
        migration.id,
        'VERSION_CONFLICT'
      );
    }

    // Register the migration
    const entry: MigrationRegistryEntry = {
      migration,
      registeredAt: new Date().toISOString(),
      executed: false,
    };

    this.migrations.set(migration.id, entry);

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(
        `[MigrationRegistry] Registered ${migration.type} migration: ${migration.id} (v${migration.version})`
      );
    }
  }

  unregister(migrationId: string): void {
    if (!this.migrations.has(migrationId)) {
      throw new MigrationError(
        `Migration with ID '${migrationId}' is not registered`,
        migrationId,
        'MIGRATION_NOT_FOUND'
      );
    }

    this.migrations.delete(migrationId);

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(`[MigrationRegistry] Unregistered migration: ${migrationId}`);
    }
  }

  getMigration(migrationId: string): Migration | undefined {
    const entry = this.migrations.get(migrationId);
    return entry?.migration;
  }

  getAllMigrations(): MigrationRegistryEntry[] {
    return Array.from(this.migrations.values());
  }

  getPendingMigrations(
    currentDatabaseVersion: number,
    currentDataVersion: number
  ): Migration[] {
    const allMigrations = this.getAllMigrations();

    const pending = allMigrations
      .filter(entry => {
        // Skip already executed migrations
        if (entry.executed) {
          return false;
        }

        const migration = entry.migration;

        // Check if migration version is higher than current version
        if (migration.type === MigrationType.DATABASE) {
          return migration.version > currentDatabaseVersion;
        } else {
          return migration.version > currentDataVersion;
        }
      })
      .map(entry => entry.migration);

    // Sort by version to ensure proper execution order
    return this.sortMigrations(pending);
  }

  getExecutedMigrations(): MigrationRegistryEntry[] {
    return this.getAllMigrations().filter(entry => entry.executed);
  }

  // ===============================
  // Advanced Query Methods
  // ===============================

  /**
   * Get migrations by type
   */
  getMigrationsByType(type: MigrationType): Migration[] {
    const migrations = this.getAllMigrations()
      .map(entry => entry.migration)
      .filter(migration => migration.type === type);

    return this.sortMigrations(migrations);
  }

  /**
   * Get migrations in version range
   */
  getMigrationsInVersionRange(
    type: MigrationType,
    minVersion: number,
    maxVersion: number
  ): Migration[] {
    const migrations = this.getMigrationsByType(type).filter(
      migration =>
        migration.version >= minVersion && migration.version <= maxVersion
    );

    return this.sortMigrations(migrations);
  }

  /**
   * Get the highest version for a migration type
   */
  getHighestVersion(type: MigrationType): number {
    const migrations = this.getMigrationsByType(type);

    if (migrations.length === 0) {
      return 0;
    }

    return Math.max(...migrations.map(m => m.version));
  }

  /**
   * Find migration by version and type
   */
  findMigrationByVersionAndType(
    version: number,
    type: MigrationType
  ): Migration | undefined {
    return this.getAllMigrations()
      .map(entry => entry.migration)
      .find(
        migration => migration.version === version && migration.type === type
      );
  }

  /**
   * Validate migration dependencies
   */
  validateDependencies(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const allMigrations = this.getAllMigrations().map(entry => entry.migration);

    for (const migration of allMigrations) {
      if (!migration.dependencies) {
        continue;
      }

      for (const dependencyId of migration.dependencies) {
        const dependency = this.getMigration(dependencyId);

        if (!dependency) {
          errors.push(
            `Migration '${migration.id}' depends on '${dependencyId}' which is not registered`
          );
          continue;
        }

        // Check that dependency has a lower or equal version
        if (
          dependency.type === migration.type &&
          dependency.version > migration.version
        ) {
          errors.push(
            `Migration '${migration.id}' (v${migration.version}) depends on '${dependencyId}' (v${dependency.version}) which has a higher version`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get migration execution plan
   */
  getExecutionPlan(
    currentDatabaseVersion: number,
    currentDataVersion: number
  ): {
    database: Migration[];
    data: Migration[];
    totalCount: number;
  } {
    const pending = this.getPendingMigrations(
      currentDatabaseVersion,
      currentDataVersion
    );

    const database = pending.filter(m => m.type === MigrationType.DATABASE);
    const data = pending.filter(m => m.type === MigrationType.DATA);

    return {
      database,
      data,
      totalCount: pending.length,
    };
  }

  // ===============================
  // Execution Tracking
  // ===============================

  /**
   * Mark a migration as executed
   */
  markAsExecuted(
    migrationId: string,
    success: boolean,
    executedAt?: string
  ): void {
    const entry = this.migrations.get(migrationId);

    if (!entry) {
      throw new MigrationError(
        `Migration with ID '${migrationId}' is not registered`,
        migrationId,
        'MIGRATION_NOT_FOUND'
      );
    }

    entry.executed = success;
    entry.executedAt = executedAt || new Date().toISOString();
  }

  /**
   * Mark a migration as not executed (for rollbacks)
   */
  markAsNotExecuted(migrationId: string): void {
    const entry = this.migrations.get(migrationId);

    if (!entry) {
      throw new MigrationError(
        `Migration with ID '${migrationId}' is not registered`,
        migrationId,
        'MIGRATION_NOT_FOUND'
      );
    }

    entry.executed = false;
    entry.executedAt = undefined;
    entry.executionResult = undefined;
  }

  // ===============================
  // Utility Methods
  // ===============================

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.migrations.clear();

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[MigrationRegistry] Cleared all migrations');
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total: number;
    database: number;
    data: number;
    executed: number;
    pending: number;
  } {
    const all = this.getAllMigrations();

    return {
      total: all.length,
      database: all.filter(e => e.migration.type === MigrationType.DATABASE)
        .length,
      data: all.filter(e => e.migration.type === MigrationType.DATA).length,
      executed: all.filter(e => e.executed).length,
      pending: all.filter(e => !e.executed).length,
    };
  }

  // ===============================
  // Private Helper Methods
  // ===============================

  /**
   * Validate a migration before registration
   */
  private validateMigration(migration: Migration): void {
    if (!migration.id) {
      throw new MigrationError(
        'Migration ID cannot be empty',
        '',
        'INVALID_MIGRATION'
      );
    }

    if (!migration.id.match(/^[a-zA-Z0-9_-]+$/)) {
      throw new MigrationError(
        `Migration ID '${migration.id}' contains invalid characters. Use only letters, numbers, hyphens, and underscores`,
        migration.id,
        'INVALID_MIGRATION_ID'
      );
    }

    if (migration.version <= 0) {
      throw new MigrationError(
        `Migration version must be greater than 0, got: ${migration.version}`,
        migration.id,
        'INVALID_VERSION'
      );
    }

    if (!Number.isInteger(migration.version)) {
      throw new MigrationError(
        `Migration version must be an integer, got: ${migration.version}`,
        migration.id,
        'INVALID_VERSION'
      );
    }

    if (!migration.description) {
      throw new MigrationError(
        'Migration description cannot be empty',
        migration.id,
        'INVALID_MIGRATION'
      );
    }

    // Validate dependencies if present
    if (migration.dependencies) {
      if (!Array.isArray(migration.dependencies)) {
        throw new MigrationError(
          'Migration dependencies must be an array',
          migration.id,
          'INVALID_DEPENDENCIES'
        );
      }

      for (const dep of migration.dependencies) {
        if (typeof dep !== 'string' || !dep) {
          throw new MigrationError(
            'Migration dependency IDs must be non-empty strings',
            migration.id,
            'INVALID_DEPENDENCIES'
          );
        }
      }
    }
  }

  /**
   * Sort migrations by version (ascending)
   */
  private sortMigrations(migrations: Migration[]): Migration[] {
    return [...migrations].sort((a, b) => a.version - b.version);
  }

  /**
   * Topological sort for dependency resolution
   */
  private sortByDependencies(migrations: Migration[]): Migration[] {
    const sorted: Migration[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (migration: Migration): void => {
      if (visiting.has(migration.id)) {
        throw new MigrationError(
          `Circular dependency detected involving migration '${migration.id}'`,
          migration.id,
          'CIRCULAR_DEPENDENCY'
        );
      }

      if (visited.has(migration.id)) {
        return;
      }

      visiting.add(migration.id);

      // Visit dependencies first
      if (migration.dependencies) {
        for (const depId of migration.dependencies) {
          const dependency = migrations.find(m => m.id === depId);
          if (dependency) {
            visit(dependency);
          }
        }
      }

      visiting.delete(migration.id);
      visited.add(migration.id);
      sorted.push(migration);
    };

    for (const migration of migrations) {
      visit(migration);
    }

    return sorted;
  }
}

// Export a default instance
export const migrationRegistry = new MigrationRegistry();
