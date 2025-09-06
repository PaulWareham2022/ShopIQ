/**
 * Quick script to reset suppliers with sample data
 * Run this if you're seeing test suppliers instead of sample suppliers
 */

const {
  resetSuppliersWithSampleData,
} = require('./src/storage/seed-suppliers');

async function resetSuppliers() {
  try {
    console.log('🔄 Resetting suppliers with sample data...');
    await resetSuppliersWithSampleData();
    console.log('✅ Suppliers reset successfully!');
    console.log('🎉 You should now see the sample suppliers in your app');
  } catch (error) {
    console.error('❌ Failed to reset suppliers:', error);
  }
}

resetSuppliers();
