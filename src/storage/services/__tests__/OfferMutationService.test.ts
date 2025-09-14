/**
 * Unit tests for OfferMutationService
 */

import { OfferMutationService } from '../OfferMutationService';
import { OfferRepository } from '../../repositories/OfferRepository';
import { InventoryItemRepository } from '../../repositories/InventoryItemRepository';
import { Offer, InventoryItem } from '../../types';

// Mock the repositories
jest.mock('../../repositories/OfferRepository');
jest.mock('../../repositories/InventoryItemRepository');

describe('OfferMutationService', () => {
  let service: OfferMutationService;
  let mockOfferRepository: jest.Mocked<OfferRepository>;
  let mockInventoryItemRepository: jest.Mocked<InventoryItemRepository>;

  const mockInventoryItem: InventoryItem = {
    id: 'item-1',
    name: 'Test Item',
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
      amount: 1000,
      amountUnit: 'g',
      amountCanonical: 1000,
      pricePerCanonicalExclShipping: 0.01,
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
      amount: 500,
      amountUnit: 'g',
      amountCanonical: 500,
      pricePerCanonicalExclShipping: 0.01,
      pricePerCanonicalInclShipping: 0.01,
      effectivePricePerCanonical: 0.01,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockOfferRepository = new OfferRepository() as jest.Mocked<OfferRepository>;
    mockInventoryItemRepository =
      new InventoryItemRepository() as jest.Mocked<InventoryItemRepository>;

    service = new OfferMutationService(
      mockOfferRepository,
      mockInventoryItemRepository
    );
  });

  describe('mutateOffersForUnitChange', () => {
    it('should successfully update all offers when canonical unit changes', async () => {
      // Arrange
      mockOfferRepository.findWhere.mockResolvedValue(mockOffers);
      mockInventoryItemRepository.findById.mockResolvedValue({
        ...mockInventoryItem,
        canonicalUnit: 'kg', // Changed from 'g' to 'kg'
      });
      mockOfferRepository.update.mockResolvedValue({} as Offer);

      const unitChange = {
        itemId: 'item-1',
        oldCanonicalUnit: 'g',
        newCanonicalUnit: 'kg',
        canonicalDimension: 'mass' as const,
      };

      // Act
      const result = await service.mutateOffersForUnitChange(unitChange);

      // Assert
      expect(result.success).toBe(true);
      expect(result.updatedOffers).toBe(2);
      expect(result.failedOffers).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(mockOfferRepository.update).toHaveBeenCalledTimes(2);
    });

    it('should handle case when no offers exist for the item', async () => {
      // Arrange
      mockOfferRepository.findWhere.mockResolvedValue([]);
      mockInventoryItemRepository.findById.mockResolvedValue(mockInventoryItem);

      const unitChange = {
        itemId: 'item-1',
        oldCanonicalUnit: 'g',
        newCanonicalUnit: 'kg',
        canonicalDimension: 'mass' as const,
      };

      // Act
      const result = await service.mutateOffersForUnitChange(unitChange);

      // Assert
      expect(result.success).toBe(true);
      expect(result.updatedOffers).toBe(0);
      expect(mockOfferRepository.update).not.toHaveBeenCalled();
    });

    it('should handle case when inventory item is not found', async () => {
      // Arrange
      mockOfferRepository.findWhere.mockResolvedValue(mockOffers);
      mockInventoryItemRepository.findById.mockResolvedValue(null);

      const unitChange = {
        itemId: 'item-1',
        oldCanonicalUnit: 'g',
        newCanonicalUnit: 'kg',
        canonicalDimension: 'mass' as const,
      };

      // Act
      const result = await service.mutateOffersForUnitChange(unitChange);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Inventory item with ID item-1 not found'
      );
    });

    it('should handle partial failures when updating offers', async () => {
      // Arrange
      mockOfferRepository.findWhere.mockResolvedValue(mockOffers);
      mockInventoryItemRepository.findById.mockResolvedValue({
        ...mockInventoryItem,
        canonicalUnit: 'kg',
      });

      // First update succeeds, second fails
      mockOfferRepository.update
        .mockResolvedValueOnce({} as Offer)
        .mockRejectedValueOnce(new Error('Update failed'));

      const unitChange = {
        itemId: 'item-1',
        oldCanonicalUnit: 'g',
        newCanonicalUnit: 'kg',
        canonicalDimension: 'mass' as const,
      };

      // Act
      const result = await service.mutateOffersForUnitChange(unitChange);

      // Assert
      expect(result.success).toBe(false);
      expect(result.updatedOffers).toBe(1);
      expect(result.failedOffers).toHaveLength(1);
      expect(result.failedOffers).toContain('offer-2');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to update offer offer-2');
    });
  });

  describe('getAffectedOffers', () => {
    it('should return all offers for the given inventory item', async () => {
      // Arrange
      mockOfferRepository.findWhere.mockResolvedValue(mockOffers);

      // Act
      const result = await service.getAffectedOffers('item-1');

      // Assert
      expect(result).toEqual(mockOffers);
      expect(mockOfferRepository.findWhere).toHaveBeenCalledWith({
        inventoryItemId: 'item-1',
      });
    });
  });

  describe('previewUnitChangeImpact', () => {
    it('should preview the impact of a unit change', async () => {
      // Arrange
      mockOfferRepository.findWhere.mockResolvedValue(mockOffers);
      mockInventoryItemRepository.findById.mockResolvedValue({
        ...mockInventoryItem,
        canonicalUnit: 'kg',
      });

      const unitChange = {
        itemId: 'item-1',
        oldCanonicalUnit: 'g',
        newCanonicalUnit: 'kg',
        canonicalDimension: 'mass' as const,
      };

      // Act
      const result = await service.previewUnitChangeImpact(unitChange);

      // Assert
      expect(result.affectedOffers).toBe(2);
      expect(result.sampleChanges).toHaveLength(2);
      expect(result.errors).toHaveLength(0);

      // Check that the price per canonical unit is correctly recalculated
      // 1000g = 1kg, so price per kg should be 1000x the price per g
      const firstChange = result.sampleChanges[0];
      expect(firstChange.oldPricePerCanonical).toBe(0.01); // 0.01 CAD per g
      expect(firstChange.newPricePerCanonical).toBe(10.0); // 10 CAD per kg
      expect(firstChange.oldAmountCanonical).toBe(1000); // 1000g
      expect(firstChange.newAmountCanonical).toBe(1); // 1kg
    });

    it('should handle case when inventory item is not found', async () => {
      // Arrange
      mockOfferRepository.findWhere.mockResolvedValue(mockOffers);
      mockInventoryItemRepository.findById.mockResolvedValue(null);

      const unitChange = {
        itemId: 'item-1',
        oldCanonicalUnit: 'g',
        newCanonicalUnit: 'kg',
        canonicalDimension: 'mass' as const,
      };

      // Act
      const result = await service.previewUnitChangeImpact(unitChange);

      // Assert
      expect(result.affectedOffers).toBe(2);
      expect(result.sampleChanges).toHaveLength(0);
      expect(result.errors).toContain(
        'Inventory item with ID item-1 not found'
      );
    });

    it('should limit sample changes to 5 offers', async () => {
      // Arrange
      const manyOffers = Array.from({ length: 10 }, (_, i) => ({
        ...mockOffers[0],
        id: `offer-${i}`,
      }));

      mockOfferRepository.findWhere.mockResolvedValue(manyOffers);
      mockInventoryItemRepository.findById.mockResolvedValue({
        ...mockInventoryItem,
        canonicalUnit: 'kg',
      });

      const unitChange = {
        itemId: 'item-1',
        oldCanonicalUnit: 'g',
        newCanonicalUnit: 'kg',
        canonicalDimension: 'mass' as const,
      };

      // Act
      const result = await service.previewUnitChangeImpact(unitChange);

      // Assert
      expect(result.affectedOffers).toBe(10);
      expect(result.sampleChanges).toHaveLength(5); // Limited to 5
    });
  });
});
