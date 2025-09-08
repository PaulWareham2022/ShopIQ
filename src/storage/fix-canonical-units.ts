/**
 * Fix Canonical Units
 * 
 * This function updates existing inventory items and offers to use the correct canonical units
 * that match the conversion system expectations.
 */

import { RepositoryFactory } from './RepositoryFactory';
import { validateAndConvert } from './utils/canonical-units';

export async function fixCanonicalUnits(): Promise<void> {
  console.log('🔧 Starting canonical units fix...');
  
  try {
    const repoFactory = RepositoryFactory.getInstance();
    const inventoryRepo = await repoFactory.getInventoryItemRepository();
    const offerRepo = await repoFactory.getOfferRepository();
    
    // Get all inventory items
    const inventoryItems = await inventoryRepo.findAll();
    console.log(`📦 Found ${inventoryItems.length} inventory items`);
    
    // Update inventory items with correct canonical units
    const updates = [
      { name: 'Milk', canonicalUnit: 'ml' },
      { name: 'Rice', canonicalUnit: 'g' },
      { name: 'Apples', canonicalUnit: 'g' },
      { name: 'Olive Oil', canonicalUnit: 'ml' }
    ];
    
    for (const update of updates) {
      const item = inventoryItems.find(i => i.name === update.name);
      if (item && item.canonicalUnit !== update.canonicalUnit) {
        console.log(`🔄 Updating ${update.name}: ${item.canonicalUnit} → ${update.canonicalUnit}`);
        await inventoryRepo.update(item.id, { canonicalUnit: update.canonicalUnit });
      }
    }
    
    // Get all offers
    const offers = await offerRepo.findAll();
    console.log(`💰 Found ${offers.length} offers`);
    
    // Recalculate canonical prices for all offers
    let fixedCount = 0;
    for (const offer of offers) {
      try {
        // Get the updated inventory item
        const inventoryItem = await inventoryRepo.findById(offer.inventoryItemId);
        if (!inventoryItem) {
          console.log(`⚠️  Inventory item not found for offer ${offer.id}`);
          continue;
        }
        
        // Recalculate canonical amount and prices
        const validation = validateAndConvert(
          offer.amount,
          offer.amountUnit,
          inventoryItem.canonicalDimension
        );
        
        if (!validation.isValid || !validation.canonicalAmount) {
          console.log(`⚠️  Unit conversion failed for offer ${offer.id}: ${validation.errorMessage}`);
          continue;
        }
        
        const amountCanonical = validation.canonicalAmount;
        const pricePerCanonicalExclShipping = offer.totalPrice / amountCanonical;
        const shippingCost = offer.shippingCost || 0;
        const shippingIncluded = offer.shippingIncluded || false;
        const totalWithShipping = shippingIncluded
          ? offer.totalPrice
          : offer.totalPrice + shippingCost;
        const pricePerCanonicalInclShipping = totalWithShipping / amountCanonical;
        const effectivePricePerCanonical = pricePerCanonicalInclShipping;
        
        // Update the offer with recalculated values
        await offerRepo.update(offer.id, {
          amountCanonical,
          pricePerCanonicalExclShipping,
          pricePerCanonicalInclShipping,
          effectivePricePerCanonical,
          computedByVersion: 'v1.0.1-fixed'
        });
        
        fixedCount++;
        console.log(`✅ Fixed offer ${offer.id}: ${offer.totalPrice} / ${offer.amount} ${offer.amountUnit} = ${effectivePricePerCanonical.toFixed(4)} per ${inventoryItem.canonicalUnit}`);
        
      } catch (error) {
        console.log(`❌ Failed to fix offer ${offer.id}:`, (error as Error).message);
      }
    }
    
    console.log(`🎉 Canonical units fix completed! Fixed ${fixedCount} offers.`);
    
  } catch (error) {
    console.error('❌ Error fixing canonical units:', error);
    throw error;
  }
}
