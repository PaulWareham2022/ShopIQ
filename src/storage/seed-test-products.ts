/**
 * Seed Test Products with Known UPC Codes
 * 
 * Creates test products with specific UPC codes for barcode scanner testing
 */

import { RepositoryFactory } from './RepositoryFactory';
import { InventoryItem, Supplier } from './types';

// Test products with known UPC codes for barcode scanner testing
const TEST_PRODUCTS = [
  {
    name: 'Peanut Butter Power',
    description: 'High-protein peanut butter for athletes',
    category: 'Food & Beverage',
    canonicalDimension: 'mass' as const,
    canonicalUnit: 'g',
    shelfLifeSensitive: false,
    usageRatePerDay: 0.1,
    equivalenceFactor: 1.0,
    upc: '628451166511',
    packageSize: '16 oz',
    unit: 'jar'
  },
  {
    name: 'Pure Honey',
    description: 'Natural raw honey from local beekeepers',
    category: 'Food & Beverage',
    canonicalDimension: 'mass' as const,
    canonicalUnit: 'g',
    shelfLifeSensitive: false,
    usageRatePerDay: 0.05,
    equivalenceFactor: 1.0,
    upc: '055828917504',
    packageSize: '12 oz',
    unit: 'bottle'
  }
];

/**
 * Seed test products with known UPC codes for barcode scanner testing
 * ONLY for development and testing - should not run in production
 */
export async function seedTestProducts(): Promise<void> {
  if (!__DEV__) {
    console.warn('seedTestProducts should only be called in development mode');
    return;
  }

  try {
    console.log('🌱 Starting to seed test products...');
    
    const repositoryFactory = RepositoryFactory.getInstance();
    await repositoryFactory.initialize();
    
    // Get repositories
    const inventoryRepo = await repositoryFactory.getInventoryItemRepository();
    const supplierRepo = await repositoryFactory.getSupplierRepository();
    const variantRepo = await repositoryFactory.getProductVariantRepository();
    
    // Create or find a test supplier
    let testSupplier: Supplier;
    try {
      const existingSuppliers = await supplierRepo.findWhere({ name: 'Test Supplier' });
      if (existingSuppliers.length === 0) {
        testSupplier = await supplierRepo.create({
          name: 'Test Supplier',
          countryCode: 'CA',
          defaultCurrency: 'CAD',
          membershipRequired: false,
          notes: 'Test supplier for barcode scanner testing'
        });
        console.log('✅ Created test supplier');
      } else {
        testSupplier = existingSuppliers[0];
        console.log('✅ Found existing test supplier');
      }
    } catch (error) {
      console.error('❌ Error with supplier:', error);
      return;
    }
    
    console.log('📦 Creating inventory items and variants...');
    
    for (const product of TEST_PRODUCTS) {
      try {
        // Check if inventory item already exists
        const existingItems = await inventoryRepo.findWhere({ name: product.name });
        let inventoryItem: InventoryItem;
        
        if (existingItems.length === 0) {
          // Create inventory item
          inventoryItem = await inventoryRepo.create({
            name: product.name,
            description: product.description,
            category: product.category,
            supplierId: testSupplier.id,
            canonicalDimension: product.canonicalDimension,
            canonicalUnit: product.canonicalUnit,
            shelfLifeSensitive: product.shelfLifeSensitive,
            usageRatePerDay: product.usageRatePerDay,
            equivalenceFactor: product.equivalenceFactor,
            notes: `Test product for barcode scanning - UPC: ${product.upc}`
          });
          console.log(`✅ Created inventory item: ${product.name}`);
        } else {
          inventoryItem = existingItems[0];
          console.log(`✅ Found existing inventory item: ${product.name}`);
        }
        
        // Check if variant with this barcode already exists
        const existingVariant = await variantRepo.findByBarcodeValue(product.upc);
        if (!existingVariant) {
          // Create product variant with UPC barcode
          await variantRepo.create({
            inventoryItemId: inventoryItem.id,
            packageSize: product.packageSize,
            unit: product.unit,
            barcodeValue: product.upc,
            notes: `Test variant for barcode scanning - ${product.name}`,
            metadata: {
              testProduct: true,
              seededAt: new Date().toISOString(),
              originalUPC: product.upc
            }
          });
          console.log(`✅ Created variant with barcode ${product.upc} for ${product.name}`);
        } else {
          console.log(`✅ Variant with barcode ${product.upc} already exists for ${product.name}`);
        }
        
      } catch (error) {
        console.error(`❌ Error creating ${product.name}:`, error);
      }
    }
    
    console.log('🎉 Test products seeded successfully!');
    console.log('\n📱 You can now test the barcode scanner with these UPC codes:');
    console.log('🥜 Peanut Butter Power: 628451166511');
    console.log('🍯 Pure Honey: 055828917504');
    console.log('\nThe scanner should show product information and a "Create Offer" button!');
    
  } catch (error) {
    console.error('❌ Error seeding test products:', error);
    throw error;
  }
}
