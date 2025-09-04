import { Platform } from 'react-native';

// Helper function to generate secure encryption key
async function generateOrRetrieveEncryptionKey(
  keyId: string
): Promise<string | undefined> {
  try {
    // Try to use react-native-keychain for secure key storage
    const Keychain = require('react-native-keychain');

    // First, try to retrieve existing key
    try {
      const credentials = await Keychain.getInternetCredentials(keyId);
      if (credentials && credentials.password) {
        return credentials.password;
      }
    } catch {
      // Key doesn't exist, we'll generate a new one
    }

    // Generate a new 256-bit key
    const crypto = require('crypto');
    const key = crypto.randomBytes(32).toString('hex');

    // Store the key securely
    await Keychain.setInternetCredentials(keyId, 'mmkv', key);

    return key;
  } catch (error) {
    // If secure keychain is not available, log warning and continue without encryption
    if (__DEV__) {
      console.warn(
        'Failed to generate/retrieve encryption key, continuing without encryption:',
        error
      );
    }
    return undefined;
  }
}

// Web fallback storage using localStorage
class WebStorage {
  private prefix: string;

  constructor(id: string) {
    this.prefix = `mmkv_${id}_`;
  }

  set(key: string, value: string | number | boolean): void {
    if (
      typeof window !== 'undefined' &&
      'localStorage' in window &&
      window.localStorage
    ) {
      try {
        window.localStorage.setItem(this.prefix + key, String(value));
      } catch (error) {
        // Handle quota/permission errors silently
        console.warn('Failed to set localStorage item:', error);
      }
    }
  }

  getString(key: string): string | undefined {
    if (
      typeof window !== 'undefined' &&
      'localStorage' in window &&
      window.localStorage
    ) {
      const value = window.localStorage.getItem(this.prefix + key);
      return value !== null ? value : undefined;
    }
    return undefined;
  }

  getNumber(key: string): number | undefined {
    const value = this.getString(key);
    if (value !== undefined) {
      const trimmed = value.trim();
      if (trimmed === '' || !/^-?\d*\.?\d+([eE][+-]?\d+)?$/.test(trimmed)) {
        return undefined;
      }
      const num = Number(trimmed);
      return Number.isFinite(num) ? num : undefined;
    }
    return undefined;
  }

  getBoolean(key: string): boolean | undefined {
    const value = this.getString(key);
    return value !== undefined ? value === 'true' : undefined;
  }

  delete(key: string): void {
    if (
      typeof window !== 'undefined' &&
      'localStorage' in window &&
      window.localStorage
    ) {
      window.localStorage.removeItem(this.prefix + key);
    }
  }

  contains(key: string): boolean {
    if (typeof window !== 'undefined' && (window as any).localStorage) {
      return (window as any).localStorage.getItem(this.prefix + key) !== null;
    }
    return false;
  }

  getAllKeys(): string[] {
    if (typeof window !== 'undefined' && (window as any).localStorage) {
      const keys: string[] = [];
      for (let i = 0; i < (window as any).localStorage.length; i++) {
        const key = (window as any).localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
      return keys;
    }
    return [];
  }

  clearAll(): void {
    const keys = this.getAllKeys();
    keys.forEach(key => this.delete(key));
  }
}

// Storage interface for type safety
export interface StorageInterface {
  set(key: string, value: string | number | boolean): void;
  getString(key: string): string | undefined;
  getNumber(key: string): number | undefined;
  getBoolean(key: string): boolean | undefined;
  delete(key: string): void;
  contains(key: string): boolean;
  getAllKeys(): string[];
  clearAll(): void;
}

// Wrapper class for MMKV with type safety
export class MMKVWrapper implements StorageInterface {
  private storage: any;

  constructor(storage: any) {
    this.storage = storage;
  }

  set(key: string, value: string | number | boolean): void {
    this.storage.set(key, value);
  }

  getString(key: string): string | undefined {
    return this.storage.getString(key);
  }

  getNumber(key: string): number | undefined {
    return this.storage.getNumber(key);
  }

  getBoolean(key: string): boolean | undefined {
    return this.storage.getBoolean(key);
  }

  delete(key: string): void {
    this.storage.delete(key);
  }

  contains(key: string): boolean {
    return this.storage.contains(key);
  }

  getAllKeys(): string[] {
    return this.storage.getAllKeys();
  }

  clearAll(): void {
    this.storage.clearAll();
  }

  // JSON helpers
  setObject<T>(key: string, value: T): void {
    this.set(key, JSON.stringify(value));
  }

  getObject<T>(key: string): T | undefined {
    const jsonString = this.getString(key);
    if (jsonString) {
      try {
        return JSON.parse(jsonString) as T;
      } catch {
        // Silently handle JSON parse errors
        return undefined;
      }
    }
    return undefined;
  }
}

// Initialize storage instances based on platform
let appStorage: any;
let cacheStorage: any;
let userPreferencesStorage: any;

if (Platform.OS === 'web') {
  appStorage = new WebStorage('app-storage');
  cacheStorage = new WebStorage('cache-storage');
  userPreferencesStorage = new WebStorage('user-preferences');
} else {
  // Native platforms - use MMKV

  const { MMKV } = require('react-native-mmkv');

  // Initialize with encryption keys (async initialization will be handled)
  Promise.all([
    generateOrRetrieveEncryptionKey('app-storage-key'),
    generateOrRetrieveEncryptionKey('cache-storage-key'),
    generateOrRetrieveEncryptionKey('user-preferences-key'),
  ])
    .then(([appKey, cacheKey, userPrefKey]) => {
      // Reinitialize instances with encryption keys
      appStorage = new MMKV({
        id: 'app-storage',
        encryptionKey: appKey,
      });

      cacheStorage = new MMKV({
        id: 'cache-storage',
        encryptionKey: cacheKey,
      });

      userPreferencesStorage = new MMKV({
        id: 'user-preferences',
        encryptionKey: userPrefKey,
      });

      if (__DEV__) {
        console.log('✅ MMKV storage initialized with encryption');
      }
    })
    .catch(error => {
      if (__DEV__) {
        console.warn(
          'Failed to initialize encrypted MMKV storage, falling back to unencrypted:',
          error
        );
      }
    });

  // Initial instances (will be replaced with encrypted versions)
  appStorage = new MMKV({ id: 'app-storage' });
  cacheStorage = new MMKV({ id: 'cache-storage' });
  userPreferencesStorage = new MMKV({ id: 'user-preferences' });
}

// Export wrapped instances
export const appStorageWrapper = new MMKVWrapper(appStorage);
export const cacheStorageWrapper = new MMKVWrapper(cacheStorage);
export const userPreferencesStorageWrapper = new MMKVWrapper(
  userPreferencesStorage
);

// Storage keys constants for type safety
export const STORAGE_KEYS = {
  // App-level settings
  APP_VERSION: 'app_version',
  FIRST_LAUNCH: 'first_launch',
  LAST_SYNC: 'last_sync',

  // User preferences
  THEME: 'theme',
  LANGUAGE: 'language',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',

  // Cache keys
  LAST_OFFERS_FETCH: 'last_offers_fetch',
  SUPPLIERS_CACHE: 'suppliers_cache',
  INVENTORY_CACHE: 'inventory_cache',
} as const;

// Helper functions for common operations
export const getAppPreference = (key: string): string | undefined => {
  return appStorageWrapper.getString(key);
};

export const setAppPreference = (
  key: string,
  value: string | number | boolean
): void => {
  appStorageWrapper.set(key, value);
};

export const getUserPreference = (key: string): string | undefined => {
  return userPreferencesStorageWrapper.getString(key);
};

export const setUserPreference = (
  key: string,
  value: string | number | boolean
): void => {
  userPreferencesStorageWrapper.set(key, value);
};

export const getCacheData = <T>(key: string): T | undefined => {
  return cacheStorageWrapper.getObject<T>(key);
};

export const setCacheData = <T>(key: string, value: T): void => {
  cacheStorageWrapper.setObject(key, value);
};

export const clearAllStorages = (): void => {
  appStorageWrapper.clearAll();
  cacheStorageWrapper.clearAll();
  userPreferencesStorageWrapper.clearAll();
};
