/**
 * Unit tests for InventoryItemRepository mutation functionality
 */

import { InventoryItemRepository } from '../InventoryItemRepository';
import { OfferMutationService } from '../../services/OfferMutationService';
import { OfferRepository } from '../OfferRepository';
import { InventoryItem } from '../../types';

// Mock the services and repositories
jest.mock('../../services/OfferMutationService');
jest.mock('../OfferRepository');

describe('InventoryItemRepository - Mutation Functionality', () => {
  let repository: InventoryItemRepository;
  let mockOfferMutationService: jest.Mocked<OfferMutationService>;
  let mockOfferRepository: jest.Mocked<OfferRepository>;

  const mockInventoryItem: InventoryItem = {
    id: 'item-1',
    name: 'Test Item',
    canonicalDimension: 'mass',
    canonicalUnit: 'g',
    shelfLifeSensitive: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new InventoryItemRepository();

    mockOfferMutationService = new OfferMutationService(
      {} as OfferRepository,
      repository
    ) as jest.Mocked<OfferMutationService>;

    mockOfferRepository = new OfferRepository() as jest.Mocked<OfferRepository>;
  });

  describe('updateWithOfferMutation', () => {
    it('should update inventory item and mutate offers when canonical unit changes', async () => {
      // Arrange
      const currentItem = { ...mockInventoryItem };
      const updatedItem = { ...mockInventoryItem, canonicalUnit: 'kg' };

      jest.spyOn(repository, 'findById').mockResolvedValue(currentItem);
      jest.spyOn(repository, 'update').mockResolvedValue(updatedItem);

      const mutationResult = {
        success: true,
        updatedOffers: 2,
        failedOffers: [],
        errors: [],
      };

      mockOfferMutationService.mutateOffersForUnitChange.mockResolvedValue(
        mutationResult
      );

      // Mock the dynamic imports
      jest.doMock('../../services/OfferMutationService', () => ({
        OfferMutationService: jest
          .fn()
          .mockImplementation(() => mockOfferMutationService),
      }));
      jest.doMock('../OfferRepository', () => ({
        OfferRepository: jest
          .fn()
          .mockImplementation(() => mockOfferRepository),
      }));

      // Act
      const result = await repository.updateWithOfferMutation('item-1', {
        canonicalUnit: 'kg',
      });

      // Assert
      expect(result).toEqual(updatedItem);
      expect(repository.update).toHaveBeenCalledWith('item-1', {
        canonicalUnit: 'kg',
      });
    });

    it('should not mutate offers when canonical unit does not change', async () => {
      // Arrange
      const currentItem = { ...mockInventoryItem };
      const updatedItem = { ...mockInventoryItem, name: 'Updated Name' };

      jest.spyOn(repository, 'findById').mockResolvedValue(currentItem);
      jest.spyOn(repository, 'update').mockResolvedValue(updatedItem);

      // Act
      const result = await repository.updateWithOfferMutation('item-1', {
        name: 'Updated Name',
      });

      // Assert
      expect(result).toEqual(updatedItem);
      expect(repository.update).toHaveBeenCalledWith('item-1', {
        name: 'Updated Name',
      });
      // Should not call mutation service since canonical unit didn't change
    });

    it('should not mutate offers when mutateOffers option is false', async () => {
      // Arrange
      const currentItem = { ...mockInventoryItem };
      const updatedItem = { ...mockInventoryItem, canonicalUnit: 'kg' };

      jest.spyOn(repository, 'findById').mockResolvedValue(currentItem);
      jest.spyOn(repository, 'update').mockResolvedValue(updatedItem);

      // Act
      const result = await repository.updateWithOfferMutation(
        'item-1',
        { canonicalUnit: 'kg' },
        { mutateOffers: false }
      );

      // Assert
      expect(result).toEqual(updatedItem);
      expect(repository.update).toHaveBeenCalledWith('item-1', {
        canonicalUnit: 'kg',
      });
      // Should not call mutation service since mutateOffers is false
    });

    it('should call onOfferMutation callback when provided', async () => {
      // Arrange
      const currentItem = { ...mockInventoryItem };
      const updatedItem = { ...mockInventoryItem, canonicalUnit: 'kg' };
      const onOfferMutationCallback = jest.fn();

      jest.spyOn(repository, 'findById').mockResolvedValue(currentItem);
      jest.spyOn(repository, 'update').mockResolvedValue(updatedItem);

      const mutationResult = {
        success: true,
        updatedOffers: 2,
        failedOffers: [],
        errors: [],
      };

      mockOfferMutationService.mutateOffersForUnitChange.mockResolvedValue(
        mutationResult
      );

      // Mock the dynamic imports
      jest.doMock('../../services/OfferMutationService', () => ({
        OfferMutationService: jest
          .fn()
          .mockImplementation(() => mockOfferMutationService),
      }));
      jest.doMock('../OfferRepository', () => ({
        OfferRepository: jest
          .fn()
          .mockImplementation(() => mockOfferRepository),
      }));

      // Act
      await repository.updateWithOfferMutation(
        'item-1',
        { canonicalUnit: 'kg' },
        { onOfferMutation: onOfferMutationCallback }
      );

      // Assert
      expect(onOfferMutationCallback).toHaveBeenCalledWith(mutationResult);
    });

    it('should handle mutation errors gracefully', async () => {
      // Arrange
      const currentItem = { ...mockInventoryItem };
      const updatedItem = { ...mockInventoryItem, canonicalUnit: 'kg' };

      jest.spyOn(repository, 'findById').mockResolvedValue(currentItem);
      jest.spyOn(repository, 'update').mockResolvedValue(updatedItem);

      mockOfferMutationService.mutateOffersForUnitChange.mockRejectedValue(
        new Error('Mutation failed')
      );

      // Mock the dynamic imports
      jest.doMock('../../services/OfferMutationService', () => ({
        OfferMutationService: jest
          .fn()
          .mockImplementation(() => mockOfferMutationService),
      }));
      jest.doMock('../OfferRepository', () => ({
        OfferRepository: jest
          .fn()
          .mockImplementation(() => mockOfferRepository),
      }));

      // Act
      const result = await repository.updateWithOfferMutation('item-1', {
        canonicalUnit: 'kg',
      });

      // Assert
      expect(result).toEqual(updatedItem);
      // Should still return the updated item even if mutation fails
    });

    it('should return null when inventory item is not found', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      // Act
      const result = await repository.updateWithOfferMutation('item-1', {
        canonicalUnit: 'kg',
      });

      // Assert
      expect(result).toBeNull();
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('previewCanonicalUnitChange', () => {
    it('should preview the impact of a canonical unit change', async () => {
      // Arrange
      const currentItem = { ...mockInventoryItem };
      const previewResult = {
        affectedOffers: 2,
        sampleChanges: [
          {
            offerId: 'offer-1',
            oldPricePerCanonical: 0.01,
            newPricePerCanonical: 10.0,
            oldAmountCanonical: 1000,
            newAmountCanonical: 1,
          },
        ],
        errors: [],
      };

      jest.spyOn(repository, 'findById').mockResolvedValue(currentItem);
      mockOfferMutationService.previewUnitChangeImpact.mockResolvedValue(
        previewResult
      );

      // Mock the dynamic imports
      jest.doMock('../../services/OfferMutationService', () => ({
        OfferMutationService: jest
          .fn()
          .mockImplementation(() => mockOfferMutationService),
      }));
      jest.doMock('../OfferRepository', () => ({
        OfferRepository: jest
          .fn()
          .mockImplementation(() => mockOfferRepository),
      }));

      // Act
      const result = await repository.previewCanonicalUnitChange(
        'item-1',
        'kg'
      );

      // Assert
      expect(result.currentItem).toEqual(currentItem);
      expect(result.affectedOffers).toBe(2);
      expect(result.sampleChanges).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(
        mockOfferMutationService.previewUnitChangeImpact
      ).toHaveBeenCalledWith({
        itemId: 'item-1',
        oldCanonicalUnit: 'g',
        newCanonicalUnit: 'kg',
        canonicalDimension: 'mass',
      });
    });

    it('should handle case when inventory item is not found', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      // Act
      const result = await repository.previewCanonicalUnitChange(
        'item-1',
        'kg'
      );

      // Assert
      expect(result.currentItem).toBeNull();
      expect(result.affectedOffers).toBe(0);
      expect(result.sampleChanges).toHaveLength(0);
      expect(result.errors).toContain('Inventory item not found');
    });

    it('should handle case when canonical unit is already set to the new value', async () => {
      // Arrange
      const currentItem = { ...mockInventoryItem };
      jest.spyOn(repository, 'findById').mockResolvedValue(currentItem);

      // Act
      const result = await repository.previewCanonicalUnitChange('item-1', 'g');

      // Assert
      expect(result.currentItem).toEqual(currentItem);
      expect(result.affectedOffers).toBe(0);
      expect(result.sampleChanges).toHaveLength(0);
      expect(result.errors).toContain(
        'Canonical unit is already set to this value'
      );
    });

    it('should handle preview errors gracefully', async () => {
      // Arrange
      const currentItem = { ...mockInventoryItem };
      jest.spyOn(repository, 'findById').mockResolvedValue(currentItem);
      mockOfferMutationService.previewUnitChangeImpact.mockRejectedValue(
        new Error('Preview failed')
      );

      // Mock the dynamic imports
      jest.doMock('../../services/OfferMutationService', () => ({
        OfferMutationService: jest
          .fn()
          .mockImplementation(() => mockOfferMutationService),
      }));
      jest.doMock('../OfferRepository', () => ({
        OfferRepository: jest
          .fn()
          .mockImplementation(() => mockOfferRepository),
      }));

      // Act
      const result = await repository.previewCanonicalUnitChange(
        'item-1',
        'kg'
      );

      // Assert
      expect(result.currentItem).toBeNull();
      expect(result.affectedOffers).toBe(0);
      expect(result.sampleChanges).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain(
        'Failed to preview canonical unit change'
      );
    });
  });
});
