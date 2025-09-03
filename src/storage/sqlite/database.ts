import { Platform } from 'react-native';

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

  if (Platform.OS === 'web') {
    // Use the existing web transaction method
    return new Promise((resolve, reject) => {
      db.transaction(
        tx => {
          // Create suppliers table
          tx.executeSql(`
          CREATE TABLE IF NOT EXISTS suppliers (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            website TEXT,
            notes TEXT,
            shipping_policy TEXT,
            quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
          );
        `);

          // Create inventory_items table
          tx.executeSql(`
          CREATE TABLE IF NOT EXISTS inventory_items (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            canonical_unit TEXT NOT NULL,
            shelf_life_sensitive INTEGER DEFAULT 0,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
          );
        `);

          // Create offers table
          tx.executeSql(`
          CREATE TABLE IF NOT EXISTS offers (
            id TEXT PRIMARY KEY NOT NULL,
            inventory_item_id TEXT NOT NULL,
            supplier_id TEXT NOT NULL,
            price_raw REAL NOT NULL,
            price_including_shipping REAL,
            price_including_tax REAL,
            quantity_raw REAL NOT NULL,
            unit_raw TEXT NOT NULL,
            quantity_canonical REAL NOT NULL,
            price_per_canonical_unit REAL NOT NULL,
            date TEXT NOT NULL,
            quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
            notes TEXT,
            photo_uri TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT,
            FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id),
            FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
          );
        `);

          // Create unit_conversions table
          tx.executeSql(`
          CREATE TABLE IF NOT EXISTS unit_conversions (
            id TEXT PRIMARY KEY NOT NULL,
            from_unit TEXT NOT NULL,
            to_unit TEXT NOT NULL,
            factor REAL NOT NULL,
            category TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
          );
        `);

          // Create bundles table (for future use)
          tx.executeSql(`
          CREATE TABLE IF NOT EXISTS bundles (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
          );
        `);

          // Create bundle_items table (for future use)
          tx.executeSql(`
          CREATE TABLE IF NOT EXISTS bundle_items (
            id TEXT PRIMARY KEY NOT NULL,
            bundle_id TEXT NOT NULL,
            inventory_item_id TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT,
            FOREIGN KEY (bundle_id) REFERENCES bundles (id),
            FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id)
          );
        `);

          // Create database_metadata table for migrations
          tx.executeSql(`
          CREATE TABLE IF NOT EXISTS database_metadata (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
        `);

          // Insert initial database version
          tx.executeSql(
            `
          INSERT OR IGNORE INTO database_metadata (key, value, created_at, updated_at)
          VALUES ('version', ?, datetime('now'), datetime('now'));
        `,
            [DB_VERSION.toString()]
          );
        },
        error => {
          if (__DEV__) {
            console.error('Database initialization error:', error);
          }
          reject(error);
        },
        () => {
          if (__DEV__) {
            console.log('Database initialized successfully');
          }
          resolve();
        }
      );
    });
  } else {
    // Native platforms - use new synchronous API
    try {
      // Enforce referential integrity
      db.execSync('PRAGMA foreign_keys = ON;');

      // Create suppliers table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS suppliers (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          website TEXT,
          notes TEXT,
          shipping_policy TEXT,
          quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
      `);

      // Create inventory_items table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS inventory_items (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          canonical_unit TEXT NOT NULL,
          shelf_life_sensitive INTEGER DEFAULT 0,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
      `);

      // Create offers table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS offers (
          id TEXT PRIMARY KEY NOT NULL,
          inventory_item_id TEXT NOT NULL,
          supplier_id TEXT NOT NULL,
          price_raw REAL NOT NULL,
          price_including_shipping REAL,
          price_including_tax REAL,
          quantity_raw REAL NOT NULL,
          unit_raw TEXT NOT NULL,
          quantity_canonical REAL NOT NULL,
          price_per_canonical_unit REAL NOT NULL,
          date TEXT NOT NULL,
          quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
          notes TEXT,
          photo_uri TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id),
          FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
        );
      `);

      // Add indexes for offers table performance
      db.execSync(
        'CREATE INDEX IF NOT EXISTS idx_offers_inventory ON offers (inventory_item_id);'
      );
      db.execSync(
        'CREATE INDEX IF NOT EXISTS idx_offers_supplier ON offers (supplier_id);'
      );
      db.execSync(
        'CREATE INDEX IF NOT EXISTS idx_offers_date ON offers (date);'
      );

      // Create unit_conversions table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS unit_conversions (
          id TEXT PRIMARY KEY NOT NULL,
          from_unit TEXT NOT NULL,
          to_unit TEXT NOT NULL,
          factor REAL NOT NULL,
          category TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
      `);

      // Add index for unit conversions performance
      db.execSync(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_unit_conv_pair ON unit_conversions (from_unit, to_unit);'
      );

      // Create bundles table (for future use)
      db.execSync(`
        CREATE TABLE IF NOT EXISTS bundles (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
      `);

      // Create bundle_items table (for future use)
      db.execSync(`
        CREATE TABLE IF NOT EXISTS bundle_items (
          id TEXT PRIMARY KEY NOT NULL,
          bundle_id TEXT NOT NULL,
          inventory_item_id TEXT NOT NULL,
          quantity REAL NOT NULL,
          unit TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          FOREIGN KEY (bundle_id) REFERENCES bundles (id),
          FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id)
        );
      `);

      // Create database_metadata table for migrations
      db.execSync(`
        CREATE TABLE IF NOT EXISTS database_metadata (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // Insert initial database version
      db.runSync(
        `
        INSERT OR IGNORE INTO database_metadata (key, value, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'));
      `,
        ['version', DB_VERSION.toString()]
      );

      if (__DEV__) {
        console.log('Database initialized successfully (native)');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Database initialization error (native):', error);
      }
      throw error;
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
