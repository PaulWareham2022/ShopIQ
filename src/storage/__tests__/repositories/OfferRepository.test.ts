/**
 * Unit tests for OfferRepository
 * Tests the complete offer storage flow including unit conversion and price computation
 */

import {
  OfferRepository,
  OfferInput,
} from '../../repositories/OfferRepository';
import { mockSQLiteResponse, resetAllMocks } from '../setup';

// Mock the database module
jest.mock('../../sqlite/database');
jest.mock('../../utils');

// Get mocked functions
import { executeSql } from '../../sqlite/database';
import {
  generateUUID,
  getCurrentTimestamp,
  validateTimestampFields,
} from '../../utils';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;
const mockGenerateUUID = generateUUID as jest.MockedFunction<
  typeof generateUUID
>;
const mockGetCurrentTimestamp = getCurrentTimestamp as jest.MockedFunction<
  typeof getCurrentTimestamp
>;
const mockValidateTimestampFields =
  validateTimestampFields as jest.MockedFunction<
    typeof validateTimestampFields
  >;

describe('OfferRepository', () => {
  let repository: OfferRepository;
  const mockTimestamp = '2024-01-01T00:00:00.000Z';
  const mockOfferId = 'offer-123';

  const sampleOfferInput: OfferInput = {
    inventory_item_id: 'item-123',
    supplier_id: 'supplier-123',
    supplier_name_snapshot: 'Test Supplier',
    source_type: 'manual',
    observed_at: mockTimestamp,
    total_price: 10.99,
    currency: 'CAD',
    is_tax_included: true,
    shipping_included: false,
    shipping_cost: 2.5,
    amount: 2,
    amount_unit: 'kg',
    quality_rating: 4,
    notes: 'Good quality product',
    photo_uri: 'https://example.com/product-photo.jpg',
  };

  beforeEach(() => {
    resetAllMocks();
    repository = new OfferRepository();

    // Setup default mock returns
    mockGenerateUUID.mockReturnValue(mockOfferId);
    mockGetCurrentTimestamp.mockReturnValue(mockTimestamp);
    mockValidateTimestampFields.mockReturnValue([]);
  });

  describe('createOffer', () => {
    it('should create offer with computed price metrics for mass dimension', async () => {
      // Mock inventory item lookup to return mass dimension
      mockExecuteSql
        .mockResolvedValueOnce(
          mockSQLiteResponse([{ canonical_dimension: 'mass' }])
        )
        .mockResolvedValueOnce(mockSQLiteResponse([], 1)); // Insert success

      const result = await repository.createOffer(sampleOfferInput);

      // Verify inventory item dimension lookup
      expect(mockExecuteSql).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT canonical_dimension'),
        ['item-123']
      );

      // Verify offer creation SQL was called
      expect(mockExecuteSql).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO offers'),
        expect.any(Array)
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: mockOfferId,
          inventory_item_id: 'item-123',
          supplier_id: 'supplier-123',
          amount_canonical: 2000, // 2 kg converted to grams
          price_per_canonical_excl_shipping: expect.any(Number),
          price_per_canonical_incl_shipping: expect.any(Number),
          effective_price_per_canonical: expect.any(Number),
        })
      );
    });

    it('should create offer with computed price metrics for volume dimension', async () => {
      const volumeOfferInput: OfferInput = {
        ...sampleOfferInput,
        amount: 1.5,
        amount_unit: 'L',
      };

      // Mock inventory item lookup to return volume dimension
      mockExecuteSql
        .mockResolvedValueOnce(
          mockSQLiteResponse([{ canonical_dimension: 'volume' }])
        )
        .mockResolvedValueOnce(mockSQLiteResponse([], 1)); // Insert success

      const result = await repository.createOffer(volumeOfferInput);

      expect(result).toEqual(
        expect.objectContaining({
          amount_canonical: 1500, // 1.5 L converted to ml
          price_per_canonical_excl_shipping: expect.any(Number),
          price_per_canonical_incl_shipping: expect.any(Number),
          effective_price_per_canonical: expect.any(Number),
        })
      );
    });

    it('should handle shipping cost in price calculations', async () => {
      const offerWithShipping: OfferInput = {
        ...sampleOfferInput,
        total_price: 20.0,
        shipping_cost: 5.0,
        shipping_included: false,
        amount: 1,
        amount_unit: 'kg',
      };

      // Mock inventory item lookup
      mockExecuteSql
        .mockResolvedValueOnce(
          mockSQLiteResponse([{ canonical_dimension: 'mass' }])
        )
        .mockResolvedValueOnce(mockSQLiteResponse([], 1));

      const result = await repository.createOffer(offerWithShipping);

      // With 1 kg = 1000g, total price 20.00, shipping 5.00
      // Price per canonical excl shipping = 20.00 / 1000 = 0.02
      // Price per canonical incl shipping = (20.00 + 5.00) / 1000 = 0.025
      expect(result.price_per_canonical_excl_shipping).toBeCloseTo(0.02, 4);
      expect(result.price_per_canonical_incl_shipping).toBeCloseTo(0.025, 4);
      expect(result.effective_price_per_canonical).toBeCloseTo(0.025, 4);
    });

    it('should throw ValidationError for invalid inventory item', async () => {
      // Mock inventory item lookup to return no results
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      await expect(repository.createOffer(sampleOfferInput)).rejects.toThrow(
        'Failed to get inventory item dimension'
      );
    });

    it('should throw ValidationError for unsupported unit conversion', async () => {
      const invalidUnitOffer: OfferInput = {
        ...sampleOfferInput,
        amount_unit: 'invalid-unit',
      };

      // Mock inventory item lookup
      mockExecuteSql.mockResolvedValueOnce(
        mockSQLiteResponse([{ canonical_dimension: 'mass' }])
      );

      await expect(repository.createOffer(invalidUnitOffer)).rejects.toThrow();
    });

    it('should store photo URI when provided', async () => {
      // Mock inventory item lookup
      mockExecuteSql
        .mockResolvedValueOnce(
          mockSQLiteResponse([{ canonical_dimension: 'mass' }])
        )
        .mockResolvedValueOnce(mockSQLiteResponse([], 1)); // Insert success

      const result = await repository.createOffer(sampleOfferInput);

      // Verify photo URI is included in the result
      expect(result.photo_uri).toBe('https://example.com/product-photo.jpg');

      // Verify the SQL insert includes photo_uri
      expect(mockExecuteSql).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO offers'),
        expect.arrayContaining([
          expect.stringContaining('https://example.com/product-photo.jpg'),
        ])
      );
    });

    it('should handle missing photo URI gracefully', async () => {
      const offerWithoutPhoto: OfferInput = {
        ...sampleOfferInput,
        photo_uri: undefined,
      };

      // Mock inventory item lookup
      mockExecuteSql
        .mockResolvedValueOnce(
          mockSQLiteResponse([{ canonical_dimension: 'mass' }])
        )
        .mockResolvedValueOnce(mockSQLiteResponse([], 1)); // Insert success

      const result = await repository.createOffer(offerWithoutPhoto);

      // Verify photo URI is undefined in the result
      expect(result.photo_uri).toBeUndefined();
    });
  });

  describe('findByInventoryItemSortedByPrice', () => {
    it('should return offers sorted by effective price ascending', async () => {
      const mockOffers = [
        {
          id: 'offer-1',
          inventory_item_id: 'item-123',
          effective_price_per_canonical: 0.02,
          created_at: mockTimestamp,
          updated_at: mockTimestamp,
        },
        {
          id: 'offer-2',
          inventory_item_id: 'item-123',
          effective_price_per_canonical: 0.01,
          created_at: mockTimestamp,
          updated_at: mockTimestamp,
        },
      ];

      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse(mockOffers));

      const result = await repository.findByInventoryItemSortedByPrice(
        'item-123',
        true
      );

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY effective_price_per_canonical ASC'),
        ['item-123']
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('findBestOfferForItem', () => {
    it('should return the cheapest offer for an item', async () => {
      const mockOffers = [
        {
          id: 'offer-1',
          inventory_item_id: 'item-123',
          effective_price_per_canonical: 0.01,
          created_at: mockTimestamp,
          updated_at: mockTimestamp,
        },
      ];

      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse(mockOffers));

      const result = await repository.findBestOfferForItem('item-123');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'offer-1',
          effective_price_per_canonical: 0.01,
        })
      );
    });

    it('should return null when no offers found', async () => {
      mockExecuteSql.mockResolvedValueOnce(mockSQLiteResponse([]));

      const result = await repository.findBestOfferForItem('item-123');

      expect(result).toBeNull();
    });
  });
});
