/**
 * Unit Tests for Comparison Engine Utilities
 *
 * Tests utility functions for formatting, filtering, grouping, and
 * statistical analysis of comparison results.
 */

import {
  formatComparisonResults,
  calculatePriceDifference,
  filterComparisonResults,
  groupResultsBySupplier,
  calculateComparisonStatistics,
  validateComparisonConfig,
  createSimpleConfig,
  mergeComparisonConfigs,
  getStrategyDescription,
  isStrategySuitable,
} from '../utils';
import { ComparisonResult, ItemComparisonResults, ComparisonConfig } from '../types';
import { Offer, InventoryItem } from '../../types';

// Mock data
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

const createMockComparisonResult = (overrides: Partial<ComparisonResult> = {}): ComparisonResult => ({
  offer: createMockOffer(),
  score: 10.0,
  metadata: {
    flags: [],
    explanation: 'Test explanation',
    confidence: 0.9,
  },
  ...overrides,
});

describe('formatComparisonResults', () => {
  it('should format comparison results correctly', () => {
    const inventoryItem = createMockInventoryItem();
    const results = [
      createMockComparisonResult({
        offer: createMockOffer({ id: 'offer-1', supplierNameSnapshot: 'Supplier A' }),
        score: 8.0,
        metadata: { flags: ['best-price'], explanation: 'Best price', confidence: 0.95 },
      }),
      createMockComparisonResult({
        offer: createMockOffer({ id: 'offer-2', supplierNameSnapshot: 'Supplier B' }),
        score: 12.0,
        metadata: { flags: ['high-quality'], explanation: 'High quality', confidence: 0.8 },
      }),
    ];

    const itemResults: ItemComparisonResults = {
      inventoryItem,
      results,
      bestOffer: results[0],
      config: { primaryStrategy: 'pricePerCanonical' },
      metadata: {
        totalOffers: 2,
        excludedOffers: 0,
        executionTimeMs: 150,
        strategyUsed: 'pricePerCanonical',
        comparedAt: new Date().toISOString(),
      },
    };

    const formatted = formatComparisonResults(itemResults);

    expect(formatted).toContain('Comparison Results for Test Item');
    expect(formatted).toContain('Strategy: pricePerCanonical');
    expect(formatted).toContain('Total Offers: 2');
    expect(formatted).toContain('Execution Time: 150ms');
    expect(formatted).toContain('Best Offer:');
    expect(formatted).toContain('Supplier: Supplier A');
    expect(formatted).toContain('Price: USD 8.0000');
    expect(formatted).toContain('Confidence: 95.0%');
    expect(formatted).toContain('All Offers (sorted by score):');
    expect(formatted).toContain('1. Supplier A: USD 8.0000 (flags: best-price)');
    expect(formatted).toContain('2. Supplier B: USD 12.0000 (flags: high-quality)');
  });

  it('should handle empty results', () => {
    const inventoryItem = createMockInventoryItem();
    const itemResults: ItemComparisonResults = {
      inventoryItem,
      results: [],
      bestOffer: null,
      config: { primaryStrategy: 'pricePerCanonical' },
      metadata: {
        totalOffers: 0,
        excludedOffers: 0,
        executionTimeMs: 50,
        strategyUsed: 'pricePerCanonical',
        comparedAt: new Date().toISOString(),
      },
    };

    const formatted = formatComparisonResults(itemResults);

    expect(formatted).toContain('Comparison Results for Test Item');
    expect(formatted).toContain('Total Offers: 0');
    expect(formatted).not.toContain('Best Offer:');
    expect(formatted).toContain('All Offers (sorted by score):');
  });

  it('should handle missing supplier names', () => {
    const inventoryItem = createMockInventoryItem();
    const results = [
      createMockComparisonResult({
        offer: createMockOffer({ supplierNameSnapshot: undefined }),
        score: 10.0,
      }),
    ];

    const itemResults: ItemComparisonResults = {
      inventoryItem,
      results,
      bestOffer: results[0],
      config: { primaryStrategy: 'pricePerCanonical' },
      metadata: {
        totalOffers: 1,
        excludedOffers: 0,
        executionTimeMs: 100,
        strategyUsed: 'pricePerCanonical',
        comparedAt: new Date().toISOString(),
      },
    };

    const formatted = formatComparisonResults(itemResults);

    expect(formatted).toContain('Supplier: Unknown');
    expect(formatted).toContain('1. Unknown: USD 10.0000');
  });
});

describe('calculatePriceDifference', () => {
  it('should calculate price difference correctly', () => {
    const result1 = createMockComparisonResult({ score: 10.0 });
    const result2 = createMockComparisonResult({ score: 12.0 });

    const difference = calculatePriceDifference(result1, result2);

    expect(difference.absolute).toBe(2.0);
    expect(difference.percentage).toBe(20.0); // (12 - 10) / 10 * 100
    expect(difference.cheaper).toBe(result1);
    expect(difference.moreExpensive).toBe(result2);
  });

  it('should handle equal prices', () => {
    const result1 = createMockComparisonResult({ score: 10.0 });
    const result2 = createMockComparisonResult({ score: 10.0 });

    const difference = calculatePriceDifference(result1, result2);

    expect(difference.absolute).toBe(0.0);
    expect(difference.percentage).toBe(0.0);
  });

  it('should handle zero price', () => {
    const result1 = createMockComparisonResult({ score: 0.0 });
    const result2 = createMockComparisonResult({ score: 5.0 });

    const difference = calculatePriceDifference(result1, result2);

    expect(difference.absolute).toBe(5.0);
    expect(difference.percentage).toBe(Infinity); // 5 / 0 = Infinity
  });
});

describe('filterComparisonResults', () => {
  const results = [
    createMockComparisonResult({
      offer: createMockOffer({ id: 'offer-1', supplierId: 'supplier-1', qualityRating: 5 }),
      score: 8.0,
      metadata: { confidence: 0.9, flags: ['best-price'] },
    }),
    createMockComparisonResult({
      offer: createMockOffer({ id: 'offer-2', supplierId: 'supplier-2', qualityRating: 3 }),
      score: 12.0,
      metadata: { confidence: 0.7, flags: ['high-quality'] },
    }),
    createMockComparisonResult({
      offer: createMockOffer({ id: 'offer-3', supplierId: 'supplier-1', qualityRating: 2 }),
      score: 15.0,
      metadata: { confidence: 0.6, flags: ['low-quality'] },
    }),
  ];

  it('should filter by minimum confidence', () => {
    const filtered = filterComparisonResults(results, { minConfidence: 0.8 });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].offer.id).toBe('offer-1');
  });

  it('should filter by maximum price', () => {
    const filtered = filterComparisonResults(results, { maxPrice: 10.0 });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].offer.id).toBe('offer-1');
  });

  it('should filter by minimum quality rating', () => {
    const filtered = filterComparisonResults(results, { minQualityRating: 4 });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].offer.id).toBe('offer-1');
  });

  it('should filter by included flags', () => {
    const filtered = filterComparisonResults(results, { includeFlags: ['best-price'] });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].offer.id).toBe('offer-1');
  });

  it('should filter by excluded flags', () => {
    const filtered = filterComparisonResults(results, { excludeFlags: ['low-quality'] });

    expect(filtered).toHaveLength(2);
    expect(filtered.every(r => !r.metadata?.flags?.includes('low-quality'))).toBe(true);
  });

  it('should filter by suppliers', () => {
    const filtered = filterComparisonResults(results, { suppliers: ['supplier-1'] });

    expect(filtered).toHaveLength(2);
    expect(filtered.every(r => r.offer.supplierId === 'supplier-1')).toBe(true);
  });

  it('should apply multiple filters', () => {
    const filtered = filterComparisonResults(results, {
      minConfidence: 0.7,
      maxPrice: 15.0,
      suppliers: ['supplier-1'],
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].offer.id).toBe('offer-1');
  });

  it('should return all results when no filters match', () => {
    const filtered = filterComparisonResults(results, { minConfidence: 0.5 });

    expect(filtered).toHaveLength(3);
  });
});

describe('groupResultsBySupplier', () => {
  it('should group results by supplier', () => {
    const results = [
      createMockComparisonResult({
        offer: createMockOffer({ id: 'offer-1', supplierId: 'supplier-1' }),
      }),
      createMockComparisonResult({
        offer: createMockOffer({ id: 'offer-2', supplierId: 'supplier-2' }),
      }),
      createMockComparisonResult({
        offer: createMockOffer({ id: 'offer-3', supplierId: 'supplier-1' }),
      }),
    ];

    const grouped = groupResultsBySupplier(results);

    expect(grouped.size).toBe(2);
    expect(grouped.get('supplier-1')).toHaveLength(2);
    expect(grouped.get('supplier-2')).toHaveLength(1);
    expect(grouped.get('supplier-1')?.[0].offer.id).toBe('offer-1');
    expect(grouped.get('supplier-1')?.[1].offer.id).toBe('offer-3');
  });

  it('should handle empty results', () => {
    const grouped = groupResultsBySupplier([]);

    expect(grouped.size).toBe(0);
  });

  it('should handle single supplier', () => {
    const results = [
      createMockComparisonResult({
        offer: createMockOffer({ supplierId: 'supplier-1' }),
      }),
    ];

    const grouped = groupResultsBySupplier(results);

    expect(grouped.size).toBe(1);
    expect(grouped.get('supplier-1')).toHaveLength(1);
  });
});

describe('calculateComparisonStatistics', () => {
  it('should calculate statistics correctly', () => {
    const results = [
      createMockComparisonResult({ score: 8.0, metadata: { confidence: 0.9 } }),
      createMockComparisonResult({ score: 10.0, metadata: { confidence: 0.8 } }),
      createMockComparisonResult({ score: 12.0, metadata: { confidence: 0.7 } }),
      createMockComparisonResult({ score: 14.0, metadata: { confidence: 0.6 } }),
    ];

    const stats = calculateComparisonStatistics(results);

    expect(stats.count).toBe(4);
    expect(stats.averageScore).toBe(11.0);
    expect(stats.medianScore).toBe(11.0); // (10 + 12) / 2
    expect(stats.minScore).toBe(8.0);
    expect(stats.maxScore).toBe(14.0);
    expect(stats.priceRange).toBe(6.0);
    expect(stats.averageConfidence).toBeCloseTo(0.75, 2);
    expect(stats.standardDeviation).toBeCloseTo(2.24, 2);
  });

  it('should handle empty results', () => {
    const stats = calculateComparisonStatistics([]);

    expect(stats.count).toBe(0);
    expect(stats.averageScore).toBe(0);
    expect(stats.medianScore).toBe(0);
    expect(stats.minScore).toBe(0);
    expect(stats.maxScore).toBe(0);
    expect(stats.priceRange).toBe(0);
    expect(stats.averageConfidence).toBe(0);
    expect(stats.standardDeviation).toBe(0);
  });

  it('should handle single result', () => {
    const results = [
      createMockComparisonResult({ score: 10.0, metadata: { confidence: 0.8 } }),
    ];

    const stats = calculateComparisonStatistics(results);

    expect(stats.count).toBe(1);
    expect(stats.averageScore).toBe(10.0);
    expect(stats.medianScore).toBe(10.0);
    expect(stats.minScore).toBe(10.0);
    expect(stats.maxScore).toBe(10.0);
    expect(stats.priceRange).toBe(0);
    expect(stats.averageConfidence).toBe(0.8);
    expect(stats.standardDeviation).toBe(0);
  });

  it('should handle missing confidence values', () => {
    const results = [
      createMockComparisonResult({ score: 10.0, metadata: { confidence: 0.8 } }),
      createMockComparisonResult({ score: 12.0, metadata: {} }), // No confidence
    ];

    const stats = calculateComparisonStatistics(results);

    expect(stats.averageConfidence).toBe(0.4); // (0.8 + 0) / 2
  });
});

describe('validateComparisonConfig', () => {
  it('should validate correct configuration', () => {
    const config: ComparisonConfig = {
      primaryStrategy: 'pricePerCanonical',
      strategyOptions: { includeShipping: true },
      globalOptions: { maxResults: 50, minConfidence: 0.5 },
    };

    const result = validateComparisonConfig(config);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('should reject missing primary strategy', () => {
    const config: ComparisonConfig = {
      primaryStrategy: '',
      strategyOptions: {},
    };

    const result = validateComparisonConfig(config);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Primary strategy is required');
  });

  it('should reject invalid maxResults', () => {
    const config: ComparisonConfig = {
      primaryStrategy: 'pricePerCanonical',
      globalOptions: { maxResults: 0 },
    };

    const result = validateComparisonConfig(config);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('maxResults must be at least 1');
  });

  it('should reject invalid minConfidence', () => {
    const config: ComparisonConfig = {
      primaryStrategy: 'pricePerCanonical',
      globalOptions: { minConfidence: 1.5 },
    };

    const result = validateComparisonConfig(config);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('minConfidence must be between 0 and 1');
  });

  it('should warn about excessive secondary strategy weights', () => {
    const config: ComparisonConfig = {
      primaryStrategy: 'pricePerCanonical',
      secondaryStrategies: [
        { strategy: 'totalPrice', weight: 0.6 },
        { strategy: 'qualityAdjustedPrice', weight: 0.5 },
      ],
    };

    const result = validateComparisonConfig(config);

    expect(result.isValid).toBe(true);
    expect(result.warnings).toContain('Total weight of secondary strategies exceeds 1.0');
  });
});

describe('createSimpleConfig', () => {
  it('should create simple configuration', () => {
    const config = createSimpleConfig('pricePerCanonical');

    expect(config.primaryStrategy).toBe('pricePerCanonical');
    expect(config.globalOptions).toBeDefined();
    expect(config.globalOptions?.maxResults).toBe(50);
    expect(config.globalOptions?.minConfidence).toBe(0.5);
    expect(config.globalOptions?.sortDirection).toBe('asc');
  });
});

describe('mergeComparisonConfigs', () => {
  it('should merge configurations correctly', () => {
    const base: ComparisonConfig = {
      primaryStrategy: 'pricePerCanonical',
      strategyOptions: { includeShipping: true },
      globalOptions: { maxResults: 50 },
    };

    const overrides: Partial<ComparisonConfig> = {
      primaryStrategy: 'totalPrice',
      strategyOptions: { includeTax: false },
      globalOptions: { minConfidence: 0.8 },
    };

    const merged = mergeComparisonConfigs(base, overrides);

    expect(merged.primaryStrategy).toBe('totalPrice');
    expect(merged.strategyOptions).toEqual({
      includeShipping: true,
      includeTax: false,
    });
    expect(merged.globalOptions).toEqual({
      maxResults: 50,
      minConfidence: 0.8,
    });
  });

  it('should handle undefined overrides', () => {
    const base: ComparisonConfig = {
      primaryStrategy: 'pricePerCanonical',
      strategyOptions: { includeShipping: true },
    };

    const merged = mergeComparisonConfigs(base, {});

    expect(merged).toEqual(base);
  });
});

describe('getStrategyDescription', () => {
  it('should return correct descriptions for known strategies', () => {
    expect(getStrategyDescription('pricePerCanonical')).toContain('canonical unit');
    expect(getStrategyDescription('totalPrice')).toContain('total price');
    expect(getStrategyDescription('pricePerUnit')).toContain('display unit');
    expect(getStrategyDescription('qualityAdjustedPrice')).toContain('quality rating');
  });

  it('should return unknown for unknown strategy', () => {
    expect(getStrategyDescription('unknownStrategy')).toBe('Unknown strategy');
  });
});

describe('isStrategySuitable', () => {
  it('should return correct suitability for price use case', () => {
    expect(isStrategySuitable('pricePerCanonical', 'price')).toBe(true);
    expect(isStrategySuitable('totalPrice', 'price')).toBe(true);
    expect(isStrategySuitable('pricePerUnit', 'price')).toBe(true);
    expect(isStrategySuitable('qualityAdjustedPrice', 'price')).toBe(true);
    expect(isStrategySuitable('recentPrice', 'price')).toBe(false);
  });

  it('should return correct suitability for quality use case', () => {
    expect(isStrategySuitable('qualityAdjustedPrice', 'quality')).toBe(true);
    expect(isStrategySuitable('pricePerCanonical', 'quality')).toBe(false);
  });

  it('should return correct suitability for bulk use case', () => {
    expect(isStrategySuitable('pricePerCanonical', 'bulk')).toBe(true);
    expect(isStrategySuitable('totalPrice', 'bulk')).toBe(false);
  });

  it('should return false for unknown strategy', () => {
    expect(isStrategySuitable('unknownStrategy', 'price')).toBe(false);
  });

  it('should return false for unknown use case', () => {
    expect(isStrategySuitable('pricePerCanonical', 'unknown' as any)).toBe(false);
  });
});
