/**
 * Migration 005: Update ProductVariants to use GS1 net content standard
 * 
 * Changes:
 * - Rename package_size field to net_content and change type from TEXT to REAL
 * - Rename unit field to uom (Unit of Measure)
 * - Parse existing package_size text values to extract numeric net content
 * - Update indexes to reflect new field names
 */

import { DatabaseMigration } from './BaseMigration';
import { MigrationType } from './types';

export class UpdateProductVariantsNetContentMigration extends DatabaseMigration {
  readonly id = '005_update_product_variants_net_content';
  readonly version = 5;
  readonly type = MigrationType.DATABASE;
  readonly description = 'Update ProductVariants to use GS1 net content standard';

  // Main SQL statements that work on all platforms
  readonly upSql = [
    // Step 1: Add new columns with temporary names
    'ALTER TABLE product_variants ADD COLUMN net_content_temp REAL;',
    'ALTER TABLE product_variants ADD COLUMN uom_temp TEXT;',

    // Step 2: Parse existing package_size values and populate new columns
    // This regex extracts numeric values from text like "500ml bottle" -> 500
    `UPDATE product_variants 
     SET 
       net_content_temp = CAST(
         CASE 
           WHEN package_size REGEXP '^[0-9]+(\\.[0-9]+)?' THEN
             CAST(SUBSTR(package_size, 1, INSTR(package_size || ' ', ' ') - 1) AS REAL)
           ELSE 1.0
         END AS REAL
       ),
       uom_temp = unit
     WHERE package_size IS NOT NULL;`,

    // Step 3: Drop old columns
    'ALTER TABLE product_variants DROP COLUMN package_size;',
    'ALTER TABLE product_variants DROP COLUMN unit;',

    // Step 4: Rename new columns to final names
    'ALTER TABLE product_variants RENAME COLUMN net_content_temp TO net_content;',
    'ALTER TABLE product_variants RENAME COLUMN uom_temp TO uom;',

    // Step 5: Update indexes
    'DROP INDEX IF EXISTS idx_product_variants_barcode;',
    'DROP INDEX IF EXISTS idx_product_variants_barcode_unique;',
    'CREATE INDEX IF NOT EXISTS idx_product_variants_barcode ON product_variants (barcode_value);',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_barcode_unique ON product_variants (barcode_value) WHERE deleted_at IS NULL AND barcode_value IS NOT NULL;',
  ];

  readonly downSql = [
    // Step 1: Add old columns back
    'ALTER TABLE product_variants ADD COLUMN package_size TEXT;',
    'ALTER TABLE product_variants ADD COLUMN unit TEXT;',

    // Step 2: Convert net_content back to package_size text format
    `UPDATE product_variants 
     SET 
       package_size = CAST(net_content AS TEXT) || uom || ' package',
       unit = uom
     WHERE net_content IS NOT NULL AND uom IS NOT NULL;`,

    // Step 3: Drop new columns
    'ALTER TABLE product_variants DROP COLUMN net_content;',
    'ALTER TABLE product_variants DROP COLUMN uom;',

    // Step 4: Restore old indexes
    'DROP INDEX IF EXISTS idx_product_variants_barcode;',
    'DROP INDEX IF EXISTS idx_product_variants_barcode_unique;',
    'CREATE INDEX IF NOT EXISTS idx_product_variants_barcode ON product_variants (barcode_value);',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_barcode_unique ON product_variants (barcode_value) WHERE deleted_at IS NULL AND barcode_value IS NOT NULL;',
  ];

  // Platform-specific SQL for native (if needed for proper rollback)
  readonly nativeDownSql = [
    // For native platforms, we could do a full table recreation if needed
    // But for this case, the standard rollback should work
    'ALTER TABLE product_variants ADD COLUMN package_size TEXT;',
    'ALTER TABLE product_variants ADD COLUMN unit TEXT;',
    `UPDATE product_variants 
     SET 
       package_size = CAST(net_content AS TEXT) || uom || ' package',
       unit = uom
     WHERE net_content IS NOT NULL AND uom IS NOT NULL;`,
    'ALTER TABLE product_variants DROP COLUMN net_content;',
    'ALTER TABLE product_variants DROP COLUMN uom;',
  ];
}

// Register the migration
export const migration005 = new UpdateProductVariantsNetContentMigration();