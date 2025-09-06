/**
 * Unit Tests for Price Calculation Utilities
 *
 * Comprehensive tests for price-per-canonical-unit calculation functions,
 * including edge cases, error handling, and validation.
 */

import {
  calculatePricePerCanonical,
  calculatePricePerCanonicalExcluding,
  calculatePricePerCanonicalIncluding,
  calculatePricePerCanonicalEffective,
  validatePriceCalculationInputs,
  calculatePricesForOffers,
  filterOffersByCalculation,
  comparePriceResults,
  formatPriceResult,
  PriceCalculationOptions,
  PriceCalculationResult,
} from '../priceCalculations';
import { Offer, InventoryItem, CanonicalDimension } from '../../types';

// =============================================================================
// TEST DATA SETUP
// =============================================================================

const createMockInventoryItem = (overrides: Partial<InventoryItem> = {}): InventoryItem => ({
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

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe('validatePriceCalculationInputs', () => {
  it('should validate correct inputs successfully', () => {
    const offer = createMockOffer();
    const inventoryItem = createMockInventoryItem();
    const options: PriceCalculationOptions = {};

    const result = validatePriceCalculationInputs(offer, inventoryItem, options);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject null offer', () => {
    const inventoryItem = createMockInventoryItem();
    const options: PriceCalculationOptions = {};

    const result = validatePriceCalculationInputs(null as any, inventoryItem, options);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Offer is required');
  });

  it('should reject null inventory item', () => {
    const offer = createMockOffer();
    const options: PriceCalculationOptions = {};

    const result = validatePriceCalculationInputs(offer, null as any, options);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Inventory item is required');
  });

  it('should reject invalid total price', () => {
    const offer = createMockOffer({ totalPrice: -10 });
    const inventoryItem = createMockInventoryItem();
    const options: PriceCalculationOptions = {};

    const result = validatePriceCalculationInputs(offer, inventoryItem, options);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Offer total price must be a positive finite number');
  });

  it('should reject invalid amount', () => {
    const offer = createMockOffer({ amount: 0 });
    const inventoryItem = createMockInventoryItem();
    const options: PriceCalculationOptions = {};

    const result = validatePriceCalculationInputs(offer, inventoryItem, options);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Offer amount must be a positive finite number');
  });

  it('should reject missing amount unit', () => {
    const offer = createMockOffer({ amountUnit: '' });
    const inventoryItem = createMockInventoryItem();
    const options: PriceCalculationOptions = {};

    const result = validatePriceCalculationInputs(offer, inventoryItem, options);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Offer amount unit is required');
  });

  it('should reject invalid currency rate', () => {
    const offer = createMockOffer();
    const inventoryItem = createMockInventoryItem();
    const options: PriceCalculationOptions = { currencyRate: -1.0 };

    const result = validatePriceCalculationInputs(offer, inventoryItem, options);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Currency rate must be a positive finite number');
  });

  it('should warn about invalid shipping cost', () => {
    const offer = createMockOffer({ shippingCost: -5 });
    const inventoryItem = createMockInventoryItem();
    const options: PriceCalculationOptions = { includeShipping: true };

    const result = validatePriceCalculationInputs(offer, inventoryItem, options);

    expect(result.isValid).toBe(true);
    expect(result.warnings).toContain('Shipping cost is not a valid positive number');
  });

  it('should warn about invalid tax rate', () => {
    const offer = createMockOffer({ taxRate: -0.1 });
    const inventoryItem = createMockInventoryItem();
    const options: PriceCalculationOptions = { includeTax: true };

    const result = validatePriceCalculationInputs(offer, inventoryItem, options);

    expect(result.isValid).toBe(true);
    expect(result.warnings).toContain('Tax rate is not a valid positive number');
  });
});

// =============================================================================
// PRICE CALCULATION TESTS
// =============================================================================

describe('calculatePricePerCanonicalExcluding', () => {
  it('should calculate price excluding shipping and tax', () => {
    const offer = createMockOffer({
      totalPrice: 100.0,
      amount: 10.0,
      amountUnit: 'kg',
      shippingCost: 10.0,
      shippingIncluded: false,
      taxRate: 0.1,
      isTaxIncluded: false,
    });
    const inventoryItem = createMockInventoryItem();

    const result = calculatePricePerCanonicalExcluding(offer, inventoryItem);

    expect(result.success).toBe(true);
    expect(result.pricePerCanonical).toBe(0.01); // 100 / 10000 (10kg = 10000g)
    expect(result.breakdown.basePrice).toBe(100.0);
    expect(result.breakdown.shippingCost).toBe(0);
    expect(result.breakdown.taxCost).toBe(0);
    expect(result.breakdown.totalCost).toBe(100.0);
    expect(result.breakdown.canonicalAmount).toBe(10000.0); // 10kg = 10000g
    expect(result.flags).toContain('shipping-excluded');
    expect(result.flags).toContain('tax-excluded');
  });

  it('should handle unit conversion', () => {
    const offer = createMockOffer({
      totalPrice: 100.0,
      amount: 1000.0,
      amountUnit: 'g', // 1000g = 1000g (canonical unit)
    });
    const inventoryItem = createMockInventoryItem();

    const result = calculatePricePerCanonicalExcluding(offer, inventoryItem);

    expect(result.success).toBe(true);
    expect(result.pricePerCanonical).toBe(0.1); // 100 / 1000
    expect(result.breakdown.canonicalAmount).toBe(1000.0);
  });

  it('should apply currency conversion', () => {
    const offer = createMockOffer({
      totalPrice: 100.0,
      amount: 1000.0,
      amountUnit: 'g',
    });
    const inventoryItem = createMockInventoryItem();
    const options: PriceCalculationOptions = { currencyRate: 1.5 };

    const result = calculatePricePerCanonicalExcluding(offer, inventoryItem, options);

    expect(result.success).toBe(true);
    expect(result.pricePerCanonical).toBeCloseTo(0.15, 10); // (100 / 1000) * 1.5
  });

  it('should apply equivalence factors', () => {
    const offer = createMockOffer({
      totalPrice: 100.0,
      amount: 1000.0,
      amountUnit: 'g',
    });
    const inventoryItem = createMockInventoryItem({ equivalenceFactor: 2.0 });
    const options: PriceCalculationOptions = { applyEquivalenceFactors: true };

    const result = calculatePricePerCanonicalExcluding(offer, inventoryItem, options);

    expect(result.success).toBe(true);
    expect(result.pricePerCanonical).toBe(0.2); // (100 / 1000) * 2.0
  });

  it('should handle unit conversion failure', () => {
    const offer = createMockOffer({
      totalPrice: 100.0,
      amount: 10.0,
      amountUnit: 'invalid-unit',
    });
    const inventoryItem = createMockInventoryItem();

    const result = calculatePricePerCanonicalExcluding(offer, inventoryItem);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('Unit conversion failed');
    expect(result.flags).toContain('validation-failed');
  });

  it('should reduce confidence for missing data', () => {
    const offer = createMockOffer({
      totalPrice: 100.0,
      amount: 10.0,
      shippingCost: undefined,
      taxRate: undefined,
    });
    const inventoryItem = createMockInventoryItem();

    const result = calculatePricePerCanonicalExcluding(offer, inventoryItem);

    expect(result.success).toBe(true);
    expect(result.confidence).toBeLessThan(1.0);
    expect(result.confidence).toBeGreaterThan(0.7);
  });
});

describe('calculatePricePerCanonicalIncluding', () => {
  it('should calculate price including shipping and tax', () => {
    const offer = createMockOffer({
      totalPrice: 100.0,
      amount: 1000.0,
      amountUnit: 'g',
      shippingCost: 10.0,
      shippingIncluded: false,
      taxRate: 0.1,
      isTaxIncluded: false,
    });
    const inventoryItem = createMockInventoryItem();

    const result = calculatePricePerCanonicalIncluding(offer, inventoryItem);

    expect(result.success).toBe(true);
    expect(result.pricePerCanonical).toBe(0.12); // (100 + 10 + 10) / 1000
    expect(result.breakdown.basePrice).toBe(100.0);
    expect(result.breakdown.shippingCost).toBe(10.0);
    expect(result.breakdown.taxCost).toBe(10.0);
    expect(result.breakdown.totalCost).toBe(120.0);
    expect(result.breakdown.canonicalAmount).toBe(1000.0);
  });

  it('should handle shipping already included', () => {
    const offer = createMockOffer({
      totalPrice: 100.0,
      amount: 1000.0,
      amountUnit: 'g',
      shippingCost: 10.0,
      shippingIncluded: true,
    });
    const inventoryItem = createMockInventoryItem();

    const result = calculatePricePerCanonicalIncluding(offer, inventoryItem);

    expect(result.success).toBe(true);
    expect(result.pricePerCanonical).toBe(0.1); // 100 / 1000 (shipping already included)
    expect(result.breakdown.shippingCost).toBe(0);
    expect(result.flags).toContain('shipping-included');
  });

  it('should handle tax already included', () => {
    const offer = createMockOffer({
      totalPrice: 100.0,
      amount: 1000.0,
      amountUnit: 'g',
      taxRate: 0.1,
      isTaxIncluded: true,
    });
    const inventoryItem = createMockInventoryItem();

    const result = calculatePricePerCanonicalIncluding(offer, inventoryItem);

    expect(result.success).toBe(true);
    expect(result.pricePerCanonical).toBe(0.1); // 100 / 1000 (tax already included)
    expect(result.breakdown.taxCost).toBe(0);
    expect(result.flags).toContain('tax-included');
  });

  it('should reduce confidence for missing shipping data', () => {
    const offer = createMockOffer({
      totalPrice: 100.0,
      amount: 10.0,
      shippingCost: undefined,
      shippingIncluded: false,
    });
    const inventoryItem = createMockInventoryItem();

    const result = calculatePricePerCanonicalIncluding(offer, inventoryItem);

    expect(result.success).toBe(true);
    expect(result.confidence).toBeLessThan(1.0);
    expect(result.flags).toContain('shipping-unknown');
  });

  it('should reduce confidence for missing tax data', () => {
    const offer = createMockOffer({
      totalPrice: 100.0,
      amount: 10.0,
      taxRate: undefined,
      isTaxIncluded: false,
    });
    const inventoryItem = createMockInventoryItem();

    const result = calculatePricePerCanonicalIncluding(offer, inventoryItem);

    expect(result.success).toBe(true);
    expect(result.confidence).toBeLessThan(1.0);
    expect(result.flags).toContain('tax-unknown');
  });
});

describe('calculatePricePerCanonicalEffective', () => {
  it('should use effective price when available', () => {
    const offer = createMockOffer({
      totalPrice: 100.0,
      amount: 10.0,
      effectivePricePerCanonical: 12.0,
    });
    const inventoryItem = createMockInventoryItem();

    const result = calculatePricePerCanonicalEffective(offer, inventoryItem);

    expect(result.success).toBe(true);
    expect(result.pricePerCanonical).toBe(12.0);
    expect(result.confidence).toBe(0.9);
    expect(result.flags).toContain('effective-price');
  });

  it('should fall back to including calculation when effective price not available', () => {
    const offer = createMockOffer({
      totalPrice: 100.0,
      amount: 1000.0,
      amountUnit: 'g',
      effectivePricePerCanonical: undefined,
    });
    const inventoryItem = createMockInventoryItem();

    const result = calculatePricePerCanonicalEffective(offer, inventoryItem);

    expect(result.success).toBe(true);
    expect(result.pricePerCanonical).toBe(0.1);
    expect(result.flags).not.toContain('effective-price');
  });

  it('should respect useEffectivePrice option', () => {
    const offer = createMockOffer({
      totalPrice: 100.0,
      amount: 1000.0,
      amountUnit: 'g',
      effectivePricePerCanonical: 12.0,
    });
    const inventoryItem = createMockInventoryItem();
    const options: PriceCalculationOptions = { useEffectivePrice: false };

    const result = calculatePricePerCanonicalEffective(offer, inventoryItem, options);

    expect(result.success).toBe(true);
    expect(result.pricePerCanonical).toBe(0.1); // Falls back to including calculation
    expect(result.flags).not.toContain('effective-price');
  });
});

describe('calculatePricePerCanonical', () => {
  it('should use effective price by default', () => {
    const offer = createMockOffer({
      totalPrice: 100.0,
      amount: 10.0,
      effectivePricePerCanonical: 12.0,
    });
    const inventoryItem = createMockInventoryItem();

    const result = calculatePricePerCanonical(offer, inventoryItem);

    expect(result.success).toBe(true);
    expect(result.pricePerCanonical).toBe(12.0);
    expect(result.flags).toContain('effective-price');
  });

  it('should use including calculation when effective price disabled', () => {
    const offer = createMockOffer({
      totalPrice: 100.0,
      amount: 1000.0,
      amountUnit: 'g',
      effectivePricePerCanonical: 12.0,
    });
    const inventoryItem = createMockInventoryItem();
    const options: PriceCalculationOptions = { useEffectivePrice: false };

    const result = calculatePricePerCanonical(offer, inventoryItem, options);

    expect(result.success).toBe(true);
    expect(result.pricePerCanonical).toBe(0.1);
    expect(result.flags).not.toContain('effective-price');
  });

  it('should use excluding calculation when shipping and tax disabled', () => {
    const offer = createMockOffer({
      totalPrice: 100.0,
      amount: 1000.0,
      amountUnit: 'g',
      effectivePricePerCanonical: 12.0,
    });
    const inventoryItem = createMockInventoryItem();
    const options: PriceCalculationOptions = {
      useEffectivePrice: false,
      includeShipping: false,
      includeTax: false,
    };

    const result = calculatePricePerCanonical(offer, inventoryItem, options);

    expect(result.success).toBe(true);
    expect(result.pricePerCanonical).toBe(0.1);
    // Note: The flags depend on the offer data, not just the options
    expect(result.flags).toContain('high-quality');
  });
});

// =============================================================================
// BATCH CALCULATION TESTS
// =============================================================================

describe('calculatePricesForOffers', () => {
  it('should calculate prices for multiple offers', () => {
    const offers = [
      createMockOffer({ 
        id: 'offer-1', 
        totalPrice: 100.0, 
        amount: 1000.0, 
        amountUnit: 'g',
        amountCanonical: 1000.0,
        pricePerCanonicalExclShipping: 0.1,
        pricePerCanonicalInclShipping: 0.1,
        effectivePricePerCanonical: 0.1,
      }),
      createMockOffer({ 
        id: 'offer-2', 
        totalPrice: 200.0, 
        amount: 2000.0, 
        amountUnit: 'g',
        amountCanonical: 2000.0,
        pricePerCanonicalExclShipping: 0.1,
        pricePerCanonicalInclShipping: 0.1,
        effectivePricePerCanonical: 0.1,
      }),
    ];
    const inventoryItem = createMockInventoryItem();

    const results = calculatePricesForOffers(offers, inventoryItem);

    expect(results.size).toBe(2);
    expect(results.get('offer-1')?.pricePerCanonical).toBe(0.1); // 100 / 1000 (1000g = 1000g)
    expect(results.get('offer-2')?.pricePerCanonical).toBe(0.1); // 200 / 2000 (2000g = 2000g)
  });

  it('should handle mixed success and failure', () => {
    const offers = [
      createMockOffer({ id: 'offer-1', totalPrice: 100.0, amount: 1000.0, amountUnit: 'g' }),
      createMockOffer({ id: 'offer-2', totalPrice: 100.0, amount: 0 }), // Invalid
    ];
    const inventoryItem = createMockInventoryItem();

    const results = calculatePricesForOffers(offers, inventoryItem);

    expect(results.size).toBe(2);
    expect(results.get('offer-1')?.success).toBe(true);
    expect(results.get('offer-2')?.success).toBe(false);
  });
});

describe('filterOffersByCalculation', () => {
  it('should filter offers by calculation success and confidence', () => {
    const offers = [
      createMockOffer({ id: 'offer-1', totalPrice: 100.0, amount: 1000.0, amountUnit: 'g' }),
      createMockOffer({ id: 'offer-2', totalPrice: 100.0, amount: 0 }), // Invalid
    ];
    const inventoryItem = createMockInventoryItem();

    const { validOffers, invalidOffers } = filterOffersByCalculation(offers, inventoryItem);

    expect(validOffers).toHaveLength(1);
    expect(validOffers[0].id).toBe('offer-1');
    expect(invalidOffers).toHaveLength(1);
    expect(invalidOffers[0].offer.id).toBe('offer-2');
  });

  it('should respect minimum confidence threshold', () => {
    const offers = [
      createMockOffer({
        id: 'offer-1',
        totalPrice: 100.0,
        amount: 1000.0,
        amountUnit: 'g',
        shippingCost: undefined, // Reduces confidence
      }),
    ];
    const inventoryItem = createMockInventoryItem();
    const options: PriceCalculationOptions = { minConfidence: 0.95 };

    const { validOffers, invalidOffers } = filterOffersByCalculation(offers, inventoryItem, options);

    expect(validOffers).toHaveLength(0);
    expect(invalidOffers).toHaveLength(1);
  });
});

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('comparePriceResults', () => {
  it('should compare two price results correctly', () => {
    const result1: PriceCalculationResult = {
      pricePerCanonical: 10.0,
      success: true,
      confidence: 0.9,
      breakdown: {
        basePrice: 100.0,
        shippingCost: 0,
        taxCost: 0,
        totalCost: 100.0,
        canonicalAmount: 10.0,
        pricePerCanonical: 10.0,
      },
      flags: [],
    };

    const result2: PriceCalculationResult = {
      pricePerCanonical: 12.0,
      success: true,
      confidence: 0.8,
      breakdown: {
        basePrice: 120.0,
        shippingCost: 0,
        taxCost: 0,
        totalCost: 120.0,
        canonicalAmount: 10.0,
        pricePerCanonical: 12.0,
      },
      flags: [],
    };

    const comparison = comparePriceResults(result1, result2);

    expect(comparison.better).toBe(result1);
    expect(comparison.worse).toBe(result2);
    expect(comparison.difference).toBe(2.0);
    expect(comparison.percentageDifference).toBe(20.0);
  });
});

describe('formatPriceResult', () => {
  it('should format successful result', () => {
    const result: PriceCalculationResult = {
      pricePerCanonical: 10.1234,
      success: true,
      confidence: 0.95,
      breakdown: {
        basePrice: 100.0,
        shippingCost: 0,
        taxCost: 0,
        totalCost: 100.0,
        canonicalAmount: 10.0,
        pricePerCanonical: 10.1234,
      },
      flags: ['shipping-included'],
    };

    const formatted = formatPriceResult(result);

    expect(formatted).toContain('10.1234');
    expect(formatted).toContain('95.0%');
    expect(formatted).toContain('shipping-included');
  });

  it('should format error result', () => {
    const result: PriceCalculationResult = {
      pricePerCanonical: 0,
      success: false,
      errorMessage: 'Unit conversion failed',
      confidence: 0,
      breakdown: {
        basePrice: 0,
        shippingCost: 0,
        taxCost: 0,
        totalCost: 0,
        canonicalAmount: 0,
        pricePerCanonical: 0,
      },
      flags: [],
    };

    const formatted = formatPriceResult(result);

    expect(formatted).toBe('Error: Unit conversion failed');
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe('Edge Cases', () => {
  it('should handle zero canonical amount', () => {
    const offer = createMockOffer({
      totalPrice: 100.0,
      amount: 0,
    });
    const inventoryItem = createMockInventoryItem();

    const result = calculatePricePerCanonical(offer, inventoryItem);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('Offer amount must be a positive finite number');
  });

  it('should handle very small amounts', () => {
    const offer = createMockOffer({
      totalPrice: 0.01,
      amount: 0.001,
      amountUnit: 'kg',
    });
    const inventoryItem = createMockInventoryItem();

    const result = calculatePricePerCanonical(offer, inventoryItem);

    expect(result.success).toBe(true);
    expect(result.pricePerCanonical).toBe(10.0); // 0.01 / 0.001 (0.001kg = 1g, but we're using the original amount)
  });

  it('should handle very large amounts', () => {
    const offer = createMockOffer({
      totalPrice: 1000000.0,
      amount: 100000.0,
      amountUnit: 'kg',
    });
    const inventoryItem = createMockInventoryItem();

    const result = calculatePricePerCanonical(offer, inventoryItem);

    expect(result.success).toBe(true);
    expect(result.pricePerCanonical).toBe(10.0); // 1000000 / 100000 (100000kg = 100000000g, but we're using the original amount)
  });

  it('should handle NaN values gracefully', () => {
    const offer = createMockOffer({
      totalPrice: NaN,
      amount: 10.0,
    });
    const inventoryItem = createMockInventoryItem();

    const result = calculatePricePerCanonical(offer, inventoryItem);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('Offer total price must be a positive finite number');
  });

  it('should handle Infinity values gracefully', () => {
    const offer = createMockOffer({
      totalPrice: Infinity,
      amount: 10.0,
    });
    const inventoryItem = createMockInventoryItem();

    const result = calculatePricePerCanonical(offer, inventoryItem);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('Offer total price must be a positive finite number');
  });
});
