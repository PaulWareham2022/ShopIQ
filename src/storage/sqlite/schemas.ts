/**
 * SQLite Schema Definitions
 *
 * This file contains the complete SQLite table schemas for all entities
 * as defined in the PRD. Each schema matches the TypeScript interfaces
 * exactly and includes proper constraints, indexes, and relationships.
 */

// Note: db is imported dynamically in functions to avoid circular dependencies

// Schema version for migration tracking
export const SCHEMA_VERSION = 1;

/**
 * SUPPLIERS TABLE
 * Stores supplier/vendor information with shipping policies and contact details
 */
export const SUPPLIERS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS suppliers (
    -- Primary identifier (UUIDv4)
    id TEXT PRIMARY KEY NOT NULL,
    
    -- Core supplier information
    name TEXT NOT NULL,
    country_code TEXT NOT NULL CHECK (length(country_code) = 2),
    region_code TEXT CHECK (region_code IS NULL OR length(region_code) >= 4),
    store_code TEXT,
    default_currency TEXT NOT NULL CHECK (length(default_currency) = 3),
    
    -- Membership information
    membership_required INTEGER NOT NULL DEFAULT 0 CHECK (membership_required IN (0, 1)),
    membership_type TEXT,
    
    -- Shipping policy stored as JSON
    shipping_policy TEXT, -- JSON object with freeShippingThreshold, shippingBaseCost, etc.
    
    -- URL patterns for automatic supplier detection
    url_patterns TEXT, -- JSON array of hostname/path patterns
    
    -- Free-form notes
    notes TEXT,
    
    -- Standard timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );
`;

/**
 * INVENTORY_ITEMS TABLE
 * Stores product/item definitions with canonical units and shelf-life information
 */
export const INVENTORY_ITEMS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS inventory_items (
    -- Primary identifier (UUIDv4)
    id TEXT PRIMARY KEY NOT NULL,
    
    -- Core item information
    name TEXT NOT NULL,
    category TEXT,
    
    -- Unit and dimension information
    canonical_dimension TEXT NOT NULL CHECK (
      canonical_dimension IN ('mass', 'volume', 'count', 'length', 'area')
    ),
    canonical_unit TEXT NOT NULL,
    
    -- Shelf-life tracking
    shelf_life_sensitive INTEGER NOT NULL DEFAULT 0 CHECK (shelf_life_sensitive IN (0, 1)),
    shelf_life_days INTEGER CHECK (shelf_life_days IS NULL OR shelf_life_days > 0),
    
    -- Usage and optimization data
    usage_rate_per_day REAL CHECK (usage_rate_per_day IS NULL OR usage_rate_per_day >= 0),
    
    -- Equivalence and attributes
    attributes TEXT, -- JSON object for item attributes (concentration, grade, etc.)
    equivalence_factor REAL DEFAULT 1.0 CHECK (equivalence_factor > 0),
    
    -- Free-form notes
    notes TEXT,
    
    -- Standard timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );
`;

/**
 * OFFERS TABLE
 * Stores price offers with normalization data and computed metrics
 */
export const OFFERS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS offers (
    -- Primary identifier (UUIDv4)
    id TEXT PRIMARY KEY NOT NULL,
    
    -- Foreign key relationships
    inventory_item_id TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    
    -- Supplier snapshot and URL information
    supplier_name_snapshot TEXT,
    supplier_url TEXT,
    
    -- Source tracking
    source_type TEXT NOT NULL CHECK (
      source_type IN ('manual', 'url', 'ocr', 'api')
    ),
    source_url TEXT,
    raw_capture TEXT, -- JSON or text blob of raw parsed values
    
    -- Timing information
    observed_at TEXT NOT NULL, -- ISO timestamp when price was observed
    captured_at TEXT NOT NULL DEFAULT (datetime('now')), -- When entered into app
    
    -- Price information
    total_price REAL NOT NULL CHECK (total_price >= 0),
    currency TEXT NOT NULL CHECK (length(currency) = 3),
    
    -- Tax information
    is_tax_included INTEGER NOT NULL DEFAULT 1 CHECK (is_tax_included IN (0, 1)),
    tax_rate REAL CHECK (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 1)),
    
    -- Shipping information
    shipping_cost REAL CHECK (shipping_cost IS NULL OR shipping_cost >= 0),
    min_order_amount REAL CHECK (min_order_amount IS NULL OR min_order_amount >= 0),
    free_shipping_threshold_at_capture REAL CHECK (
      free_shipping_threshold_at_capture IS NULL OR free_shipping_threshold_at_capture >= 0
    ),
    shipping_included INTEGER DEFAULT 0 CHECK (shipping_included IN (0, 1)),
    
    -- Quantity information
    amount REAL NOT NULL CHECK (amount > 0),
    amount_unit TEXT NOT NULL,
    amount_canonical REAL NOT NULL CHECK (amount_canonical > 0),
    
    -- Computed price metrics (stored for performance)
    price_per_canonical_excl_shipping REAL NOT NULL CHECK (price_per_canonical_excl_shipping >= 0),
    price_per_canonical_incl_shipping REAL NOT NULL CHECK (price_per_canonical_incl_shipping >= 0),
    effective_price_per_canonical REAL NOT NULL CHECK (effective_price_per_canonical >= 0),
    
    -- Bundle and quality information
    bundle_id TEXT,
    quality_rating INTEGER CHECK (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5)),
    
    -- Additional metadata
    notes TEXT,
    photo_uri TEXT,
    computed_by_version TEXT,
    
    -- Standard timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    
    -- Foreign key constraints
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE CASCADE,
    FOREIGN KEY (bundle_id) REFERENCES bundles (id) ON DELETE SET NULL
  );
`;

/**
 * UNIT_CONVERSIONS TABLE
 * Static reference table for unit conversions within dimensions
 */
export const UNIT_CONVERSIONS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS unit_conversions (
    -- Primary identifier (UUIDv4)
    id TEXT PRIMARY KEY NOT NULL,
    
    -- Conversion information
    from_unit TEXT NOT NULL,
    to_unit TEXT NOT NULL,
    factor REAL NOT NULL CHECK (factor > 0),
    
    -- Dimension validation
    dimension TEXT NOT NULL CHECK (
      dimension IN ('mass', 'volume', 'count', 'length', 'area')
    ),
    
    -- Standard timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    
    -- Ensure unique conversions within dimension
    UNIQUE (from_unit, to_unit, dimension)
  );
`;

/**
 * BUNDLES TABLE
 * For future multi-item bundle support
 */
export const BUNDLES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS bundles (
    -- Primary identifier (UUIDv4)
    id TEXT PRIMARY KEY NOT NULL,
    
    -- Bundle information
    supplier_id TEXT NOT NULL,
    items TEXT NOT NULL, -- JSON array of BundleItem objects
    price_allocation_method TEXT NOT NULL DEFAULT 'equal' CHECK (
      price_allocation_method IN ('equal', 'by-canonical-amount', 'manual')
    ),
    
    -- Standard timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    
    -- Foreign key constraints
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE CASCADE
  );
`;

/**
 * DATABASE_METADATA TABLE
 * For schema versioning and migration tracking
 */
export const DATABASE_METADATA_SCHEMA = `
  CREATE TABLE IF NOT EXISTS database_metadata (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

/**
 * INDEXES for performance optimization
 */
export const INDEXES = [
  // Supplier indexes
  'CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers (name);',
  'CREATE INDEX IF NOT EXISTS idx_suppliers_country ON suppliers (country_code);',
  'CREATE INDEX IF NOT EXISTS idx_suppliers_deleted ON suppliers (deleted_at);',

  // Inventory item indexes
  'CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory_items (name);',
  'CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items (category);',
  'CREATE INDEX IF NOT EXISTS idx_inventory_dimension ON inventory_items (canonical_dimension);',
  'CREATE INDEX IF NOT EXISTS idx_inventory_deleted ON inventory_items (deleted_at);',

  // Offer indexes (critical for comparison queries)
  'CREATE INDEX IF NOT EXISTS idx_offers_inventory_item ON offers (inventory_item_id);',
  'CREATE INDEX IF NOT EXISTS idx_offers_supplier ON offers (supplier_id);',
  'CREATE INDEX IF NOT EXISTS idx_offers_observed_at ON offers (observed_at);',
  'CREATE INDEX IF NOT EXISTS idx_offers_captured_at ON offers (captured_at);',
  'CREATE INDEX IF NOT EXISTS idx_offers_effective_price ON offers (effective_price_per_canonical);',
  'CREATE INDEX IF NOT EXISTS idx_offers_item_price ON offers (inventory_item_id, effective_price_per_canonical);',
  'CREATE INDEX IF NOT EXISTS idx_offers_deleted ON offers (deleted_at);',

  // Compound index for finding best offers per item
  'CREATE INDEX IF NOT EXISTS idx_offers_best_price ON offers (inventory_item_id, effective_price_per_canonical, observed_at) WHERE deleted_at IS NULL;',

  // Unit conversion indexes
  'CREATE INDEX IF NOT EXISTS idx_unit_conv_from ON unit_conversions (from_unit);',
  'CREATE INDEX IF NOT EXISTS idx_unit_conv_to ON unit_conversions (to_unit);',
  'CREATE INDEX IF NOT EXISTS idx_unit_conv_dimension ON unit_conversions (dimension);',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_unit_conv_unique ON unit_conversions (from_unit, to_unit) WHERE deleted_at IS NULL;',

  // Bundle indexes
  'CREATE INDEX IF NOT EXISTS idx_bundles_supplier ON bundles (supplier_id);',
  'CREATE INDEX IF NOT EXISTS idx_bundles_deleted ON bundles (deleted_at);',
];

/**
 * TRIGGERS for automatic timestamp updates
 */
export const TRIGGERS = [
  // Suppliers update trigger
  `CREATE TRIGGER IF NOT EXISTS trg_suppliers_updated_at
   AFTER UPDATE ON suppliers
   BEGIN
     UPDATE suppliers SET updated_at = datetime('now') WHERE id = NEW.id;
   END;`,

  // Inventory items update trigger
  `CREATE TRIGGER IF NOT EXISTS trg_inventory_items_updated_at
   AFTER UPDATE ON inventory_items
   BEGIN
     UPDATE inventory_items SET updated_at = datetime('now') WHERE id = NEW.id;
   END;`,

  // Offers update trigger
  `CREATE TRIGGER IF NOT EXISTS trg_offers_updated_at
   AFTER UPDATE ON offers
   BEGIN
     UPDATE offers SET updated_at = datetime('now') WHERE id = NEW.id;
   END;`,

  // Unit conversions update trigger
  `CREATE TRIGGER IF NOT EXISTS trg_unit_conversions_updated_at
   AFTER UPDATE ON unit_conversions
   BEGIN
     UPDATE unit_conversions SET updated_at = datetime('now') WHERE id = NEW.id;
   END;`,

  // Bundles update trigger
  `CREATE TRIGGER IF NOT EXISTS trg_bundles_updated_at
   AFTER UPDATE ON bundles
   BEGIN
     UPDATE bundles SET updated_at = datetime('now') WHERE id = NEW.id;
   END;`,
];

/**
 * All table schemas in dependency order
 */
export const ALL_SCHEMAS = [
  SUPPLIERS_SCHEMA,
  INVENTORY_ITEMS_SCHEMA,
  BUNDLES_SCHEMA,
  OFFERS_SCHEMA,
  UNIT_CONVERSIONS_SCHEMA,
  DATABASE_METADATA_SCHEMA,
];

/**
 * Execute all schema creation statements
 */
export const createAllSchemas = async (): Promise<void> => {
  // Dynamically import db to avoid circular dependencies
  const { db } = await import('./database');

  const schemas = [...ALL_SCHEMAS, ...INDEXES, ...TRIGGERS];

  for (const schema of schemas) {
    try {
      if (typeof db.execSync === 'function') {
        // Native platform - use synchronous API
        db.execSync(schema);
      } else {
        // Web platform - use promise-based API
        await new Promise<void>((resolve, reject) => {
          db.transaction((tx: any) => tx.executeSql(schema), reject, resolve);
        });
      }
    } catch (error) {
      console.error('Failed to execute schema:', schema, error);
      throw error;
    }
  }

  // Set schema version in metadata
  const versionSql = `
    INSERT OR REPLACE INTO database_metadata (key, value, created_at, updated_at)
    VALUES ('schema_version', ?, datetime('now'), datetime('now'));
  `;

  try {
    if (typeof db.runSync === 'function') {
      db.runSync(versionSql, [SCHEMA_VERSION.toString()]);
    } else {
      await new Promise<void>((resolve, reject) => {
        db.transaction(
          (tx: any) => tx.executeSql(versionSql, [SCHEMA_VERSION.toString()]),
          reject,
          resolve
        );
      });
    }
  } catch (error) {
    console.error('Failed to set schema version:', error);
    throw error;
  }
};

/**
 * Get current schema version from database
 */
export const getSchemaVersion = async (): Promise<number> => {
  const { db } = await import('./database');
  const sql = 'SELECT value FROM database_metadata WHERE key = ?';
  const params = ['schema_version'];

  try {
    if (typeof db.getAllSync === 'function') {
      // Native platform
      const rows = db.getAllSync(sql, params);
      return rows.length > 0 ? parseInt(rows[0].value, 10) : 0;
    } else {
      // Web platform
      return new Promise((resolve, reject) => {
        db.transaction((tx: any) => {
          tx.executeSql(
            sql,
            params,
            (_: any, result: any) => {
              if (result.rows.length > 0) {
                resolve(parseInt(result.rows.item(0).value, 10));
              } else {
                resolve(0);
              }
            },
            (_: any, error: any) => {
              reject(error);
              return true;
            }
          );
        }, reject);
      });
    }
  } catch (error) {
    console.error('Failed to get schema version:', error);
    return 0;
  }
};

/**
 * Validate that all required tables exist
 */
export const validateSchema = async (): Promise<boolean> => {
  const { db } = await import('./database');
  const requiredTables = [
    'suppliers',
    'inventory_items',
    'offers',
    'unit_conversions',
    'bundles',
    'database_metadata',
  ];

  const sql =
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';";

  try {
    let existingTables: string[] = [];

    if (typeof db.getAllSync === 'function') {
      // Native platform
      const rows = db.getAllSync(sql);
      existingTables = rows.map((row: any) => row.name);
    } else {
      // Web platform
      existingTables = await new Promise((resolve, reject) => {
        db.transaction((tx: any) => {
          tx.executeSql(
            sql,
            [],
            (_: any, result: any) => {
              const tables = [];
              for (let i = 0; i < result.rows.length; i++) {
                tables.push(result.rows.item(i).name);
              }
              resolve(tables);
            },
            (_: any, error: any) => {
              reject(error);
              return true;
            }
          );
        }, reject);
      });
    }

    // Check if all required tables exist
    const missingTables = requiredTables.filter(
      table => !existingTables.includes(table)
    );

    if (missingTables.length > 0) {
      console.warn('Missing database tables:', missingTables);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to validate schema:', error);
    return false;
  }
};
