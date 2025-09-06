/**
 * Sample supplier data for testing and development
 * This file creates realistic supplier examples to demonstrate the supplier CRUD functionality
 */

import { SupplierRepository } from './repositories/SupplierRepository';
import { Supplier, ShippingPolicy } from './types';

export const sampleSuppliers: Omit<
  Supplier,
  'id' | 'created_at' | 'updated_at' | 'deleted_at'
>[] = [
  {
    name: 'Amazon.ca',
    countryCode: 'CA',
    regionCode: 'CA-ON',
    storeCode: 'amazon-ca',
    defaultCurrency: 'CAD',
    membershipRequired: false,
    shippingPolicy: {
      freeShippingThreshold: 35.0,
      shippingBaseCost: 5.99,
      pickupAvailable: true,
    } as ShippingPolicy,
    urlPatterns: ['amazon.ca', 'www.amazon.ca'],
    notes:
      'Major online retailer with fast shipping. Prime membership available for faster delivery.',
  },
  {
    name: 'Costco Wholesale',
    countryCode: 'CA',
    regionCode: 'CA-NS',
    storeCode: 'costco-halifax',
    defaultCurrency: 'CAD',
    membershipRequired: true,
    membershipType: 'Gold Star',
    shippingPolicy: {
      freeShippingThreshold: 75.0,
      shippingBaseCost: 9.99,
      pickupAvailable: true,
    } as ShippingPolicy,
    urlPatterns: ['costco.ca', 'www.costco.ca'],
    notes:
      'Warehouse club with bulk pricing. Membership required for shopping.',
  },
  {
    name: 'Walmart Canada',
    countryCode: 'CA',
    defaultCurrency: 'CAD',
    membershipRequired: false,
    shippingPolicy: {
      freeShippingThreshold: 50.0,
      shippingBaseCost: 7.97,
      pickupAvailable: true,
    } as ShippingPolicy,
    urlPatterns: ['walmart.ca', 'www.walmart.ca'],
    notes:
      'Large retail chain with competitive pricing and store pickup options.',
  },
  {
    name: 'Home Depot',
    countryCode: 'CA',
    regionCode: 'CA-NS',
    storeCode: 'homedepot-dartmouth',
    defaultCurrency: 'CAD',
    membershipRequired: false,
    shippingPolicy: {
      freeShippingThreshold: 45.0,
      shippingBaseCost: 8.99,
      shippingPerItemCost: 2.5,
      pickupAvailable: true,
    } as ShippingPolicy,
    urlPatterns: ['homedepot.ca', 'www.homedepot.ca'],
    notes:
      'Home improvement retailer. Heavy items may have additional shipping costs.',
  },
  {
    name: 'Loblaws',
    countryCode: 'CA',
    regionCode: 'CA-NS',
    storeCode: 'loblaws-halifax',
    defaultCurrency: 'CAD',
    membershipRequired: false,
    shippingPolicy: {
      freeShippingThreshold: 35.0,
      shippingBaseCost: 4.99,
      pickupAvailable: true,
    } as ShippingPolicy,
    urlPatterns: ['loblaws.ca', 'www.loblaws.ca'],
    notes:
      'Grocery chain with PC Optimum rewards program. Fresh food delivery available.',
  },
  {
    name: 'Canadian Tire',
    countryCode: 'CA',
    defaultCurrency: 'CAD',
    membershipRequired: false,
    shippingPolicy: {
      freeShippingThreshold: 50.0,
      shippingBaseCost: 6.99,
      pickupAvailable: true,
    } as ShippingPolicy,
    urlPatterns: ['canadiantire.ca', 'www.canadiantire.ca'],
    notes:
      'Automotive, hardware, and outdoor equipment retailer. Triangle rewards program.',
  },
  {
    name: 'Amazon.com (US)',
    countryCode: 'US',
    regionCode: 'US-WA',
    storeCode: 'amazon-us',
    defaultCurrency: 'USD',
    membershipRequired: false,
    shippingPolicy: {
      freeShippingThreshold: 25.0,
      shippingBaseCost: 4.99,
      pickupAvailable: false,
    } as ShippingPolicy,
    urlPatterns: ['amazon.com', 'www.amazon.com'],
    notes:
      'US Amazon for cross-border shopping. Consider duties and exchange rates.',
  },
  {
    name: 'Tesco (UK)',
    countryCode: 'GB',
    regionCode: 'GB-ENG',
    defaultCurrency: 'GBP',
    membershipRequired: false,
    shippingPolicy: {
      freeShippingThreshold: 40.0,
      shippingBaseCost: 3.95,
      pickupAvailable: true,
    } as ShippingPolicy,
    urlPatterns: ['tesco.com', 'www.tesco.com'],
    notes: 'UK grocery chain. International shipping may be limited.',
  },
];

/**
 * Seeds the database with sample supplier data
 * Useful for development and testing
 */
export async function seedSampleSuppliers(): Promise<void> {
  const repository = new SupplierRepository();

  try {
    // Check if our sample suppliers already exist to avoid duplicates
    // We'll check for a specific sample supplier name to distinguish from test data
    const existingSampleSuppliers = await repository.findByName('Amazon.ca');
    if (existingSampleSuppliers.length > 0) {
      console.log('Sample suppliers already exist, skipping seed data');
      return;
    }

    // Clean up any test suppliers that might be lingering
    const testSuppliers = await repository.findByName(
      'Transaction Test Supplier'
    );
    for (const testSupplier of testSuppliers) {
      await repository.hardDelete(testSupplier.id);
    }

    console.log('Seeding sample suppliers...');

    for (const supplierData of sampleSuppliers) {
      await repository.create(supplierData);
    }

    console.log(
      `Successfully seeded ${sampleSuppliers.length} sample suppliers`
    );
  } catch (error) {
    console.error('Failed to seed sample suppliers:', error);
    throw error;
  }
}

/**
 * Clears all suppliers and re-seeds with sample data
 * Use with caution - this will delete existing supplier data
 */
export async function resetSuppliersWithSampleData(): Promise<void> {
  const repository = new SupplierRepository();

  try {
    console.log('Clearing existing suppliers...');

    // Get all suppliers and delete them
    const existingSuppliers = await repository.findAll({
      includeDeleted: true,
    });
    for (const supplier of existingSuppliers) {
      await repository.hardDelete(supplier.id);
    }

    console.log('Seeding fresh sample suppliers...');

    for (const supplierData of sampleSuppliers) {
      await repository.create(supplierData);
    }

    console.log(
      `Successfully reset and seeded ${sampleSuppliers.length} sample suppliers`
    );
  } catch (error) {
    console.error('Failed to reset suppliers with sample data:', error);
    throw error;
  }
}
