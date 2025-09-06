/**
 * Debug script to see what's actually in the suppliers table
 */

const {
  SupplierRepository,
} = require('./src/storage/repositories/SupplierRepository');
const { executeSql } = require('./src/storage/sqlite/database');

async function debugSuppliers() {
  try {
    console.log('🔍 Debugging suppliers in database...');

    // Check table structure
    console.log('\n📋 Table structure:');
    const tableInfo = await executeSql('PRAGMA table_info(suppliers)');
    for (let i = 0; i < tableInfo.rows.length; i++) {
      const column = tableInfo.rows.item(i);
      console.log(
        `  ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''}`
      );
    }

    // Check all suppliers in database
    console.log('\n👥 All suppliers in database:');
    const allSuppliers = await executeSql(
      'SELECT * FROM suppliers WHERE deleted_at IS NULL'
    );
    console.log(`Found ${allSuppliers.rows.length} suppliers:`);

    for (let i = 0; i < allSuppliers.rows.length; i++) {
      const supplier = allSuppliers.rows.item(i);
      console.log(`  ${i + 1}. ${supplier.name} (ID: ${supplier.id})`);
      console.log(
        `     Country: ${supplier.country_code || supplier.countryCode || 'N/A'}`
      );
      console.log(
        `     Currency: ${supplier.default_currency || supplier.defaultCurrency || 'N/A'}`
      );
    }

    // Test repository
    console.log('\n🏗️ Testing repository:');
    const repository = new SupplierRepository();
    const repoSuppliers = await repository.findAll();
    console.log(`Repository found ${repoSuppliers.length} suppliers:`);

    for (const supplier of repoSuppliers) {
      console.log(
        `  - ${supplier.name} (${supplier.countryCode}, ${supplier.defaultCurrency})`
      );
    }
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugSuppliers();
