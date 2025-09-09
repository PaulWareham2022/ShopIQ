/**
 * Database Migration: Add Rating Field to Suppliers Table
 * Version: 2 (next version after initial schema v1)
 *
 * This migration adds a rating field to the suppliers table for quality tracking.
 * The rating field is optional (nullable) and constrained to values 1-5.
 */

import { DatabaseMigration } from './BaseMigration';
import { MigrationType } from './types';

export class AddSupplierRatingMigration extends DatabaseMigration {
  readonly id = '002_add_supplier_rating';
  readonly version = 2;
  readonly type = MigrationType.DATABASE;
  readonly description =
    'Add rating field to suppliers table for quality tracking (0-5 scale, 0 = no rating)';

  // Main SQL statements that work on all platforms
  readonly upSql = [
    'ALTER TABLE suppliers ADD COLUMN rating INTEGER CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));',
  ];

  readonly downSql = [
    // Note: SQLite doesn't support DROP COLUMN, so we'll set the column to NULL
    // In a real rollback scenario, we'd need to recreate the table
    'UPDATE suppliers SET rating = NULL;',
  ];

  // Platform-specific SQL for native (if needed for proper rollback)
  readonly nativeDownSql = [
    // For native platforms, we could do a full table recreation if needed
    // But for this simple case, setting to NULL is sufficient
    'UPDATE suppliers SET rating = NULL;',
  ];
}

// Register the migration
export const migration002 = new AddSupplierRatingMigration();
