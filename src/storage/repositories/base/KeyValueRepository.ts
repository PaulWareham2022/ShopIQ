/**
 * Key-Value Repository Implementation
 * Provides abstraction over MMKV storage for simple key-value operations
 */

import { KeyValueRepository as IKeyValueRepository, StorageError } from '../../types';
import { MMKVWrapper } from '../../mmkv/storage';

export class KeyValueRepository implements IKeyValueRepository {
  private storage: MMKVWrapper;
  private namespace: string;

  constructor(storage: MMKVWrapper, namespace: string = '') {
    this.storage = storage;
    this.namespace = namespace;
  }

  /**
   * Get the full key with namespace prefix
   */
  private getKey(key: string): string {
    return this.namespace ? `${this.namespace}:${key}` : key;
  }

  get<T>(key: string): T | undefined {
    try {
      const fullKey = this.getKey(key);
      
      // Try to get as object first (JSON)
      const objectValue = this.storage.getObject<T>(fullKey);
      if (objectValue !== undefined) {
        return objectValue;
      }

      // Fall back to string/number/boolean
      const stringValue = this.storage.getString(fullKey);
      if (stringValue !== undefined) {
        return stringValue as unknown as T;
      }

      const numberValue = this.storage.getNumber(fullKey);
      if (numberValue !== undefined) {
        return numberValue as unknown as T;
      }

      const booleanValue = this.storage.getBoolean(fullKey);
      if (booleanValue !== undefined) {
        return booleanValue as unknown as T;
      }

      return undefined;
    } catch (error) {
      throw new StorageError(
        `Failed to get value for key: ${key}`,
        'KEY_VALUE_GET_ERROR',
        error as Error
      );
    }
  }

  set<T>(key: string, value: T): void {
    try {
      const fullKey = this.getKey(key);

      // Handle different types appropriately
      if (typeof value === 'string') {
        this.storage.set(fullKey, value);
      } else if (typeof value === 'number') {
        this.storage.set(fullKey, value);
      } else if (typeof value === 'boolean') {
        this.storage.set(fullKey, value);
      } else {
        // For objects, arrays, etc., store as JSON
        this.storage.setObject(fullKey, value);
      }
    } catch (error) {
      throw new StorageError(
        `Failed to set value for key: ${key}`,
        'KEY_VALUE_SET_ERROR',
        error as Error
      );
    }
  }

  delete(key: string): void {
    try {
      const fullKey = this.getKey(key);
      this.storage.delete(fullKey);
    } catch (error) {
      throw new StorageError(
        `Failed to delete key: ${key}`,
        'KEY_VALUE_DELETE_ERROR',
        error as Error
      );
    }
  }

  exists(key: string): boolean {
    try {
      const fullKey = this.getKey(key);
      return this.storage.contains(fullKey);
    } catch (error) {
      throw new StorageError(
        `Failed to check existence of key: ${key}`,
        'KEY_VALUE_EXISTS_ERROR',
        error as Error
      );
    }
  }

  getAllKeys(): string[] {
    try {
      const allKeys = this.storage.getAllKeys();
      
      if (!this.namespace) {
        return allKeys;
      }

      // Filter keys by namespace and remove namespace prefix
      const prefix = `${this.namespace}:`;
      return allKeys
        .filter(key => key.startsWith(prefix))
        .map(key => key.substring(prefix.length));
    } catch (error) {
      throw new StorageError(
        'Failed to get all keys',
        'KEY_VALUE_GET_ALL_KEYS_ERROR',
        error as Error
      );
    }
  }

  clear(): void {
    try {
      if (!this.namespace) {
        // Clear all storage if no namespace
        this.storage.clearAll();
        return;
      }

      // Clear keys in batches to improve performance
      const keysToDelete = this.getAllKeys();
      const BATCH_SIZE = 500;
      
      // Process keys in batches with bounded concurrency
      for (let i = 0; i < keysToDelete.length; i += BATCH_SIZE) {
        const batch = keysToDelete.slice(i, i + BATCH_SIZE);
        
        // Process batch with error handling
        await Promise.all(
          batch.map(async (key) => {
            try {
              this.delete(key);
            } catch (error) {
              if (__DEV__) {
                console.warn(`Failed to delete key '${key}' during clear:`, error);
              }
              // Continue with other keys
            }
          })
        );
        
        // Allow event loop to process between batches
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    } catch (error) {
      throw new StorageError(
        'Failed to clear storage',
        'KEY_VALUE_CLEAR_ERROR',
        error as Error
      );
    }
  }

  getObject<T>(key: string): T | undefined {
    try {
      const fullKey = this.getKey(key);
      return this.storage.getObject<T>(fullKey);
    } catch (error) {
      throw new StorageError(
        `Failed to get object for key: ${key}`,
        'KEY_VALUE_GET_OBJECT_ERROR',
        error as Error
      );
    }
  }

  setObject<T>(key: string, value: T): void {
    try {
      const fullKey = this.getKey(key);
      this.storage.setObject(fullKey, value);
    } catch (error) {
      throw new StorageError(
        `Failed to set object for key: ${key}`,
        'KEY_VALUE_SET_OBJECT_ERROR',
        error as Error
      );
    }
  }

  /**
   * Get multiple values at once
   * @param keys Array of keys to retrieve
   * @returns Record of key-value pairs
   */
  getMultiple<T>(keys: string[]): Record<string, T | undefined> {
    const result: Record<string, T | undefined> = {};
    
    keys.forEach(key => {
      try {
        result[key] = this.get<T>(key);
      } catch (error) {
        // Log error but don't let one failing key abort the whole operation
        if (__DEV__) {
          console.warn(`Failed to get key '${key}':`, error);
        }
        result[key] = undefined;
      }
    });

    return result;
  }

  /**
   * Set multiple values at once
   * @param entries Record of key-value pairs to set
   */
  setMultiple<T>(entries: Record<string, T>): void {
    const succeeded: string[] = [];
    const failed: Record<string, Error> = {};
    
    Object.entries(entries).forEach(([key, value]) => {
      try {
        this.set(key, value);
        succeeded.push(key);
      } catch (error) {
        failed[key] = error as Error;
      }
    });
    
    // If any operations failed, attempt rollback and throw aggregate error
    if (Object.keys(failed).length > 0) {
      // Attempt rollback of successful operations
      succeeded.forEach(key => {
        try {
          this.delete(key);
        } catch (rollbackError) {
          // Log rollback failure but don't throw
          if (__DEV__) {
            console.warn(`Failed to rollback key '${key}':`, rollbackError);
          }
        }
      });
      
      throw new StorageError(
        `Failed to set ${Object.keys(failed).length} out of ${Object.keys(entries).length} keys`,
        'KEY_VALUE_SET_MULTIPLE_ERROR',
        Object.values(failed)[0]
      );
    }
  }

  /**
   * Delete multiple keys at once
   * @param keys Array of keys to delete
   */
  deleteMultiple(keys: string[]): void {
    keys.forEach(key => this.delete(key));
  }

  /**
   * Get all key-value pairs in this namespace
   * @returns Record of all key-value pairs
   */
  getAll<T>(): Record<string, T> {
    const keys = this.getAllKeys();
    const result: Record<string, T> = {};

    keys.forEach(key => {
      const value = this.get<T>(key);
      if (value !== undefined) {
        result[key] = value;
      }
    });

    return result;
  }

  /**
   * Count the number of keys in this namespace
   * @returns Number of keys
   */
  count(): number {
    return this.getAllKeys().length;
  }
}
