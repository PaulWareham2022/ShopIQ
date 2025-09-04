/**
 * Example Database Migration: Add Contact Information to Suppliers
 * Version: 2 (next version after initial schema v1)
 * 
 * This migration demonstrates how to add new columns to an existing table
 * with proper platform handling and rollback support.
 */

import { DatabaseMigration } from '../BaseMigration';
import { MigrationType } from '../types';

export class AddSupplierContactInfoMigration extends DatabaseMigration {
  readonly id = '001_add_supplier_contact_info';
  readonly version = 2;
  readonly type = MigrationType.DATABASE;
  readonly description = 'Add email, phone, and contact_person fields to suppliers table';

  // Main SQL statements that work on all platforms
  readonly upSql = [
    'ALTER TABLE suppliers ADD COLUMN email TEXT;',
    'ALTER TABLE suppliers ADD COLUMN phone TEXT;',
    'ALTER TABLE suppliers ADD COLUMN contact_person TEXT;',
    
    // Add index for email lookups
    'CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers (email);'
  ];

  readonly downSql = [
    // Drop the index first
    'DROP INDEX IF EXISTS idx_suppliers_email;',
    
    // Note: SQLite doesn't support DROP COLUMN, so we'd need to recreate the table
    // For this example, we'll just set the columns to NULL in a real rollback
    'UPDATE suppliers SET email = NULL, phone = NULL, contact_person = NULL;'
  ];

  // Platform-specific SQL for native (if needed)
  readonly nativeDownSql = [
    'DROP INDEX IF EXISTS idx_suppliers_email;',
    
    // On native platforms, we could do a full table recreation
    `CREATE TABLE suppliers_backup AS SELECT 
       id, name, website, notes, shipping_policy, quality_rating,
       created_at, updated_at, deleted_at
     FROM suppliers;`,
    
    'DROP TABLE suppliers;',
    
    `CREATE TABLE suppliers (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      website TEXT,
      notes TEXT,
      shipping_policy TEXT,
      quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );`,
    
    `INSERT INTO suppliers 
     SELECT id, name, website, notes, shipping_policy, quality_rating,
            created_at, updated_at, deleted_at
     FROM suppliers_backup;`,
    
    'DROP TABLE suppliers_backup;'
  ];
}

// Register the migration
export const migration001 = new AddSupplierContactInfoMigration();

