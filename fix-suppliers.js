/**
 * Comprehensive fix for supplier database issues
 * This will handle schema mismatches and data cleanup
 */

import {
  executeSql,
  initializeDatabase,
} from './src/storage/sqlite/database.js';
import { createAllSchemas } from './src/storage/sqlite/schemas.js';
import { randomUUID } from 'crypto';

async function fixSuppliers() {
  try {
    console.log('🔧 Starting comprehensive supplier fix...');

    // Initialize database
    await initializeDatabase();

    // Check if suppliers table exists and has correct schema
    console.log('📋 Checking table structure...');
    let tableExists = false;
    try {
      const tableInfo = await executeSql('PRAGMA table_info(suppliers)');
      tableExists = tableInfo.rows.length > 0;

      if (tableExists) {
        console.log('✅ Suppliers table exists');

        // Check for required columns
        const columns = [];
        for (let i = 0; i < tableInfo.rows.length; i++) {
          columns.push(tableInfo.rows.item(i).name);
        }

        const requiredColumns = [
          'country_code',
          'default_currency',
          'membership_required',
        ];
        const missingColumns = requiredColumns.filter(
          col => !columns.includes(col)
        );

        if (missingColumns.length > 0) {
          console.log('⚠️ Missing required columns:', missingColumns);
          console.log('🔄 Recreating table with correct schema...');

          // Drop and recreate table
          await executeSql('DROP TABLE IF EXISTS suppliers');
          await createAllSchemas();
          tableExists = false; // Force recreation
        } else {
          console.log('✅ Table schema is correct');
        }
      }
    } catch {
      console.log('⚠️ Table check failed, will create new table');
      tableExists = false;
    }

    if (!tableExists) {
      console.log('🏗️ Creating suppliers table...');
      await createAllSchemas();
    }

    // Clean up any existing data
    console.log('🧹 Cleaning up existing data...');
    await executeSql('DELETE FROM suppliers');

    // Insert sample suppliers directly with SQL to avoid repository issues
    console.log('📝 Inserting sample suppliers...');

    const sampleSuppliers = [
      {
        name: 'Amazon.ca',
        country_code: 'CA',
        region_code: 'CA-ON',
        store_code: 'amazon-ca',
        default_currency: 'CAD',
        membership_required: 0,
        shipping_policy: JSON.stringify({
          freeShippingThreshold: 35.0,
          shippingBaseCost: 5.99,
          pickupAvailable: true,
        }),
        url_patterns: JSON.stringify(['amazon.ca', 'www.amazon.ca']),
        notes:
          'Major online retailer with fast shipping. Prime membership available for faster delivery.',
      },
      {
        name: 'Costco Wholesale',
        country_code: 'CA',
        region_code: 'CA-NS',
        store_code: 'costco-halifax',
        default_currency: 'CAD',
        membership_required: 1,
        membership_type: 'Gold Star',
        shipping_policy: JSON.stringify({
          freeShippingThreshold: 75.0,
          shippingBaseCost: 9.99,
          pickupAvailable: true,
        }),
        url_patterns: JSON.stringify(['costco.ca', 'www.costco.ca']),
        notes:
          'Warehouse club with bulk pricing. Membership required for shopping.',
      },
      {
        name: 'Walmart Canada',
        country_code: 'CA',
        default_currency: 'CAD',
        membership_required: 0,
        shipping_policy: JSON.stringify({
          freeShippingThreshold: 50.0,
          shippingBaseCost: 7.97,
          pickupAvailable: true,
        }),
        url_patterns: JSON.stringify(['walmart.ca', 'www.walmart.ca']),
        notes:
          'Large retail chain with competitive pricing and store pickup options.',
      },
    ];

    for (const supplier of sampleSuppliers) {
      const id = randomUUID();
      const now = new Date().toISOString();

      await executeSql(
        `
        INSERT INTO suppliers (
          id, name, country_code, region_code, store_code, default_currency,
          membership_required, membership_type, shipping_policy, url_patterns,
          notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          id,
          supplier.name,
          supplier.country_code,
          supplier.region_code,
          supplier.store_code,
          supplier.default_currency,
          supplier.membership_required,
          supplier.membership_type,
          supplier.shipping_policy,
          supplier.url_patterns,
          supplier.notes,
          now,
          now,
        ]
      );
    }

    // Verify the fix
    console.log('✅ Verifying fix...');
    const result = await executeSql(
      'SELECT name, country_code, default_currency FROM suppliers'
    );
    console.log(`Successfully created ${result.rows.length} suppliers:`);

    for (let i = 0; i < result.rows.length; i++) {
      const supplier = result.rows.item(i);
      console.log(
        `  - ${supplier.name} (${supplier.country_code}, ${supplier.default_currency})`
      );
    }

    console.log('🎉 Supplier fix completed successfully!');
    console.log('🔄 Please refresh your app to see the changes');
  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

fixSuppliers();
