/**
 * Database Migration: Add Product Variants Table
 * Version: 3 (next version after supplier rating v2)
 *
 * This migration adds the product_variants table to support barcode integration
 * and multiple package sizes per inventory item.
 */

import { DatabaseMigration } from './BaseMigration';
import { MigrationType } from './types';

export class AddProductVariantsTableMigration extends DatabaseMigration {
  readonly id = '003_add_product_variants_table';
  readonly version = 3;
  readonly type = MigrationType.DATABASE;
  readonly description =
    'Add product_variants table for barcode integration and multiple package sizes per inventory item';

  // Main SQL statements that work on all platforms
  readonly upSql = [
    `CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY NOT NULL,
      inventory_item_id TEXT NOT NULL,
      package_size TEXT NOT NULL,
      unit TEXT NOT NULL,
      barcode_value TEXT CHECK (barcode_value IS NULL OR (length(barcode_value) >= 8 AND length(barcode_value) <= 20)),
      metadata TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      FOREIGN KEY (inventory_item_id) REFERENCES products (id) ON DELETE CASCADE
    );`,
    'CREATE INDEX IF NOT EXISTS idx_product_variants_inventory_item_id ON product_variants (inventory_item_id);',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_barcode_value ON product_variants (barcode_value) WHERE barcode_value IS NOT NULL;',
  ];

  readonly downSql = [
    'DROP INDEX IF EXISTS idx_product_variants_barcode_value;',
    'DROP INDEX IF EXISTS idx_product_variants_inventory_item_id;',
    'DROP TABLE IF EXISTS product_variants;',
  ];

  // Platform-specific SQL (if needed for proper rollback)
  readonly nativeDownSql = [
    'DROP INDEX IF EXISTS idx_product_variants_barcode_value;',
    'DROP INDEX IF EXISTS idx_product_variants_inventory_item_id;',
    'DROP TABLE IF EXISTS product_variants;',
  ];
}

// Register the migration
export const migration003 = new AddProductVariantsTableMigration();
