import { Platform } from 'react-native';
import { createAllSchemas, validateSchema } from './schemas';
import { getBatchUnitConversionSQL } from './seed-data';
import { ALL_UNIT_CONVERSIONS } from '../utils/conversion-data';

// Database configuration
const DB_NAME = 'shopiq.db';
const DB_VERSION = 1;

// Web fallback using IndexedDB (via a simple interface)
class WebDatabase {
  private dbName: string;
  private version: number;
  private db: any = null;
  private mockData: Map<string, any[]> = new Map();

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

          if (sql.includes('DROP TABLE IF EXISTS suppliers')) {
            // Mock table drop - clear the mock data
            this.mockData.delete('suppliers');
            if (successCb) {
              successCb(mockTx, { rows: { length: 0 } });
            }
          } else if (sql.includes('CREATE TABLE')) {
            // Mock table creation success
            if (successCb) {
              successCb(mockTx, { rows: { length: 0 } });
            }
          } else if (sql.includes('SELECT name FROM sqlite_master')) {
            // Mock table list query
            const mockTables = [
              'suppliers',
              'products',
              'offers',
              'unit_conversions',
              'bundles',
              'historical_prices',
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
          } else if (sql.includes('INSERT INTO suppliers')) {
            // Mock supplier insert - NEW SCHEMA
            const tableName = 'suppliers';
            if (!this.mockData.has(tableName)) {
              this.mockData.set(tableName, []);
            }
            const suppliers = this.mockData.get(tableName)!;

            // New supplier schema with all the correct fields
            const newSupplier = {
              id: params?.[0] || `supplier_${Date.now()}`,
              name: params?.[1] || 'Test Supplier',
              country_code: params?.[2] || 'CA',
              region_code: params?.[3] || null,
              store_code: params?.[4] || null,
              default_currency: params?.[5] || 'CAD',
              membership_required: params?.[6] || 0,
              membership_type: params?.[7] || null,
              shipping_policy: params?.[8] || null,
              url_patterns: params?.[9] || null,
              notes: params?.[10] || null,
              rating: params?.[11] || null,
              created_at: params?.[12] || new Date().toISOString(),
              updated_at: params?.[13] || new Date().toISOString(),
              deleted_at: null,
            };
            suppliers.push(newSupplier);
            if (successCb) {
              successCb(mockTx, {
                rows: { length: 0 },
                insertId: newSupplier.id,
                rowsAffected: 1,
              });
            }
          } else if (sql.includes('SELECT * FROM suppliers WHERE id = ?')) {
            // Mock supplier find by ID
            const tableName = 'suppliers';
            const suppliers = this.mockData.get(tableName) || [];
            const supplierId = params?.[0];
            const foundSupplier = suppliers.find(
              s => s.id === supplierId && !s.deleted_at
            );
            if (successCb) {
              successCb(mockTx, {
                rows: {
                  length: foundSupplier ? 1 : 0,
                  item: (_i: number) => foundSupplier || null,
                },
              });
            }
          } else if (
            sql.includes('SELECT * FROM suppliers WHERE deleted_at IS NULL') ||
            sql.includes(
              'SELECT name, country_code, default_currency FROM suppliers'
            )
          ) {
            // Mock supplier find all or specific columns
            const tableName = 'suppliers';
            const suppliers = this.mockData.get(tableName) || [];
            const activeSuppliers = suppliers.filter(s => !s.deleted_at);
            if (successCb) {
              successCb(mockTx, {
                rows: {
                  length: activeSuppliers.length,
                  item: (i: number) => activeSuppliers[i] || null,
                },
              });
            }
          } else if (sql.includes('UPDATE suppliers SET deleted_at = ?')) {
            // Mock supplier soft delete
            const tableName = 'suppliers';
            const suppliers = this.mockData.get(tableName) || [];
            const supplierId = params?.[2]; // ID is the last parameter
            const deletedAt = params?.[0];
            const updatedAt = params?.[1];

            const supplierIndex = suppliers.findIndex(s => s.id === supplierId);
            if (supplierIndex !== -1) {
              suppliers[supplierIndex] = {
                ...suppliers[supplierIndex],
                deleted_at: deletedAt,
                updated_at: updatedAt,
              };
            }

            if (successCb) {
              successCb(mockTx, {
                rows: { length: 0 },
                rowsAffected: 1,
                changes: 1,
              });
            }
          } else if (sql.includes('UPDATE suppliers SET')) {
            // Mock supplier update - handle any UPDATE statement for suppliers
            console.log('Web mock handling UPDATE suppliers:', sql);
            console.log('Web mock UPDATE params:', params);
            
            const tableName = 'suppliers';
            const suppliers = this.mockData.get(tableName) || [];
            const supplierId = params?.[params.length - 1]; // ID is the last parameter

            console.log('Web mock looking for supplier ID:', supplierId);
            const supplierIndex = suppliers.findIndex(s => s.id === supplierId);
            console.log('Web mock found supplier at index:', supplierIndex);
            
            if (supplierIndex !== -1) {
              // Parse the SET clause to understand which fields are being updated
              const setClause = sql.match(/SET\s+(.+?)\s+WHERE/)?.[1];
              console.log('Web mock SET clause:', setClause);
              
              if (setClause) {
                const fields = setClause.split(',').map(f => f.trim().split('=')[0].trim());
                console.log('Web mock fields to update:', fields);
                
                // Update the supplier with the provided values
                const updatedSupplier = { ...suppliers[supplierIndex] };
                fields.forEach((field, index) => {
                  if (params && params[index] !== undefined) {
                    console.log(`Web mock updating field ${field} with value:`, params[index]);
                    updatedSupplier[field] = params[index];
                  }
                });
                
                console.log('Web mock updated supplier:', updatedSupplier);
                suppliers[supplierIndex] = updatedSupplier;
              }
            }

            if (successCb) {
              successCb(mockTx, {
                rows: { length: 0 },
                rowsAffected: 1,
                changes: 1,
              });
            }
          } else if (
            sql.includes(
              "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'"
            )
          ) {
            // Mock table count query
            if (successCb) {
              successCb(mockTx, {
                rows: {
                  length: 1,
                  item: (_i: number) => ({ count: 7 }), // 7 tables as per our schema
                },
              });
            }
          } else if (
            sql.includes(
              "SELECT value FROM database_metadata WHERE key = 'version'"
            )
          ) {
            // Mock version query
            if (successCb) {
              successCb(mockTx, {
                rows: {
                  length: 1,
                  item: (_i: number) => ({ value: '1.0.0' }),
                },
              });
            }
          } else if (sql.includes('INSERT INTO offers')) {
            // Mock offers insert
            const tableName = 'offers';
            if (!this.mockData.has(tableName)) {
              this.mockData.set(tableName, []);
            }
            const offers = this.mockData.get(tableName)!;

            // Create new offer from parameters
            const newOffer = {
              id: params?.[0] || `offer_${Date.now()}`,
              inventory_item_id: params?.[1],
              supplier_id: params?.[2],
              supplier_name_snapshot: params?.[3],
              supplier_url: params?.[4],
              source_type: params?.[5],
              source_url: params?.[6],
              raw_capture: params?.[7],
              observed_at: params?.[8],
              captured_at: params?.[9],
              total_price: params?.[10],
              currency: params?.[11],
              is_tax_included: params?.[12],
              tax_rate: params?.[13],
              shipping_cost: params?.[14],
              min_order_amount: params?.[15],
              free_shipping_threshold_at_capture: params?.[16],
              shipping_included: params?.[17],
              amount: params?.[18],
              amount_unit: params?.[19],
              amount_canonical: params?.[20],
              price_per_canonical_excl_shipping: params?.[21],
              price_per_canonical_incl_shipping: params?.[22],
              effective_price_per_canonical: params?.[23],
              bundle_id: params?.[24],
              quality_rating: params?.[25],
              notes: params?.[26],
              photo_uri: params?.[27],
              computed_by_version: params?.[28],
              created_at: params?.[29],
              updated_at: params?.[30],
              deleted_at: null,
            };
            offers.push(newOffer);
            if (successCb) {
              successCb(mockTx, {
                rows: { length: 0 },
                insertId: newOffer.id,
                rowsAffected: 1,
              });
            }
          } else if (sql.includes('INSERT INTO historical_prices')) {
            // Mock historical prices insert
            const tableName = 'historical_prices';
            if (!this.mockData.has(tableName)) {
              this.mockData.set(tableName, []);
            }
            const historicalPrices = this.mockData.get(tableName)!;

            // Create new historical price from parameters
            const newHistoricalPrice = {
              id: params?.[0] || `historical_price_${Date.now()}`,
              inventory_item_id: params?.[1],
              supplier_id: params?.[2],
              price: params?.[3],
              currency: params?.[4],
              unit: params?.[5],
              quantity: params?.[6],
              observed_at: params?.[7],
              source: params?.[8],
              metadata: params?.[9],
              created_at: params?.[10],
              updated_at: params?.[11],
              deleted_at: null,
            };
            historicalPrices.push(newHistoricalPrice);
            if (successCb) {
              successCb(mockTx, {
                rows: { length: 0 },
                insertId: newHistoricalPrice.id,
                rowsAffected: 1,
              });
            }
          } else if (sql.includes('SELECT * FROM offers')) {
            // Mock offers query - return empty result set for now
            if (__DEV__) {
              console.log('[Web DB] Mock offers query:', sql, params);
            }
            const tableName = 'offers';
            if (!this.mockData.has(tableName)) {
              this.mockData.set(tableName, []);
            }
            const offers = this.mockData.get(tableName) || [];

            // Filter offers based on WHERE conditions
            let filteredOffers = offers;

            // Handle inventory_item_id condition
            if (sql.includes('inventory_item_id = ?')) {
              const inventoryItemId = params?.[0];
              filteredOffers = filteredOffers.filter(
                (offer: any) => offer.inventory_item_id === inventoryItemId
              );
            }

            // Handle deleted_at IS NULL condition (soft delete filter)
            if (sql.includes('deleted_at IS NULL')) {
              filteredOffers = filteredOffers.filter(
                (offer: any) => !offer.deleted_at
              );
            }

            // Handle ORDER BY clause
            if (sql.includes('ORDER BY observed_at DESC')) {
              filteredOffers = filteredOffers.sort(
                (a: any, b: any) =>
                  new Date(b.observed_at).getTime() -
                  new Date(a.observed_at).getTime()
              );
            } else if (sql.includes('ORDER BY observed_at ASC')) {
              filteredOffers = filteredOffers.sort(
                (a: any, b: any) =>
                  new Date(a.observed_at).getTime() -
                  new Date(b.observed_at).getTime()
              );
            }

            if (successCb) {
              successCb(mockTx, {
                rows: {
                  length: filteredOffers.length,
                  item: (i: number) => filteredOffers[i],
                },
              });
            }
          } else {
            // Default mock response
            if (successCb) {
              successCb(mockTx, { rows: { length: 0 } });
            }
          }
        },
      };

      // Track pending async operations
      const pendingOps: Promise<any>[] = [];

      // Create enhanced transaction object that tracks async operations
      const enhancedTx = {
        ...mockTx,
        executeSql: (
          sql: string,
          params?: any[],
          successCb?: any,
          errorCb?: any
        ) => {
          const promise = new Promise((resolve, reject) => {
            const enhancedSuccessCb = (tx: any, result: any) => {
              if (successCb) successCb(tx, result);
              resolve(result);
            };
            const enhancedErrorCb = (tx: any, error: any) => {
              if (errorCb) errorCb(tx, error);
              reject(error);
              return false;
            };
            mockTx.executeSql(sql, params, enhancedSuccessCb, enhancedErrorCb);
          });
          pendingOps.push(promise);
          return promise;
        },
      };

      callback(enhancedTx);

      // Wait for all pending operations to complete before calling successCallback
      Promise.all(pendingOps)
        .then(() => successCallback?.())
        .catch(error => {
          if (errorCallback) errorCallback(error);
        });
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
      try {
        db.execSync('PRAGMA foreign_keys = ON;');
      } catch (pragmaError) {
        if (__DEV__) {
          console.error(
            '[Database] Failed to enable foreign keys:',
            pragmaError
          );
        }
        // Continue initialization - foreign keys are nice to have but not critical
      }
    }

    // Create all schemas using the comprehensive schema definitions
    await createAllSchemas();

    // Validate that all tables were created successfully
    const isValid = await validateSchema();
    if (!isValid) {
      throw new Error(
        'Schema validation failed - some tables were not created properly'
      );
    }

    // Populate unit conversion data
    // Temporarily disabled to investigate seeding issues
    // await seedUnitConversions();

    // Clean up duplicate tables in development
    if (__DEV__) {
      try {
        const { cleanupDuplicateTables } = await import('../cleanup-duplicate-tables');
        await cleanupDuplicateTables();
      } catch (error) {
        console.warn('Failed to cleanup duplicate tables:', error);
        // Don't fail initialization if cleanup fails
      }
      
    }

    if (__DEV__) {
      console.log(
        'Database initialized successfully with comprehensive schemas'
      );
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const seedUnitConversions = async (): Promise<void> => {
  try {
    // Check if unit conversions already exist
    const existingCount = db.getAllSync(
      'SELECT COUNT(*) as count FROM unit_conversions'
    );
    if (__DEV__) {
      console.log('Unit conversions check:', existingCount);
    }
    if (
      existingCount &&
      existingCount.length > 0 &&
      existingCount[0].count > 0
    ) {
      if (__DEV__) {
        console.log(
          `Unit conversions already exist (${existingCount[0].count} records), skipping seed`
        );
      }
      return;
    }

    const { params } = getBatchUnitConversionSQL();

    // Split params into groups of 7 (one for each conversion)
    const conversions = [];
    for (let i = 0; i < params.length; i += 7) {
      conversions.push(params.slice(i, i + 7));
    }

    // Insert each conversion individually for better error handling
    for (const conversionParams of conversions) {
      try {
        if (Platform.OS === 'web') {
          // Web platform - use transaction
          await new Promise<void>((resolve, reject) => {
            db.transaction((tx: any) => {
              tx.executeSql(
                'INSERT OR IGNORE INTO unit_conversions (id, from_unit, to_unit, factor, dimension, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                conversionParams,
                resolve,
                (_: any, error: any) => {
                  reject(error);
                  return false;
                }
              );
            }, reject);
          });
        } else {
          // Native platform - use individual insert with IGNORE
          db.runSync(
            'INSERT OR IGNORE INTO unit_conversions (id, from_unit, to_unit, factor, dimension, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            conversionParams
          );
        }
      } catch (insertError) {
        // Log individual insert errors but continue with other conversions
        if (__DEV__) {
          console.warn(
            'Failed to insert unit conversion:',
            conversionParams[0],
            insertError
          );
        }
      }
    }

    if (__DEV__) {
      console.log(`Seeded ${ALL_UNIT_CONVERSIONS.length} unit conversions`);
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
      // Safely access rows across platforms
      let row;
      if (typeof result.rows.item === 'function') {
        row = result.rows.item(0);
      } else {
        row = result.rows[0];
      }

      if (row && row.value) {
        const version = parseInt(row.value, 10);
        return isNaN(version) ? 0 : version;
      }
    }
    return 0;
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
        // Normalize result to match web platform's structure
        return Promise.resolve({
          rows: {
            length: result.length,
            item: (index: number) => result[index],
            _array: result, // Additional property for compatibility
          },
          rowsAffected: 0,
          insertId: undefined,
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
