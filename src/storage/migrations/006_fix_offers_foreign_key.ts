import { DatabaseMigration } from './BaseMigration';
import { MigrationType } from './types';

/**
 * Migration 006: Fix offers table foreign key constraint
 * 
 * The offers table still has a foreign key constraint that references
 * the old 'inventory_items' table, but we renamed it to 'products'.
 * This migration recreates the offers table with the correct foreign key.
 */
export class FixOffersForeignKeyMigration extends DatabaseMigration {
  readonly id = '006_fix_offers_foreign_key';
  readonly version = 6;
  readonly type = MigrationType.DATABASE;
  readonly description = 'Fix offers table foreign key to reference products instead of inventory_items';

  readonly upSql = [
    // Step 1: Create a backup of the offers table
    'CREATE TABLE offers_backup AS SELECT * FROM offers;',
    
    // Step 2: Drop the old offers table (this will remove the incorrect foreign key)
    'DROP TABLE offers;',
    
    // Step 3: Recreate the offers table with the correct foreign key constraint
    `CREATE TABLE offers (
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
      
      -- Foreign key constraints (CORRECTED)
      FOREIGN KEY (inventory_item_id) REFERENCES products (id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE CASCADE,
      FOREIGN KEY (bundle_id) REFERENCES bundles (id) ON DELETE SET NULL
    );`,
    
    // Step 4: Restore data from backup
    'INSERT INTO offers SELECT * FROM offers_backup;',
    
    // Step 5: Drop the backup table
    'DROP TABLE offers_backup;',
    
    // Step 6: Recreate indexes
    'CREATE INDEX IF NOT EXISTS idx_offers_inventory_item_id ON offers (inventory_item_id);',
    'CREATE INDEX IF NOT EXISTS idx_offers_supplier_id ON offers (supplier_id);',
    'CREATE INDEX IF NOT EXISTS idx_offers_observed_at ON offers (observed_at);',
    'CREATE INDEX IF NOT EXISTS idx_offers_effective_price ON offers (effective_price_per_canonical);',
    'CREATE INDEX IF NOT EXISTS idx_offers_source_type ON offers (source_type);',
    'CREATE INDEX IF NOT EXISTS idx_offers_created_at ON offers (created_at);',
    'CREATE INDEX IF NOT EXISTS idx_offers_deleted_at ON offers (deleted_at);',
    
    // Step 7: Recreate triggers
    `CREATE TRIGGER IF NOT EXISTS trigger_offers_updated_at
      AFTER UPDATE ON offers
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE offers SET updated_at = datetime('now') WHERE id = NEW.id;
      END;`,
  ];
}

export const migration006 = new FixOffersForeignKeyMigration();
