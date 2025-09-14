import { DatabaseMigration, MigrationType } from './types';

/**
 * Migration 004: Rename inventory_items table to products
 * 
 * This migration renames the inventory_items table to products to better reflect
 * that we're tracking product definitions rather than inventory levels.
 * 
 * Changes:
 * - Rename inventory_items table to products
 * - Update foreign key references in product_variants table
 * - Rename related indexes for consistency
 * - Update trigger names
 * 
 * Note: This migration is conditional - it only runs if inventory_items table exists.
 * For fresh installs, the schema will create products table directly.
 */
export class RenameInventoryItemsToProductsMigration extends DatabaseMigration {
  readonly id = '004_rename_inventory_items_to_products';
  readonly version = 4; // Next database version
  readonly type = MigrationType.DATABASE;
  readonly description = 'Rename inventory_items table to products and update related references';


  readonly upSql = [
    // Step 1: Drop the existing foreign key constraint from product_variants
    // (SQLite doesn't support dropping constraints directly, so we'll recreate the table)
    `CREATE TABLE product_variants_backup AS 
     SELECT * FROM product_variants;`,
    
    'DROP TABLE product_variants;',
    
    // Step 2: Rename the main table
    'ALTER TABLE inventory_items RENAME TO products;',
    
    // Step 3: Recreate product_variants with updated foreign key reference
    `CREATE TABLE product_variants (
      id TEXT PRIMARY KEY NOT NULL,
      inventory_item_id TEXT NOT NULL,
      name TEXT NOT NULL,
      package_size REAL NOT NULL,
      package_unit TEXT NOT NULL,
      barcode TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      FOREIGN KEY (inventory_item_id) REFERENCES products (id) ON DELETE CASCADE
    );`,
    
    // Step 4: Restore data to product_variants
    `INSERT INTO product_variants 
     SELECT * FROM product_variants_backup;`,
    
    'DROP TABLE product_variants_backup;',
    
    // Step 5: Recreate indexes with new names
    'DROP INDEX IF EXISTS idx_inventory_name;',
    'DROP INDEX IF EXISTS idx_inventory_category;',
    'DROP INDEX IF EXISTS idx_inventory_dimension;',
    'DROP INDEX IF EXISTS idx_inventory_deleted;',
    
    'CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);',
    'CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);',
    'CREATE INDEX IF NOT EXISTS idx_products_dimension ON products (canonical_dimension);',
    'CREATE INDEX IF NOT EXISTS idx_products_deleted ON products (deleted_at);',
    
    // Step 6: Recreate trigger with new name
    'DROP TRIGGER IF EXISTS trg_inventory_items_updated_at;',
    `CREATE TRIGGER IF NOT EXISTS trg_products_updated_at
     AFTER UPDATE ON products
     BEGIN
       UPDATE products SET updated_at = datetime('now') WHERE id = NEW.id;
     END;`,
    
    // Step 7: Update database version
    `UPDATE database_metadata SET value = '4' WHERE key = 'version';`
  ];

  readonly downSql = [
    // Step 1: Drop the foreign key constraint from product_variants
    `CREATE TABLE product_variants_backup AS 
     SELECT * FROM product_variants;`,
    
    'DROP TABLE product_variants;',
    
    // Step 2: Rename the main table back
    'ALTER TABLE products RENAME TO inventory_items;',
    
    // Step 3: Recreate product_variants with original foreign key reference
    `CREATE TABLE product_variants (
      id TEXT PRIMARY KEY NOT NULL,
      inventory_item_id TEXT NOT NULL,
      name TEXT NOT NULL,
      package_size REAL NOT NULL,
      package_unit TEXT NOT NULL,
      barcode TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id) ON DELETE CASCADE
    );`,
    
    // Step 4: Restore data to product_variants
    `INSERT INTO product_variants 
     SELECT * FROM product_variants_backup;`,
    
    'DROP TABLE product_variants_backup;',
    
    // Step 5: Recreate original indexes
    'DROP INDEX IF EXISTS idx_products_name;',
    'DROP INDEX IF EXISTS idx_products_category;',
    'DROP INDEX IF EXISTS idx_products_dimension;',
    'DROP INDEX IF EXISTS idx_products_deleted;',
    
    'CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory_items (name);',
    'CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items (category);',
    'CREATE INDEX IF NOT EXISTS idx_inventory_dimension ON inventory_items (canonical_dimension);',
    'CREATE INDEX IF NOT EXISTS idx_inventory_deleted ON inventory_items (deleted_at);',
    
    // Step 6: Recreate original trigger
    'DROP TRIGGER IF EXISTS trg_products_updated_at;',
    `CREATE TRIGGER IF NOT EXISTS trg_inventory_items_updated_at
     AFTER UPDATE ON inventory_items
     BEGIN
       UPDATE inventory_items SET updated_at = datetime('now') WHERE id = NEW.id;
     END;`,
    
    // Step 7: Update database version back
    `UPDATE database_metadata SET value = '3' WHERE key = 'version';`
  ];

  // Platform-specific SQL (same for both platforms in this case)
  readonly webSql = this.upSql;
  readonly nativeSql = this.upSql;
  readonly webDownSql = this.downSql;
  readonly nativeDownSql = this.downSql;
}

// Export the migration instance
export const migration004 = new RenameInventoryItemsToProductsMigration();
