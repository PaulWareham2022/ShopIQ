/**
 * Storage Layer Main Export
 * Provides unified access to the repository pattern abstraction
 */

// Main factory and types
export { RepositoryFactory, getRepositoryFactory, repositories } from './RepositoryFactory';
export * from './types';

// Entity interfaces
export type { Supplier } from './repositories/SupplierRepository';
export type { InventoryItem } from './repositories/InventoryItemRepository';

// Repository classes (for direct instantiation if needed)
export { SupplierRepository } from './repositories/SupplierRepository';
export { InventoryItemRepository } from './repositories/InventoryItemRepository';
export { BaseRepository } from './repositories/base/BaseRepository';
export { KeyValueRepository } from './repositories/base/KeyValueRepository';

// Utilities
export { generateUUID, isValidUUID, generateShortUUID } from './utils/uuid';

// Legacy direct access (for migration period)
export { initializeDatabase, executeSql, getDatabaseVersion } from './sqlite/database';
export { 
  appStorageWrapper, 
  cacheStorageWrapper, 
  userPreferencesStorageWrapper,
  STORAGE_KEYS,
  getAppPreference,
  setAppPreference,
  getUserPreference,
  setUserPreference,
  getCacheData,
  setCacheData,
  clearAllStorages
} from './mmkv/storage';

// Test utilities
export { testStorageIntegration } from './test-storage';

// Migration system
export * from './migrations';

// Validation schemas
export * from './validation';

/**
 * Quick Start Guide:
 * 
 * 1. Initialize the storage system:
 *    ```typescript
 *    import { repositories } from '@/storage';
 *    await repositories.initialize();
 *    ```
 * 
 * 2. Get a repository:
 *    ```typescript
 *    const supplierRepo = await repositories.getSupplierRepository();
 *    const kvStore = repositories.getKeyValueRepository('settings');
 *    ```
 * 
 * 3. Use repositories:
 *    ```typescript
 *    // SQL-based entities
 *    const supplier = await supplierRepo.create({
 *      name: 'Best Supply Co',
 *      website: 'https://bestsupply.com'
 *    });
 * 
 *    // Key-value storage
 *    kvStore.set('user_theme', 'dark');
 *    const theme = kvStore.get<string>('user_theme');
 *    ```
 * 
 * 4. Transactions:
 *    ```typescript
 *    await repositories.withTransaction(async (tx) => {
 *      await supplierRepo.create({ name: 'Supplier 1' });
 *      await supplierRepo.create({ name: 'Supplier 2' });
 *      // Both operations commit together or rollback on error
 *    });
 *    ```
 */
