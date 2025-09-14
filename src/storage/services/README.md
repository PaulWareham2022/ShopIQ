# Offer Mutation Service

The Offer Mutation Service handles automatic updates to offers when inventory item canonical units change. This ensures that price calculations remain accurate when you change the base unit for an inventory item.

## Problem Solved

When you create offers for an inventory item using one canonical unit (e.g., grams) and later change the inventory item to use a different canonical unit (e.g., kilograms), the existing offers retain their old price calculations. This leads to incorrect pricing information.

**Example:**
- Create inventory item "Flour" with canonical unit "g" (grams)
- Add offer: 1000g for $10.00 → price per gram = $0.01
- Change inventory item canonical unit to "kg" (kilograms)
- **Problem:** Offer still shows price per gram = $0.01, but should show price per kg = $10.00

## Solution

The Offer Mutation Service automatically:
1. Detects when an inventory item's canonical unit changes
2. Finds all related offers
3. Recalculates price metrics using the new canonical unit
4. Updates all affected offers with correct pricing

## Usage

### Automatic Mutation (Recommended)

Use the enhanced `InventoryItemRepository.updateWithOfferMutation()` method:

```typescript
import { InventoryItemRepository } from '../repositories/InventoryItemRepository';

const inventoryRepo = new InventoryItemRepository();

// Update inventory item and automatically mutate related offers
const updatedItem = await inventoryRepo.updateWithOfferMutation(
  'inventory-item-id',
  { canonicalUnit: 'kg' }, // Change from 'g' to 'kg'
  {
    mutateOffers: true, // Enable automatic mutation (default)
    onOfferMutation: (result) => {
      console.log(`Updated ${result.updatedOffers} offers`);
      if (result.failedOffers.length > 0) {
        console.log(`Failed: ${result.failedOffers.length} offers`);
      }
    }
  }
);
```

### Preview Changes Before Applying

Preview the impact before making changes:

```typescript
const preview = await inventoryRepo.previewCanonicalUnitChange(
  'inventory-item-id',
  'kg' // New canonical unit
);

console.log(`Will affect ${preview.affectedOffers} offers`);
preview.sampleChanges.forEach(change => {
  console.log(`Offer ${change.offerId}:`);
  console.log(`  Price: ${change.oldPricePerCanonical} → ${change.newPricePerCanonical}`);
  console.log(`  Amount: ${change.oldAmountCanonical} → ${change.newAmountCanonical}`);
});
```

### Manual Mutation

For more control, use the service directly:

```typescript
import { OfferMutationService } from '../services/OfferMutationService';
import { OfferRepository } from '../repositories/OfferRepository';
import { InventoryItemRepository } from '../repositories/InventoryItemRepository';

const offerRepo = new OfferRepository();
const inventoryRepo = new InventoryItemRepository();
const mutationService = new OfferMutationService(offerRepo, inventoryRepo);

const result = await mutationService.mutateOffersForUnitChange({
  itemId: 'inventory-item-id',
  oldCanonicalUnit: 'g',
  newCanonicalUnit: 'kg',
  canonicalDimension: 'mass'
});

if (result.success) {
  console.log(`Updated ${result.updatedOffers} offers`);
} else {
  console.log(`Failed to update ${result.failedOffers.length} offers`);
  console.log('Errors:', result.errors);
}
```

## API Reference

### OfferMutationService

#### `mutateOffersForUnitChange(unitChange)`
Updates all offers for an inventory item when its canonical unit changes.

**Parameters:**
- `unitChange.itemId`: Inventory item ID
- `unitChange.oldCanonicalUnit`: Current canonical unit
- `unitChange.newCanonicalUnit`: New canonical unit
- `unitChange.canonicalDimension`: Dimension type ('mass', 'volume', 'count', 'length', 'area')

**Returns:** `OfferMutationResult`
- `success`: Whether all offers were updated successfully
- `updatedOffers`: Number of offers successfully updated
- `failedOffers`: Array of offer IDs that failed to update
- `errors`: Array of error messages

#### `previewUnitChangeImpact(unitChange)`
Preview the impact of a unit change without actually updating offers.

**Returns:** Preview object with affected offers count and sample changes.

#### `getAffectedOffers(inventoryItemId)`
Get all offers that would be affected by a unit change.

### InventoryItemRepository

#### `updateWithOfferMutation(id, updates, options)`
Update an inventory item with automatic offer mutation when canonical unit changes.

**Parameters:**
- `id`: Inventory item ID
- `updates`: Updates to apply
- `options.mutateOffers`: Whether to automatically mutate offers (default: true)
- `options.onOfferMutation`: Callback function called with mutation result

#### `previewCanonicalUnitChange(id, newCanonicalUnit)`
Preview the impact of changing an inventory item's canonical unit.

## Error Handling

The service handles various error scenarios gracefully:

- **Inventory item not found**: Returns appropriate error message
- **Unit conversion failures**: Logs specific conversion errors
- **Partial failures**: Continues processing other offers if some fail
- **Database errors**: Wraps and re-throws with context

## Testing

Comprehensive test coverage includes:

- Unit tests for `OfferMutationService`
- Integration tests for the complete workflow
- Tests for error handling scenarios
- Tests for different unit types (mass, volume, etc.)

Run tests with:
```bash
npm test -- --testPathPattern="OfferMutation"
```

## Examples

See `src/storage/examples/OfferMutationExample.ts` for complete usage examples including:

- Basic unit change workflow
- Preview functionality
- Manual mutation control
- Error handling patterns

## Migration Notes

This functionality is backward compatible. Existing code using `InventoryItemRepository.update()` will continue to work without automatic offer mutation. To enable automatic mutation, switch to using `updateWithOfferMutation()`.

## Performance Considerations

- The service processes offers in batches to avoid memory issues
- Unit conversions are cached for performance
- Database operations are optimized with proper indexing
- Large numbers of offers (>1000) may take several seconds to process

## Future Enhancements

Potential improvements:
- Batch processing for very large offer sets
- Background processing for non-critical updates
- Rollback functionality for failed mutations
- Audit trail for unit changes and offer updates
