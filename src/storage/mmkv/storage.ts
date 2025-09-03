import { Platform } from 'react-native';

// Web fallback storage using localStorage
class WebStorage {
  private prefix: string;

  constructor(id: string) {
    this.prefix = `mmkv_${id}_`;
  }

  set(key: string, value: string | number | boolean): void {
    if (typeof window !== 'undefined' && (window as any).localStorage) {
      (window as any).localStorage.setItem(this.prefix + key, String(value));
    }
  }

  getString(key: string): string | undefined {
    if (typeof window !== 'undefined' && (window as any).localStorage) {
      const value = (window as any).localStorage.getItem(this.prefix + key);
      return value !== null ? value : undefined;
    }
    return undefined;
  }

  getNumber(key: string): number | undefined {
    const value = this.getString(key);
    return value !== undefined ? Number(value) : undefined;
  }

  getBoolean(key: string): boolean | undefined {
    const value = this.getString(key);
    return value !== undefined ? value === 'true' : undefined;
  }

  delete(key: string): void {
    if (typeof window !== 'undefined' && (window as any).localStorage) {
      (window as any).localStorage.removeItem(this.prefix + key);
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

  appStorage = new MMKV({
    id: 'app-storage',
    encryptionKey: undefined, // Can be added later for encryption
  });

  cacheStorage = new MMKV({
    id: 'cache-storage',
    encryptionKey: undefined,
  });

  userPreferencesStorage = new MMKV({
    id: 'user-preferences',
    encryptionKey: undefined,
  });
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
