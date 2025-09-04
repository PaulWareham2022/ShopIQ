/**
 * Tests for OfferRepository with Unit Conversion Integration
 */

import { OfferRepository, Offer, OfferInput } from '../OfferRepository';
import { validateAndConvert } from '../../utils/canonical-units';

// Mock dependencies
jest.mock('../../sqlite/database', () => ({
  executeSql: jest.fn(),
}));

jest.mock('../../utils/canonical-units', () => ({
  validateAndConvert: jest.fn(),
  calculateNormalizedPrice: jest.fn(),
}));

const mockExecuteSql = require('../../sqlite/database').executeSql;
const mockValidateAndConvert = validateAndConvert as jest.MockedFunction<typeof validateAndConvert>;

describe('OfferRepository', () => {
  let repository: OfferRepository;

  beforeEach(() => {
    repository = new OfferRepository();
    jest.clearAllMocks();
  });

  describe('createOffer', () => {
    const mockOfferInput: OfferInput = {
      inventory_item_id: 'item-123',
      supplier_id: 'supplier-456', 
      source_type: 'manual',
      observed_at: '2024-01-15T10:00:00.000Z',
      total_price: 19.99,
      currency: 'CAD',
      amount: 2,
      amount_unit: 'kg',
    };

    it('should create offer with unit conversion and price calculation', async () => {
      // Mock inventory item dimension lookup
      mockExecuteSql.mockResolvedValueOnce({
        rows: {
          length: 1,
          item: (index: number) => ({ canonical_dimension: 'mass' })
        }
      });

      // Mock unit validation and conversion
      mockValidateAndConvert.mockReturnValue({
        isValid: true,
        canonicalAmount: 2000, // 2 kg = 2000 g
        canonicalUnit: 'g'
      });

      // Mock the actual insert
      mockExecuteSql.mockResolvedValueOnce({
        rows: { length: 0 }
      });

      const result = await repository.createOffer(mockOfferInput);

      // Verify dimension lookup was called
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('SELECT canonical_dimension'),
        ['item-123']
      );

      // Verify unit conversion was called
      expect(mockValidateAndConvert).toHaveBeenCalledWith(2, 'kg', 'mass');

      // Verify computed fields would be correct
      const expectedPricePerCanonical = 19.99 / 2000; // $19.99 / 2000g
      expect(result).toMatchObject({
        amount_canonical: 2000,
        price_per_canonical_excl_shipping: expectedPricePerCanonical,
        computed_by_version: 'v1.0.0'
      });
    });

    it('should throw validation error for invalid unit conversion', async () => {
      // Mock inventory item dimension lookup
      mockExecuteSql.mockResolvedValueOnce({
        rows: {
          length: 1,
          item: (index: number) => ({ canonical_dimension: 'mass' })
        }
      });

      // Mock failed unit validation
      mockValidateAndConvert.mockReturnValue({
        isValid: false,
        errorMessage: 'Invalid unit: invalid-unit'
      });

      await expect(repository.createOffer({
        ...mockOfferInput,
        amount_unit: 'invalid-unit'
      })).rejects.toThrow('Invalid unit: invalid-unit');
    });

    it('should throw error when inventory item not found', async () => {
      // Mock empty result for inventory item lookup
      mockExecuteSql.mockResolvedValueOnce({
        rows: { length: 0 }
      });

      await expect(repository.createOffer(mockOfferInput))
        .rejects.toThrow('Inventory item with ID item-123 not found');
    });

    it('should calculate shipping costs correctly', async () => {
      const inputWithShipping: OfferInput = {
        ...mockOfferInput,
        shipping_cost: 5.99,
        shipping_included: false
      };

      // Mock inventory item dimension lookup
      mockExecuteSql.mockResolvedValueOnce({
        rows: {
          length: 1,
          item: (index: number) => ({ canonical_dimension: 'mass' })
        }
      });

      // Mock unit validation and conversion
      mockValidateAndConvert.mockReturnValue({
        isValid: true,
        canonicalAmount: 2000,
        canonicalUnit: 'g'
      });

      // Mock the actual insert
      mockExecuteSql.mockResolvedValueOnce({
        rows: { length: 0 }
      });

      const result = await repository.createOffer(inputWithShipping);

      const expectedPriceExclShipping = 19.99 / 2000;
      const expectedPriceInclShipping = (19.99 + 5.99) / 2000;

      expect(result).toMatchObject({
        price_per_canonical_excl_shipping: expectedPriceExclShipping,
        price_per_canonical_incl_shipping: expectedPriceInclShipping,
        effective_price_per_canonical: expectedPriceInclShipping
      });
    });
  });

  describe('findBestOfferForItem', () => {
    it('should return cheapest offer for inventory item', async () => {
      // Mock offers ordered by effective_price_per_canonical ASC (cheapest first)
      const mockOffers = [
        {
          id: 'offer-2', // Cheapest first due to ORDER BY ASC
          effective_price_per_canonical: 0.012,
          inventory_item_id: 'item-123'
        },
        {
          id: 'offer-1',
          effective_price_per_canonical: 0.015,
          inventory_item_id: 'item-123'
        }
      ];

      mockExecuteSql.mockResolvedValueOnce({
        rows: {
          length: 2,
          item: (index: number) => mockOffers[index]
        }
      });

      const result = await repository.findBestOfferForItem('item-123');

      expect(result?.id).toBe('offer-2'); // Cheapest offer (first in ordered result)
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY effective_price_per_canonical ASC'),
        ['item-123']
      );
    });

    it('should return null when no offers found', async () => {
      mockExecuteSql.mockResolvedValueOnce({
        rows: { length: 0 }
      });

      const result = await repository.findBestOfferForItem('item-123');
      expect(result).toBeNull();
    });
  });

  describe('updateWithRecomputation', () => {
    const existingOffer: Offer = {
      id: 'offer-123',
      inventory_item_id: 'item-123',
      supplier_id: 'supplier-456',
      source_type: 'manual',
      observed_at: '2024-01-15T10:00:00.000Z',
      captured_at: '2024-01-15T10:00:00.000Z',
      total_price: 19.99,
      currency: 'CAD',
      is_tax_included: true,
      shipping_included: false,
      amount: 2,
      amount_unit: 'kg',
      amount_canonical: 2000,
      price_per_canonical_excl_shipping: 0.00999,
      price_per_canonical_incl_shipping: 0.00999,
      effective_price_per_canonical: 0.00999,
      computed_by_version: 'v1.0.0',
      created_at: '2024-01-15T10:00:00.000Z',
      updated_at: '2024-01-15T10:00:00.000Z'
    };

    it('should recompute metrics when price changes', async () => {
      // Mock findById to return existing offer
      jest.spyOn(repository, 'findById').mockResolvedValueOnce(existingOffer);
      
      // Mock dimension lookup
      mockExecuteSql.mockResolvedValueOnce({
        rows: {
          length: 1,
          item: (index: number) => ({ canonical_dimension: 'mass' })
        }
      });

      // Mock unit conversion (same as original)
      mockValidateAndConvert.mockReturnValue({
        isValid: true,
        canonicalAmount: 2000,
        canonicalUnit: 'g'
      });

      // Mock the update call
      jest.spyOn(repository, 'update').mockResolvedValueOnce({
        ...existingOffer,
        total_price: 24.99,
        price_per_canonical_excl_shipping: 0.012495,
        price_per_canonical_incl_shipping: 0.012495,
        effective_price_per_canonical: 0.012495,
      });

      const result = await repository.updateWithRecomputation('offer-123', {
        total_price: 24.99
      });

      expect(repository.update).toHaveBeenCalledWith('offer-123', expect.objectContaining({
        total_price: 24.99,
        amount_canonical: 2000,
        price_per_canonical_excl_shipping: 0.012495, // 24.99 / 2000
      }));
    });

    it('should not recompute when non-computation fields change', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValueOnce(existingOffer);
      jest.spyOn(repository, 'update').mockResolvedValueOnce({
        ...existingOffer,
        notes: 'Updated notes'
      });

      const result = await repository.updateWithRecomputation('offer-123', {
        notes: 'Updated notes'
      });

      // Should not call validateAndConvert or dimension lookup
      expect(mockValidateAndConvert).not.toHaveBeenCalled();
      expect(mockExecuteSql).not.toHaveBeenCalled();

      expect(repository.update).toHaveBeenCalledWith('offer-123', {
        notes: 'Updated notes'
      });
    });
  });
});
