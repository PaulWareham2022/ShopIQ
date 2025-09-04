/**
 * Repository Pattern Testing
 * Validates that the repository abstraction works correctly
 */

// Platform will be imported lazily to avoid breaking non-RN environments
import { repositories } from './index';
// Types are used for TypeScript type checking only

export const testRepositoryPattern = async (): Promise<void> => {
  // Early return in production builds
  if (!__DEV__) return;

  console.log('🏗️ Testing Repository Pattern...');
  // Lazy import of react-native platform detection
  let platformOS = 'unknown';
  try {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      const { Platform } = require('react-native');
      platformOS = Platform.OS;
    }
  } catch {
    // react-native not available in this environment
  }
  console.log(`Platform: ${platformOS}`);

  try {
    // Initialize the repository factory
    console.log('📊 Initializing repositories...');
    await repositories.initialize();
    console.log('✅ Repository factory initialized');

    // Test SQL-based repositories
    await testSQLRepositories();

    // Test key-value repositories
    await testKeyValueRepositories();

    // Test transaction support
    await testTransactions();

    // Get storage statistics
    const stats = await repositories.getStorageStats();
    console.log('📈 Storage Statistics:', {
      database: stats.database,
      keyValue: stats.keyValue,
    });

    console.log('🎉 Repository Pattern test completed successfully');
  } catch (error) {
    console.error('❌ Repository Pattern test failed:', error);
    throw error;
  }
};

async function testSQLRepositories(): Promise<void> {
  console.log('🗃️ Testing SQL repositories...');

  // Test Supplier Repository
  const supplierRepo = await repositories.getSupplierRepository();

  // Create a test supplier
  const testSupplier = await supplierRepo.create({
    name: 'Test Supplier Co',
    website: 'https://testsupplier.com',
    notes: 'This is a test supplier',
    quality_rating: 4,
  });

  console.log('✅ Created supplier:', testSupplier.id);

  // Find the supplier by ID
  const foundSupplier = await supplierRepo.findById(testSupplier.id);
  if (!foundSupplier || foundSupplier.name !== 'Test Supplier Co') {
    throw new Error('Failed to find created supplier');
  }
  console.log('✅ Found supplier by ID');

  // Update the supplier
  const updatedSupplier = await supplierRepo.update(testSupplier.id, {
    quality_rating: 5,
    notes: 'Updated test supplier',
  });

  if (!updatedSupplier || updatedSupplier.quality_rating !== 5) {
    throw new Error('Failed to update supplier');
  }
  console.log('✅ Updated supplier');

  // Test Inventory Item Repository
  const inventoryRepo = await repositories.getInventoryItemRepository();

  const testItem = await inventoryRepo.create({
    name: 'Test Item',
    canonical_unit: 'kg',
    shelf_life_sensitive: true,
    notes: 'This is a test inventory item',
  });

  console.log('✅ Created inventory item:', testItem.id);

  // Test finding by name
  const itemsByName = await inventoryRepo.findByName('Test');
  if (
    itemsByName.length === 0 ||
    !itemsByName.some(item => item.id === testItem.id)
  ) {
    throw new Error('Failed to find inventory item by name');
  }
  console.log('✅ Found inventory item by name');

  // Test soft delete
  const deleted = await supplierRepo.delete(testSupplier.id);
  if (!deleted) {
    throw new Error('Failed to delete supplier');
  }

  const deletedSupplier = await supplierRepo.findById(testSupplier.id);
  if (deletedSupplier !== null) {
    throw new Error('Soft deleted supplier should not be found');
  }
  console.log('✅ Soft delete working correctly');

  // Clean up - hard delete test data
  await supplierRepo.hardDelete(testSupplier.id);
  await inventoryRepo.hardDelete(testItem.id);
  console.log('🧹 Cleaned up test data');
}

async function testKeyValueRepositories(): Promise<void> {
  console.log('🔑 Testing Key-Value repositories...');

  // Test different namespaces
  const appKV = repositories.getKeyValueRepository('app');
  const cacheKV = repositories.getKeyValueRepository('cache');
  // const prefKV = repositories.getKeyValueRepository('preferences'); // For future use

  // Test basic operations
  appKV.set('test_string', 'hello world');
  appKV.set('test_number', 42);
  appKV.set('test_boolean', true);
  appKV.setObject('test_object', {
    key: 'value',
    nested: { array: [1, 2, 3] },
  });

  // Verify retrieval
  const stringVal = appKV.get<string>('test_string');
  const numberVal = appKV.get<number>('test_number');
  const boolVal = appKV.get<boolean>('test_boolean');
  const objVal = appKV.getObject<any>('test_object');

  if (stringVal !== 'hello world' || numberVal !== 42 || boolVal !== true) {
    throw new Error('Key-value basic operations failed');
  }

  if (!objVal || objVal.key !== 'value' || objVal.nested.array.length !== 3) {
    throw new Error('Key-value object operations failed');
  }

  console.log('✅ Key-value basic operations working');

  // Test namespace isolation
  appKV.set('isolated_key', 'app_value');
  cacheKV.set('isolated_key', 'cache_value');

  if (
    appKV.get('isolated_key') !== 'app_value' ||
    cacheKV.get('isolated_key') !== 'cache_value'
  ) {
    throw new Error('Key-value namespace isolation failed');
  }

  console.log('✅ Key-value namespace isolation working');

  // Test utility methods
  const allKeys = appKV.getAllKeys();
  const keyCount = appKV.count();

  if (allKeys.length !== keyCount || keyCount < 4) {
    throw new Error('Key-value utility methods failed');
  }

  console.log('✅ Key-value utility methods working');

  // Clean up
  const testKeys = [
    'test_string',
    'test_number',
    'test_boolean',
    'test_object',
    'isolated_key',
  ];
  appKV.deleteMultiple(testKeys);
  cacheKV.delete('isolated_key');

  console.log('🧹 Cleaned up key-value test data');
}

async function testTransactions(): Promise<void> {
  console.log('🔄 Testing transactions...');

  // Test successful transaction
  const result = await repositories.withTransaction(async _tx => {
    // Get repository instance bound to the transaction
    const supplierRepo = await repositories.getSupplierRepository();

    const supplier1 = await supplierRepo.create({
      name: 'Transaction Test Supplier 1',
      website: 'https://test1.com',
    });

    const supplier2 = await supplierRepo.create({
      name: 'Transaction Test Supplier 2',
      website: 'https://test2.com',
    });

    return [supplier1, supplier2];
  });

  const supplierRepo = await repositories.getSupplierRepository();

  console.log('✅ Transaction committed successfully');

  // Verify both suppliers were created
  const supplier1 = await supplierRepo.findById(result[0].id);
  const supplier2 = await supplierRepo.findById(result[1].id);

  if (!supplier1 || !supplier2) {
    throw new Error('Transaction commit failed - suppliers not found');
  }

  // Test failed transaction (should rollback)
  let rollbackWorked = false;
  try {
    await repositories.withTransaction(async _tx => {
      // Get repository instance bound to this transaction
      const txSupplierRepo = await repositories.getSupplierRepository();

      await txSupplierRepo.create({
        name: 'Transaction Test Supplier 3',
        website: 'https://test3.com',
      });

      // Simulate an error
      throw new Error('Intentional error for rollback test');
    });
  } catch {
    rollbackWorked = true;
  }

  if (!rollbackWorked) {
    throw new Error('Transaction did not rollback on error');
  }

  // Verify supplier 3 was not created (rollback worked)
  const allSuppliers = await supplierRepo.findWhere({
    name: 'Transaction Test Supplier 3',
  });
  if (allSuppliers.length > 0) {
    throw new Error('Transaction rollback failed - supplier 3 was created');
  }

  console.log('✅ Transaction rollback working correctly');

  // Clean up
  await supplierRepo.hardDelete(result[0].id);
  await supplierRepo.hardDelete(result[1].id);

  console.log('🧹 Cleaned up transaction test data');
}
