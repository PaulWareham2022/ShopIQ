/**
 * Integration tests for offer mutation when inventory item canonical units change
 */

import { OfferMutationService } from '../../services/OfferMutationService';
import { OfferRepository } from '../../repositories/OfferRepository';
import { InventoryItemRepository } from '../../repositories/InventoryItemRepository';
import { Offer, InventoryItem } from '../../types';

describe('Offer Mutation Integration', () => {
  let offerRepository: OfferRepository;
  let inventoryItemRepository: InventoryItemRepository;
  let mutationService: OfferMutationService;

  beforeEach(() => {
    offerRepository = new OfferRepository();
    inventoryItemRepository = new InventoryItemRepository();
    mutationService = new OfferMutationService(
      offerRepository,
      inventoryItemRepository
    );
  });

  describe('Complete workflow: Change inventory item canonical unit', () => {
    it('should update all related offers when inventory item canonical unit changes from grams to kilograms', async () => {
      // This is a conceptual test - in a real integration test, you would:
      // 1. Create an inventory item with canonical unit 'g'
      // 2. Create several offers for that item with amounts in grams
      // 3. Change the inventory item's canonical unit to 'kg'
      // 4. Verify that all offers have been updated with correct price calculations

      // For now, we'll test the service methods directly
      const mockInventoryItem: InventoryItem = {
        id: 'item-1',
        name: 'Test Product',
        canonicalDimension: 'mass',
        canonicalUnit: 'g',
        shelfLifeSensitive: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockOffers: Offer[] = [
        {
          id: 'offer-1',
          inventoryItemId: 'item-1',
          supplierId: 'supplier-1',
          sourceType: 'manual',
          observedAt: '2024-01-01T00:00:00Z',
          capturedAt: '2024-01-01T00:00:00Z',
          totalPrice: 10.0,
          currency: 'CAD',
          isTaxIncluded: true,
          amount: 1000, // 1000g
          amountUnit: 'g',
          amountCanonical: 1000, // 1000g
          pricePerCanonicalExclShipping: 0.01, // 0.01 CAD per g
          pricePerCanonicalInclShipping: 0.01,
          effectivePricePerCanonical: 0.01,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'offer-2',
          inventoryItemId: 'item-1',
          supplierId: 'supplier-2',
          sourceType: 'manual',
          observedAt: '2024-01-01T00:00:00Z',
          capturedAt: '2024-01-01T00:00:00Z',
          totalPrice: 5.0,
          currency: 'CAD',
          isTaxIncluded: true,
          amount: 500, // 500g
          amountUnit: 'g',
          amountCanonical: 500, // 500g
          pricePerCanonicalExclShipping: 0.01, // 0.01 CAD per g
          pricePerCanonicalInclShipping: 0.01,
          effectivePricePerCanonical: 0.01,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Mock the repository methods
      jest.spyOn(offerRepository, 'findWhere').mockResolvedValue(mockOffers);
      jest.spyOn(inventoryItemRepository, 'findById').mockResolvedValue({
        ...mockInventoryItem,
        canonicalUnit: 'kg', // Changed to kg
      });
      jest.spyOn(offerRepository, 'update').mockResolvedValue({} as Offer);

      // Act: Simulate changing the canonical unit from grams to kilograms
      const unitChange = {
        itemId: 'item-1',
        oldCanonicalUnit: 'g',
        newCanonicalUnit: 'kg',
        canonicalDimension: 'mass' as const,
      };

      const result =
        await mutationService.mutateOffersForUnitChange(unitChange);

      // Assert
      expect(result.success).toBe(true);
      expect(result.updatedOffers).toBe(2);
      expect(result.failedOffers).toHaveLength(0);

      // Verify that the offers were updated with correct calculations
      expect(offerRepository.update).toHaveBeenCalledTimes(2);

      // Check the first offer update
      const firstUpdateCall = (offerRepository.update as jest.Mock).mock
        .calls[0];
      expect(firstUpdateCall[0]).toBe('offer-1'); // offer ID
      expect(firstUpdateCall[1].amountCanonical).toBe(1); // 1000g = 1kg
      expect(firstUpdateCall[1].pricePerCanonicalExclShipping).toBe(10.0); // 10 CAD per kg
      expect(firstUpdateCall[1].pricePerCanonicalInclShipping).toBe(10.0);
      expect(firstUpdateCall[1].effectivePricePerCanonical).toBe(10.0);

      // Check the second offer update
      const secondUpdateCall = (offerRepository.update as jest.Mock).mock
        .calls[1];
      expect(secondUpdateCall[0]).toBe('offer-2'); // offer ID
      expect(secondUpdateCall[1].amountCanonical).toBe(0.5); // 500g = 0.5kg
      expect(secondUpdateCall[1].pricePerCanonicalExclShipping).toBe(10.0); // 10 CAD per kg
      expect(secondUpdateCall[1].pricePerCanonicalInclShipping).toBe(10.0);
      expect(secondUpdateCall[1].effectivePricePerCanonical).toBe(10.0);
    });

    it('should handle volume unit changes correctly', async () => {
      // Test changing from milliliters to liters
      const mockInventoryItem: InventoryItem = {
        id: 'item-2',
        name: 'Test Liquid',
        canonicalDimension: 'volume',
        canonicalUnit: 'ml',
        shelfLifeSensitive: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockOffers: Offer[] = [
        {
          id: 'offer-3',
          inventoryItemId: 'item-2',
          supplierId: 'supplier-1',
          sourceType: 'manual',
          observedAt: '2024-01-01T00:00:00Z',
          capturedAt: '2024-01-01T00:00:00Z',
          totalPrice: 20.0,
          currency: 'CAD',
          isTaxIncluded: true,
          amount: 1000, // 1000ml
          amountUnit: 'ml',
          amountCanonical: 1000, // 1000ml
          pricePerCanonicalExclShipping: 0.02, // 0.02 CAD per ml
          pricePerCanonicalInclShipping: 0.02,
          effectivePricePerCanonical: 0.02,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Mock the repository methods
      jest.spyOn(offerRepository, 'findWhere').mockResolvedValue(mockOffers);
      jest.spyOn(inventoryItemRepository, 'findById').mockResolvedValue({
        ...mockInventoryItem,
        canonicalUnit: 'L', // Changed to liters
      });
      jest.spyOn(offerRepository, 'update').mockResolvedValue({} as Offer);

      // Act: Change from ml to L
      const unitChange = {
        itemId: 'item-2',
        oldCanonicalUnit: 'ml',
        newCanonicalUnit: 'L',
        canonicalDimension: 'volume' as const,
      };

      const result =
        await mutationService.mutateOffersForUnitChange(unitChange);

      // Assert
      expect(result.success).toBe(true);
      expect(result.updatedOffers).toBe(1);

      // Verify the calculation: 1000ml = 1L, so price per L should be 20 CAD
      const updateCall = (offerRepository.update as jest.Mock).mock.calls[0];
      expect(updateCall[1].amountCanonical).toBe(1); // 1000ml = 1L
      expect(updateCall[1].pricePerCanonicalExclShipping).toBe(20.0); // 20 CAD per L
    });
  });

  describe('Preview functionality', () => {
    it('should provide accurate preview of unit change impact', async () => {
      const mockInventoryItem: InventoryItem = {
        id: 'item-3',
        name: 'Test Product',
        canonicalDimension: 'mass',
        canonicalUnit: 'g',
        shelfLifeSensitive: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockOffers: Offer[] = [
        {
          id: 'offer-4',
          inventoryItemId: 'item-3',
          supplierId: 'supplier-1',
          sourceType: 'manual',
          observedAt: '2024-01-01T00:00:00Z',
          capturedAt: '2024-01-01T00:00:00Z',
          totalPrice: 15.0,
          currency: 'CAD',
          isTaxIncluded: true,
          amount: 1500, // 1500g
          amountUnit: 'g',
          amountCanonical: 1500,
          pricePerCanonicalExclShipping: 0.01, // 0.01 CAD per g
          pricePerCanonicalInclShipping: 0.01,
          effectivePricePerCanonical: 0.01,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Mock the repository methods
      jest.spyOn(offerRepository, 'findWhere').mockResolvedValue(mockOffers);
      jest.spyOn(inventoryItemRepository, 'findById').mockResolvedValue({
        ...mockInventoryItem,
        canonicalUnit: 'kg',
      });

      // Act: Preview the change
      const unitChange = {
        itemId: 'item-3',
        oldCanonicalUnit: 'g',
        newCanonicalUnit: 'kg',
        canonicalDimension: 'mass' as const,
      };

      const preview = await mutationService.previewUnitChangeImpact(unitChange);

      // Assert
      expect(preview.affectedOffers).toBe(1);
      expect(preview.sampleChanges).toHaveLength(1);
      expect(preview.errors).toHaveLength(0);

      const change = preview.sampleChanges[0];
      expect(change.offerId).toBe('offer-4');
      expect(change.oldPricePerCanonical).toBe(0.01); // 0.01 CAD per g
      expect(change.newPricePerCanonical).toBe(10.0); // 10 CAD per kg
      expect(change.oldAmountCanonical).toBe(1500); // 1500g
      expect(change.newAmountCanonical).toBe(1.5); // 1.5kg
    });
  });
});
