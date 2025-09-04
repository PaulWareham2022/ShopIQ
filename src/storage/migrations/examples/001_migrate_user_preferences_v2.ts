/**
 * Example Data Migration: Migrate User Preferences to V2 Format
 * Version: 1 (first data migration)
 * 
 * This migration demonstrates how to transform stored data structures
 * in MMKV storage while preserving the ability to rollback changes.
 * 
 * V1 Format: { theme: 'dark', language: 'en' }
 * V2 Format: { ui: { theme: 'dark', language: 'en' }, version: 2 }
 */

import { DataMigration } from '../BaseMigration';
import { MigrationType, MigrationContext } from '../types';

export class MigrateUserPreferencesV2Migration extends DataMigration {
  readonly id = '001_migrate_user_preferences_v2';
  readonly version = 1;
  readonly type = MigrationType.DATA;
  readonly description = 'Migrate user preferences to V2 format with nested structure';
  
  // This migration affects the preferences namespace
  readonly affectedNamespaces = ['preferences'];

  async transformUp(data: any, context: MigrationContext): Promise<any> {
    // Handle null/undefined data
    if (!data) {
      return {
        ui: {},
        version: 2,
        migratedAt: context.timestamp,
      };
    }

    // If already V2 format, don't transform
    if (data.version === 2) {
      return data;
    }

    // Transform V1 to V2
    if (typeof data === 'object') {
      const transformed = {
        ui: {
          // Migrate existing theme setting
          theme: data.theme || 'light',
          
          // Migrate existing language setting  
          language: data.language || 'en',
          
          // Migrate any other UI-related settings
          ...(data.notifications !== undefined && { notifications: data.notifications }),
          ...(data.fontSize !== undefined && { fontSize: data.fontSize }),
        },
        
        // Add version tracking
        version: 2,
        migratedAt: context.timestamp,
        
        // Preserve any other top-level properties that aren't UI-related
        ...Object.keys(data)
          .filter(key => !['theme', 'language', 'notifications', 'fontSize'].includes(key))
          .reduce((acc, key) => ({ ...acc, [key]: data[key] }), {}),
      };

      return transformed;
    }

    // Handle unexpected data types
    return {
      ui: {},
      version: 2,
      migratedAt: context.timestamp,
      originalData: data, // Preserve original for debugging
    };
  }

  async transformDown(data: any, context: MigrationContext): Promise<any> {
    // Handle null/undefined data
    if (!data) {
      return {};
    }

    // If not V2 format, return as-is
    if (data.version !== 2) {
      return data;
    }

    // Transform V2 back to V1
    const transformed: any = {};

    if (data.ui) {
      // Extract UI settings back to top level
      if (data.ui.theme !== undefined) {
        transformed.theme = data.ui.theme;
      }
      
      if (data.ui.language !== undefined) {
        transformed.language = data.ui.language;
      }
      
      if (data.ui.notifications !== undefined) {
        transformed.notifications = data.ui.notifications;
      }
      
      if (data.ui.fontSize !== undefined) {
        transformed.fontSize = data.ui.fontSize;
      }
    }

    // Restore any other non-migration properties
    Object.keys(data)
      .filter(key => !['ui', 'version', 'migratedAt'].includes(key))
      .forEach(key => {
        transformed[key] = data[key];
      });

    return transformed;
  }

  // Override canRun to add custom validation
  async canRun(context: MigrationContext): Promise<boolean> {
    // Only run if data version is less than our version
    const versionCheck = await super.canRun(context);
    
    if (!versionCheck) {
      return false;
    }

    // Additional check: ensure we have the required storage namespaces
    try {
      const { userPreferencesStorageWrapper } = await import('../../mmkv/storage');
      
      // Test that we can access the storage
      const testKey = '_migration_test_' + Date.now();
      userPreferencesStorageWrapper.set(testKey, 'test');
      const retrieved = userPreferencesStorageWrapper.getString(testKey);
      userPreferencesStorageWrapper.delete(testKey);
      
      return retrieved === 'test';
    } catch (error) {
      if (__DEV__) {
        console.warn('[Migration] Cannot access preferences storage:', error);
      }
      return false;
    }
  }
}

// Register the migration
export const migration001Data = new MigrateUserPreferencesV2Migration();

