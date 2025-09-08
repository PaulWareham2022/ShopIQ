/**
 * Unit Tests for Base Comparator
 *
 * Tests the abstract base class functionality including validation,
 * error handling, and utility methods used by all comparison strategies.
 */

import { BaseComparator } from '../BaseComparator';
import { ComparisonResult, ValidationResult } from '../types';
import { Offer, InventoryItem, Supplier } from '../../types';

// Create a concrete implementation for testing
class TestComparator extends BaseComparator {
  readonly id = 'test';
  readonly name = 'Test Comparator';
  readonly description = 'Test comparator for unit testing';
  readonly version = '1.0.0';

  protected async performComparison(
    offer: Offer,
    _allOffers: Offer[],
    _inventoryItem: InventoryItem,
    _suppliers: Map<string, Supplier>,
    _options: Record<string, any>
  ): Promise<ComparisonResult> {
    // Simple test implementation that returns the effective price as score
    return this.createResult(offer, offer.effectivePricePerCanonical, {
      scoreBreakdown: {
        basePrice: offer.effectivePricePerCanonical,
      },
      flags: ['test-comparator'],
      explanation: `Test score: ${offer.effectivePricePerCanonical}`,
      confidence: 0.9,
    });
  }

  validateOptions(options?: Record<string, any>): ValidationResult {
    const defaultOptions = this.getDefaultOptions();
    const normalizedOptions = { ...defaultOptions, ...options };

    const errors: string[] = [];

    if (
      normalizedOptions.testOption !== undefined &&
      typeof normalizedOptions.testOption !== 'boolean'
    ) {
      errors.push('testOption must be a boolean');
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined,
      normalizedOptions,
    };
  }

  getDefaultOptions(): Record<string, any> {
    return {
      testOption: true,
    };
  }
}

// Mock data
const createMockInventoryItem = (
  overrides: Partial<InventoryItem> = {}
): InventoryItem => ({
  id: 'item-1',
  name: 'Test Item',
  canonicalDimension: 'mass',
  canonicalUnit: 'g',
  shelfLifeSensitive: false,
  equivalenceFactor: 1.0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockOffer = (overrides: Partial<Offer> = {}): Offer => ({
  id: 'offer-1',
  inventoryItemId: 'item-1',
  supplierId: 'supplier-1',
  supplierNameSnapshot: 'Test Supplier',
  sourceType: 'manual',
  observedAt: new Date().toISOString(),
  capturedAt: new Date().toISOString(),
  totalPrice: 100.0,
  amount: 10.0,
  amountUnit: 'kg',
  amountCanonical: 10.0,
  pricePerCanonicalExclShipping: 10.0,
  pricePerCanonicalInclShipping: 10.0,
  effectivePricePerCanonical: 10.0,
  currency: 'USD',
  shippingCost: 0,
  shippingIncluded: true,
  isTaxIncluded: true,
  taxRate: 0.1,
  qualityRating: 4,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockSupplier = (overrides: Partial<Supplier> = {}): Supplier => ({
  id: 'supplier-1',
  name: 'Test Supplier',
  countryCode: 'CA',
  defaultCurrency: 'CAD',
  membershipRequired: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('BaseComparator', () => {
  let comparator: TestComparator;
  let mockInventoryItem: InventoryItem;
  let mockOffers: Offer[];
  let mockSuppliers: Map<string, Supplier>;

  beforeEach(() => {
    comparator = new TestComparator();
    mockInventoryItem = createMockInventoryItem();
    mockOffers = [
      createMockOffer({ id: 'offer-1', effectivePricePerCanonical: 10.0 }),
      createMockOffer({ id: 'offer-2', effectivePricePerCanonical: 15.0 }),
    ];
    mockSuppliers = new Map([['supplier-1', createMockSupplier()]]);
  });

  describe('compare method', () => {
    it('should perform comparison successfully', async () => {
      const result = await comparator.compare(
        mockOffers[0],
        mockOffers,
        mockInventoryItem,
        mockSuppliers,
        { testOption: true }
      );

      expect(result).toBeDefined();
      expect(result.offer).toBe(mockOffers[0]);
      expect(result.score).toBe(10.0);
      expect(result.metadata?.flags).toContain('test-comparator');
      expect(result.metadata?.explanation).toContain(
        'Test Supplier offer: USD 10.0000 per 10 kg (score: 10.0000)'
      );
      expect(result.metadata?.confidence).toBeCloseTo(0.95, 2);
    });

    it('should validate inputs before comparison', async () => {
      await expect(
        comparator.compare(
          null as any,
          mockOffers,
          mockInventoryItem,
          mockSuppliers,
          {}
        )
      ).rejects.toThrow('Offer is required');
    });

    it('should validate allOffers array', async () => {
      await expect(
        comparator.compare(
          mockOffers[0],
          null as any,
          mockInventoryItem,
          mockSuppliers,
          {}
        )
      ).rejects.toThrow('All offers must be an array');
    });

    it('should validate inventory item', async () => {
      await expect(
        comparator.compare(
          mockOffers[0],
          mockOffers,
          null as any,
          mockSuppliers,
          {}
        )
      ).rejects.toThrow('Inventory item is required');
    });

    it('should validate suppliers map', async () => {
      await expect(
        comparator.compare(
          mockOffers[0],
          mockOffers,
          mockInventoryItem,
          null as any,
          {}
        )
      ).rejects.toThrow('Suppliers must be a Map');
    });

    it('should ensure offer is in allOffers array', async () => {
      const differentOffer = createMockOffer({ id: 'different-offer' });

      await expect(
        comparator.compare(
          differentOffer,
          mockOffers,
          mockInventoryItem,
          mockSuppliers,
          {}
        )
      ).rejects.toThrow('Offer must be included in allOffers array');
    });

    it('should ensure all offers are for the same inventory item', async () => {
      const mismatchedOffers = [
        createMockOffer({ id: 'offer-1', inventoryItemId: 'item-1' }),
        createMockOffer({ id: 'offer-2', inventoryItemId: 'item-2' }), // Different item
      ];

      await expect(
        comparator.compare(
          mismatchedOffers[0],
          mismatchedOffers,
          mockInventoryItem,
          mockSuppliers,
          {}
        )
      ).rejects.toThrow('Found 1 offers for different inventory items');
    });

    it('should validate and normalize options', async () => {
      const result = await comparator.compare(
        mockOffers[0],
        mockOffers,
        mockInventoryItem,
        mockSuppliers,
        { testOption: false }
      );

      expect(result).toBeDefined();
      expect(result.score).toBe(10.0);
    });

    it('should reject invalid options', async () => {
      await expect(
        comparator.compare(
          mockOffers[0],
          mockOffers,
          mockInventoryItem,
          mockSuppliers,
          { testOption: 'invalid' }
        )
      ).rejects.toThrow('Invalid options for comparator test');
    });

    it('should handle comparison errors gracefully', async () => {
      // Create a comparator that throws an error
      class ErrorComparator extends TestComparator {
        protected async performComparison(): Promise<ComparisonResult> {
          throw new Error('Test error');
        }
      }

      const errorComparator = new ErrorComparator();

      await expect(
        errorComparator.compare(
          mockOffers[0],
          mockOffers,
          mockInventoryItem,
          mockSuppliers,
          {}
        )
      ).rejects.toThrow('Error in comparator test');
    });
  });

  describe('utility methods', () => {
    describe('isOfferStale', () => {
      it('should detect stale offers', () => {
        const staleOffer = createMockOffer({
          observedAt: new Date(
            Date.now() - 35 * 24 * 60 * 60 * 1000
          ).toISOString(), // 35 days ago
        });

        const isStale = (comparator as any).isOfferStale(staleOffer, 30);
        expect(isStale).toBe(true);
      });

      it('should detect fresh offers', () => {
        const freshOffer = createMockOffer({
          observedAt: new Date(
            Date.now() - 10 * 24 * 60 * 60 * 1000
          ).toISOString(), // 10 days ago
        });

        const isStale = (comparator as any).isOfferStale(freshOffer, 30);
        expect(isStale).toBe(false);
      });

      it('should use custom max age', () => {
        const offer = createMockOffer({
          observedAt: new Date(
            Date.now() - 5 * 24 * 60 * 60 * 1000
          ).toISOString(), // 5 days ago
        });

        const isStale = (comparator as any).isOfferStale(offer, 3); // 3 days max age
        expect(isStale).toBe(true);
      });
    });

    describe('getSupplierName', () => {
      it('should return supplier name from snapshot', () => {
        const offer = createMockOffer({
          supplierNameSnapshot: 'Custom Supplier',
        });
        const name = (comparator as any).getSupplierName(offer);
        expect(name).toBe('Custom Supplier');
      });

      it('should fall back to supplier ID when snapshot is missing', () => {
        const offer = createMockOffer({ supplierNameSnapshot: undefined });
        const name = (comparator as any).getSupplierName(offer);
        expect(name).toBe('Supplier supplier-1');
      });
    });

    describe('formatPrice', () => {
      it('should format price with currency', () => {
        const formatted = (comparator as any).formatPrice(10.1234, 'USD');
        expect(formatted).toBe('USD 10.1234');
      });

      it('should handle different currencies', () => {
        const formatted = (comparator as any).formatPrice(5.5, 'EUR');
        expect(formatted).toBe('EUR 5.5000');
      });
    });

    describe('getSupplier', () => {
      it('should return supplier from map', () => {
        const supplier = (comparator as any).getSupplier(
          mockOffers[0],
          mockSuppliers
        );
        expect(supplier).toBe(mockSuppliers.get('supplier-1'));
      });

      it('should return null for missing supplier', () => {
        const offer = createMockOffer({ supplierId: 'missing-supplier' });
        const supplier = (comparator as any).getSupplier(offer, mockSuppliers);
        expect(supplier).toBeNull();
      });
    });

    describe('applyEquivalenceFactor', () => {
      it('should apply equivalence factor when not 1.0', () => {
        const inventoryItem = createMockInventoryItem({
          equivalenceFactor: 2.0,
        });
        const adjustedPrice = (comparator as any).applyEquivalenceFactor(
          10.0,
          inventoryItem
        );
        expect(adjustedPrice).toBe(5.0); // 10 / 2.0
      });

      it('should not adjust price when equivalence factor is 1.0', () => {
        const inventoryItem = createMockInventoryItem({
          equivalenceFactor: 1.0,
        });
        const adjustedPrice = (comparator as any).applyEquivalenceFactor(
          10.0,
          inventoryItem
        );
        expect(adjustedPrice).toBe(10.0);
      });

      it('should not adjust price when equivalence factor is undefined', () => {
        const inventoryItem = createMockInventoryItem({
          equivalenceFactor: undefined,
        });
        const adjustedPrice = (comparator as any).applyEquivalenceFactor(
          10.0,
          inventoryItem
        );
        expect(adjustedPrice).toBe(10.0);
      });
    });

    describe('normalizeScore', () => {
      it('should normalize score to 0-1 range', () => {
        const normalized = (comparator as any).normalizeScore(5, 0, 10);
        expect(normalized).toBe(0.5);
      });

      it('should handle edge case when min equals max', () => {
        const normalized = (comparator as any).normalizeScore(5, 5, 5);
        expect(normalized).toBe(0.5);
      });

      it('should handle negative scores', () => {
        const normalized = (comparator as any).normalizeScore(-5, -10, 10);
        expect(normalized).toBe(0.25); // (-5 - (-10)) / (10 - (-10)) = 5/20 = 0.25
      });
    });

    describe('calculatePercentile', () => {
      it('should calculate percentile rank correctly', () => {
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const percentile = (comparator as any).calculatePercentile(5, values);
        expect(percentile).toBe(0.4); // 5 is at index 4 out of 10
      });

      it('should return 0 for lowest value', () => {
        const values = [1, 2, 3, 4, 5];
        const percentile = (comparator as any).calculatePercentile(1, values);
        expect(percentile).toBe(0.0);
      });

      it('should return 1 for highest value', () => {
        const values = [1, 2, 3, 4, 5];
        const percentile = (comparator as any).calculatePercentile(6, values);
        expect(percentile).toBe(1.0);
      });
    });
  });

  describe('confidence calculation', () => {
    it('should calculate confidence based on offer quality', async () => {
      const highQualityOffer = createMockOffer({
        qualityRating: 5,
        supplierUrl: 'https://example.com',
        observedAt: new Date().toISOString(), // Recent
      });

      const result = await comparator.compare(
        highQualityOffer,
        [highQualityOffer],
        mockInventoryItem,
        mockSuppliers,
        {}
      );

      expect(result.metadata?.confidence).toBeGreaterThan(0.8);
    });

    it('should reduce confidence for missing quality rating', async () => {
      const lowQualityOffer = createMockOffer({
        qualityRating: undefined,
        supplierUrl: undefined,
        observedAt: new Date(
          Date.now() - 40 * 24 * 60 * 60 * 1000
        ).toISOString(), // Stale
      });

      const result = await comparator.compare(
        lowQualityOffer,
        [lowQualityOffer],
        mockInventoryItem,
        mockSuppliers,
        {}
      );

      expect(result.metadata?.confidence).toBeLessThan(0.8);
    });

    it('should reduce confidence for offers with very different prices', async () => {
      const offers = [
        createMockOffer({ id: 'offer-1', effectivePricePerCanonical: 10.0 }),
        createMockOffer({ id: 'offer-2', effectivePricePerCanonical: 10.0 }),
        createMockOffer({ id: 'offer-3', effectivePricePerCanonical: 10.0 }),
        createMockOffer({ id: 'offer-4', effectivePricePerCanonical: 50.0 }), // Very different
      ];

      const result = await comparator.compare(
        offers[3], // The outlier
        offers,
        mockInventoryItem,
        mockSuppliers,
        {}
      );

      expect(result.metadata?.confidence).toBeLessThan(0.7);
    });
  });

  describe('createResult method', () => {
    it('should create result with required fields', () => {
      const result = (comparator as any).createResult(mockOffers[0], 15.5, {
        flags: ['test-flag'],
        explanation: 'Test explanation',
      });

      expect(result.offer).toBe(mockOffers[0]);
      expect(result.score).toBe(15.5);
      expect(result.metadata.flags).toEqual(['test-flag']);
      expect(result.metadata.explanation).toBe('Test explanation');
    });

    it('should provide default flags when not specified', () => {
      const result = (comparator as any).createResult(mockOffers[0], 15.5);
      expect(result.metadata.flags).toEqual([]);
    });

    it('should merge metadata correctly', () => {
      const result = (comparator as any).createResult(mockOffers[0], 15.5, {
        flags: ['existing-flag'],
        explanation: 'Test explanation',
        confidence: 0.8,
      });

      expect(result.metadata.flags).toEqual(['existing-flag']);
      expect(result.metadata.explanation).toBe('Test explanation');
      expect(result.metadata.confidence).toBe(0.8);
    });
  });

  describe('default implementations', () => {
    it('should provide default validation', () => {
      const result = comparator.validateOptions({ testOption: true });
      expect(result.isValid).toBe(true);
      expect(result.normalizedOptions).toEqual({ testOption: true });
    });

    it('should provide default options', () => {
      const options = comparator.getDefaultOptions();
      expect(options).toEqual({ testOption: true });
    });
  });
});
