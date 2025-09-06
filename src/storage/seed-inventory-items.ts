/**
 * Seed Inventory Items
 *
 * Creates sample inventory items for testing and development
 */

import { RepositoryFactory } from './RepositoryFactory';
import { InventoryItem } from './types';

// Sample inventory items for testing
const SAMPLE_INVENTORY_ITEMS: Omit<
  InventoryItem,
  'id' | 'created_at' | 'updated_at'
>[] = [
  {
    name: 'Apples',
    canonicalDimension: 'mass' as const,
    canonicalUnit: 'kg',
    shelfLifeSensitive: true,
    shelfLifeDays: 14,
    usageRatePerDay: 0.5,
    equivalenceFactor: 1.0,
    notes: 'Fresh apples for daily consumption',
  },
  {
    name: 'Milk',
    canonicalDimension: 'volume' as const,
    canonicalUnit: 'L',
    shelfLifeSensitive: true,
    shelfLifeDays: 7,
    usageRatePerDay: 0.25,
    equivalenceFactor: 1.0,
    notes: 'Fresh milk for daily consumption',
  },
  {
    name: 'Bread',
    canonicalDimension: 'count' as const,
    canonicalUnit: 'unit',
    shelfLifeSensitive: true,
    shelfLifeDays: 5,
    usageRatePerDay: 0.1,
    equivalenceFactor: 1.0,
    notes: 'Fresh bread loaves',
  },
  {
    name: 'Rice',
    canonicalDimension: 'mass' as const,
    canonicalUnit: 'kg',
    shelfLifeSensitive: false,
    usageRatePerDay: 0.2,
    equivalenceFactor: 1.0,
    notes: 'Long-grain white rice',
  },
  {
    name: 'Olive Oil',
    canonicalDimension: 'volume' as const,
    canonicalUnit: 'ml',
    shelfLifeSensitive: false,
    usageRatePerDay: 0.05,
    equivalenceFactor: 1.0,
    notes: 'Extra virgin olive oil',
  },
];

/**
 * Seed sample inventory items into the database
 * Only creates items that don't already exist
 */
export async function seedSampleInventoryItems(): Promise<void> {
  try {
    const repositoryFactory = RepositoryFactory.getInstance();
    await repositoryFactory.initialize();

    const inventoryRepo = await repositoryFactory.getInventoryItemRepository();

    // Check if inventory items already exist
    const existingItems = await inventoryRepo.findAll();

    if (existingItems.length > 0) {
      console.log('Inventory items already exist, skipping seeding');
      return;
    }

    console.log('Seeding sample inventory items...');

    // Create each sample inventory item
    for (const itemData of SAMPLE_INVENTORY_ITEMS) {
      try {
        await inventoryRepo.create(itemData);
      } catch (error) {
        console.warn(
          `Failed to create inventory item "${itemData.name}":`,
          error
        );
      }
    }

    console.log('Successfully seeded sample inventory items');
  } catch (error) {
    console.error('Failed to seed inventory items:', error);
    throw error;
  }
}
