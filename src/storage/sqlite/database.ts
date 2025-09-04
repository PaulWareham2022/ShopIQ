import { Platform } from 'react-native';
import { createAllSchemas, validateSchema } from './schemas';
import { getBatchUnitConversionSQL } from './seed-data';

// Database configuration
const DB_NAME = 'shopiq.db';
const DB_VERSION = 1;

// Web fallback using IndexedDB (via a simple interface)
class WebDatabase {
  private dbName: string;
  private version: number;
  private db: any = null;

  constructor(dbName: string, version: number = 1) {
    this.dbName = dbName;
    this.version = version;
  }

  async init(): Promise<void> {
    return new Promise(resolve => {
      if (typeof window === 'undefined' || !(window as any).indexedDB) {
        // IndexedDB not available, using memory fallback
        resolve();
        return;
      }

      const request = (window as any).indexedDB.open(this.dbName, this.version);

      request.onerror = () => resolve(); // Fallback gracefully
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        // Create a simple key-value store for web compatibility
        if (!db.objectStoreNames.contains('tables')) {
          db.createObjectStore('tables', { keyPath: 'name' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  transaction(
    callback: (tx: any) => void,
    errorCallback?: (error: any) => void,
    successCallback?: () => void
  ): void {
    // Simplified transaction for web - just execute callback
    try {
      const mockTx = {
        executeSql: (
          sql: string,
          params?: any[],
          successCb?: (tx: any, result: any) => void,
          _errorCb?: (tx: any, error: any) => boolean
        ) => {
          // Mock SQL execution for web
          if (__DEV__) {
            console.log(`[Web DB] Mock SQL: ${sql}`, params);
          }

          if (sql.includes('CREATE TABLE')) {
            // Mock table creation success
            if (successCb) {
              successCb(mockTx, { rows: { length: 0 } });
            }
          } else if (sql.includes('SELECT name FROM sqlite_master')) {
            // Mock table list query
            const mockTables = [
              'suppliers',
              'inventory_items',
              'offers',
              'unit_conversions',
              'bundles',
              'bundle_items',
              'database_metadata',
            ];
            if (successCb) {
              successCb(mockTx, {
                rows: {
                  length: mockTables.length,
                  item: (i: number) => ({ name: mockTables[i] }),
                },
              });
            }
          } else if (sql.includes('INSERT OR IGNORE INTO database_metadata')) {
            // Mock metadata insert
            if (successCb) {
              successCb(mockTx, { rows: { length: 0 } });
            }
          } else {
            // Default mock response
            if (successCb) {
              successCb(mockTx, { rows: { length: 0 } });
            }
          }
        },
      };

      callback(mockTx);
      // TODO: track pending async ops and flush when they complete.
      setTimeout(() => successCallback?.(), 0);
    } catch (error) {
      if (__DEV__) {
        console.error('[Web DB] Transaction error:', error);
      }
      if (errorCallback) errorCallback(error);
    }
  }
}

// Initialize database connection based on platform
let db: any;

if (Platform.OS === 'web') {
  db = new WebDatabase(DB_NAME, DB_VERSION);
} else {
  const SQLite = require('expo-sqlite');
  db = SQLite.openDatabaseSync(DB_NAME);
}

export { db };

// Database initialization function
export const initializeDatabase = async (): Promise<void> => {
  // Initialize web database if needed
  if (Platform.OS === 'web' && db.init) {
    await db.init();
  }

  try {
    // Enable foreign keys for referential integrity (native platforms)
    if (Platform.OS !== 'web' && typeof db.execSync === 'function') {
      db.execSync('PRAGMA foreign_keys = ON;');
    }

    // Create all schemas using the comprehensive schema definitions
    await createAllSchemas();

    // Validate that all tables were created successfully
    const isValid = await validateSchema();
    if (!isValid) {
      throw new Error('Schema validation failed - some tables were not created properly');
    }

    // Populate unit conversion data
    await seedUnitConversions();

    if (__DEV__) {
      console.log('Database initialized successfully with comprehensive schemas');
    }
  } catch (error) {
    if (__DEV__) {
      console.error('Database initialization error:', error);
    }
    throw error;
  }
};

/**
 * Seed the unit_conversions table with default conversion data
 */
const seedUnitConversions = async (): Promise<void> => {
  try {
    const { sql, params } = getBatchUnitConversionSQL();

    if (Platform.OS === 'web') {
      // Web platform - insert each conversion individually
      for (const valueSet of values) {
        await new Promise<void>((resolve, reject) => {
          db.transaction(
            (tx: any) => {
              tx.executeSql(sql, valueSet, resolve, (_: any, error: any) => {
                reject(error);
                return false;
              });
            },
            reject
          );
        });
      }
    } else {
      // Native platform - use batch insert for better performance
      for (const valueSet of values) {
        db.runSync(sql, valueSet);
      }
    }

    if (__DEV__) {
      console.log(`Seeded ${values.length} unit conversions`);
    }
  } catch (error) {
    // Don't fail initialization if seeding fails - unit conversions can be added later
    if (__DEV__) {
      console.warn('Failed to seed unit conversions:', error);
    }
  }
};

// Helper function to get current database version
export const getDatabaseVersion = async (): Promise<number> => {
  try {
    const result = await executeSql(
      'SELECT value FROM database_metadata WHERE key = ?',
      ['version']
    );
    if (result.rows.length > 0) {
      return parseInt(result.rows.item(0).value, 10);
    } else {
      return 0;
    }
  } catch (error) {
    if (__DEV__) {
      console.error('Error getting database version:', error);
    }
    return 0;
  }
};

// Helper function to execute SQL with promise
export const executeSql = (
  sql: string,
  params: (string | number)[] = []
): Promise<any> => {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      db.transaction(
        (tx: any) => {
          tx.executeSql(
            sql,
            params,
            (_: any, result: any) => {
              resolve(result);
            },
            (_: any, error: any) => {
              reject(error);
              return false;
            }
          );
        },
        (error: any) => {
          reject(error);
        }
      );
    });
  } else {
    // Native platforms - use new synchronous API
    try {
      if (sql.toLowerCase().includes('select')) {
        const result = db.getAllSync(sql, params);
        return Promise.resolve({
          rows: {
            length: result.length,
            item: (index: number) => result[index],
          },
        });
      } else {
        const result = db.runSync(sql, params);
        return Promise.resolve({
          rows: { length: 0 },
          rowsAffected: result.changes,
          insertId: result.lastInsertRowId,
        });
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }
};
