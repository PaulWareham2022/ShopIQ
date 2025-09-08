import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// SecureStore wrapper for native platforms
class SecureStoreWrapper {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}_${key}`;
  }

  async set(key: string, value: string | number | boolean): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.getKey(key), String(value));
    } catch (error) {
      if (__DEV__) {
        console.warn(`SecureStore set failed for key ${key}:`, error);
      }
    }
  }

  async getString(key: string): Promise<string | undefined> {
    try {
      const result = await SecureStore.getItemAsync(this.getKey(key));
      return result || undefined;
    } catch (error) {
      if (__DEV__) {
        console.warn(`SecureStore getString failed for key ${key}:`, error);
      }
      return undefined;
    }
  }

  async getNumber(key: string): Promise<number | undefined> {
    try {
      const result = await this.getString(key);
      return result ? Number(result) : undefined;
    } catch {
      return undefined;
    }
  }

  async getBoolean(key: string): Promise<boolean | undefined> {
    try {
      const result = await this.getString(key);
      return result === 'true' ? true : result === 'false' ? false : undefined;
    } catch {
      return undefined;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.getKey(key));
    } catch (error) {
      if (__DEV__) {
        console.warn(`SecureStore delete failed for key ${key}:`, error);
      }
    }
  }

  async contains(key: string): Promise<boolean> {
    try {
      const result = await SecureStore.getItemAsync(this.getKey(key));
      return result !== null;
    } catch {
      return false;
    }
  }

  async getAllKeys(): Promise<string[]> {
    // SecureStore doesn't support listing all keys, so we'll return empty array
    // This is a limitation but rarely used in practice
    if (__DEV__) {
      console.warn(
        'SecureStore getAllKeys not supported - returning empty array'
      );
    }
    return [];
  }

  async clearAll(): Promise<void> {
    if (__DEV__) {
      console.warn(
        'SecureStore clearAll not supported - manual key deletion required'
      );
    }
  }

  // JSON helpers
  async setObject<T>(key: string, value: T): Promise<void> {
    await this.set(key, JSON.stringify(value));
  }

  async getObject<T>(key: string): Promise<T | undefined> {
    try {
      const jsonString = await this.getString(key);
      if (jsonString) {
        return JSON.parse(jsonString) as T;
      }
    } catch {
      // Silently handle JSON parse errors
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

// Storage interface for type safety (supports both sync and async operations)
export interface StorageInterface {
  set(key: string, value: string | number | boolean): void | Promise<void>;
  getString(key: string): string | undefined | Promise<string | undefined>;
  getNumber(key: string): number | undefined | Promise<number | undefined>;
  getBoolean(key: string): boolean | undefined | Promise<boolean | undefined>;
  delete(key: string): void | Promise<void>;
  contains(key: string): boolean | Promise<boolean>;
  getAllKeys(): string[] | Promise<string[]>;
  clearAll(): void | Promise<void>;
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
  // Native platforms - use Expo SecureStore (works in both Expo Go and development builds)
  console.log('🔐 Using Expo SecureStore for native platform storage');
  appStorage = new SecureStoreWrapper('app-storage');
  cacheStorage = new SecureStoreWrapper('cache-storage');
  userPreferencesStorage = new SecureStoreWrapper('user-preferences');
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
