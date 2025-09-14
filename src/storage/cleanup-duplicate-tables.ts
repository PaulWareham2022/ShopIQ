/**
 * Cleanup script to remove duplicate inventory_items table
 * This is a temporary script to clean up the database state after the schema changes
 */

import { executeSql } from './sqlite/database';

/**
 * Clean up duplicate tables after schema changes
 * This removes the old inventory_items table if products table exists
 */
export async function cleanupDuplicateTables(): Promise<void> {
  if (!__DEV__) {
    console.warn('cleanupDuplicateTables should only be called in development mode');
    return;
  }

  try {
    console.log('🧹 Starting database cleanup...');
    
    // Check if both tables exist
    const tablesResult = await executeSql(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('inventory_items', 'products')"
    );
    
    // Handle different row access patterns across platforms
    const tableNames: string[] = [];
    if (tablesResult.rows && typeof tablesResult.rows.item === 'function') {
      // Native platform
      for (let i = 0; i < tablesResult.rows.length; i++) {
        tableNames.push(tablesResult.rows.item(i).name);
      }
    } else if (Array.isArray(tablesResult.rows)) {
      // Web platform or array format
      tableNames.push(...tablesResult.rows.map((row: any) => row.name));
    }
    console.log('📋 Found tables:', tableNames);
    
    if (tableNames.includes('products') && tableNames.includes('inventory_items')) {
      console.log('⚠️ Both inventory_items and products tables exist - cleaning up...');
      
      // Check if inventory_items has any data
      const countResult = await executeSql('SELECT COUNT(*) as count FROM inventory_items');
      const count = typeof countResult.rows.item === 'function' 
        ? countResult.rows.item(0).count 
        : countResult.rows[0].count;
      
      if (count > 0) {
        console.log(`📊 inventory_items table has ${count} records - preserving data...`);
        
        // Copy any data from inventory_items to products if products is empty
        const productsCountResult = await executeSql('SELECT COUNT(*) as count FROM products');
        const productsCount = typeof productsCountResult.rows.item === 'function' 
          ? productsCountResult.rows.item(0).count 
          : productsCountResult.rows[0].count;
        
        if (productsCount === 0) {
          console.log('📋 Copying data from inventory_items to products...');
          await executeSql(`
            INSERT INTO products 
            SELECT * FROM inventory_items 
            WHERE deleted_at IS NULL
          `);
          console.log('✅ Data copied successfully');
        } else {
          console.log('📋 Products table already has data - skipping copy');
        }
      }
      
      // Drop the old inventory_items table
      console.log('🗑️ Dropping old inventory_items table...');
      await executeSql('DROP TABLE inventory_items');
      console.log('✅ inventory_items table dropped');
      
      // Drop old indexes if they exist
      try {
        await executeSql('DROP INDEX IF EXISTS idx_inventory_name');
        await executeSql('DROP INDEX IF EXISTS idx_inventory_category');
        await executeSql('DROP INDEX IF EXISTS idx_inventory_dimension');
        await executeSql('DROP INDEX IF EXISTS idx_inventory_deleted');
        console.log('✅ Old indexes cleaned up');
      } catch {
        console.log('ℹ️ No old indexes to clean up');
      }
      
      // Drop old trigger if it exists
      try {
        await executeSql('DROP TRIGGER IF EXISTS trg_inventory_items_updated_at');
        console.log('✅ Old trigger cleaned up');
      } catch {
        console.log('ℹ️ No old trigger to clean up');
      }
      
    } else if (tableNames.includes('inventory_items') && !tableNames.includes('products')) {
      console.log('⚠️ Only inventory_items exists - this should not happen with new schema');
    } else if (tableNames.includes('products') && !tableNames.includes('inventory_items')) {
      console.log('✅ Only products table exists - database is clean');
    } else {
      console.log('⚠️ Neither table exists - this is unexpected');
    }
    
    console.log('🎉 Database cleanup completed');
    
  } catch (cleanupError) {
    console.error('❌ Error during database cleanup:', cleanupError);
    throw cleanupError;
  }
}
