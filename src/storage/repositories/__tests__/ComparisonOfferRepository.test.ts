/**
 * Unit Tests for Comparison Offer Repository
 *
 * Tests the extended offer repository with comparison engine capabilities,
 * including SQLite queries for sorting and filtering.
 */

import { ComparisonOfferRepository } from '../ComparisonOfferRepository';
import { ComparisonConfig } from '../../comparison/types';
import { executeSql } from '../../sqlite/database';

// Mock the database module
jest.mock('../../sqlite/database', () => ({
  executeSql: jest.fn(),
}));

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;

describe('ComparisonOfferRepository', () => {
  let repository: ComparisonOfferRepository;

  beforeEach(() => {
    repository = new ComparisonOfferRepository();
    jest.clearAllMocks();
  });

  describe('findOffersByComparison', () => {
    it('should find offers by comparison criteria', async () => {
      const mockOffers = [
        {
          id: '1',
          inventory_item_id: 'item1',
          supplier_id: 'supplier1',
          total_price: 10.0,
          effective_price_per_canonical: 5.0,
          amount: 2,
          amount_unit: 'kg',
          amount_canonical: 2,
          currency: 'USD',
          observed_at: '2024-01-01T00:00:00Z',
          captured_at: '2024-01-01T00:00:00Z',
          source_type: 'manual',
          is_tax_included: true,
          shipping_included: false,
          price_per_canonical_excl_shipping: 4.5,
          price_per_canonical_incl_shipping: 5.0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockExecuteSql.mockResolvedValue({
        rows: {
          length: 1,
          item: (index: number) => mockOffers[index],
        },
      } as any);

      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const result = await repository.findOffersByComparison({
        config,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe('1');
      expect(result.metadata.totalCount).toBe(1);
      expect(result.metadata.returnedCount).toBe(1);
      expect(result.metadata.executionTimeMs).toBeGreaterThan(0);
    });

    it('should handle database errors', async () => {
      mockExecuteSql.mockRejectedValue(new Error('Database error'));

      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      await expect(
        repository.findOffersByComparison({
          config,
        })
      ).rejects.toThrow('Failed to find offers by comparison criteria');
    });
  });

  describe('findBestOffersByComparison', () => {
    it('should find best offers by comparison criteria', async () => {
      const mockOffers = [
        {
          id: '1',
          inventory_item_id: 'item1',
          supplier_id: 'supplier1',
          total_price: 10.0,
          effective_price_per_canonical: 5.0,
          amount: 2,
          amount_unit: 'kg',
          amount_canonical: 2,
          currency: 'USD',
          observed_at: '2024-01-01T00:00:00Z',
          captured_at: '2024-01-01T00:00:00Z',
          source_type: 'manual',
          is_tax_included: true,
          shipping_included: false,
          price_per_canonical_excl_shipping: 4.5,
          price_per_canonical_incl_shipping: 5.0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockExecuteSql.mockResolvedValue({
        rows: {
          length: 1,
          item: (index: number) => mockOffers[index],
        },
      } as any);

      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const result = await repository.findBestOffersByComparison({
        config,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe('1');
      expect(result.metadata.totalCount).toBe(1);
    });
  });

  describe('findInventoryItemsWithBestOffers', () => {
    it('should find inventory items with best offers', async () => {
      const mockItems = [
        {
          id: 'item1',
          name: 'Test Item',
          canonical_dimension: 'mass',
          canonical_unit: 'kg',
          best_offer_id: '1',
          best_offer_price: 10.0,
          best_offer_price_per_canonical: 5.0,
          best_offer_currency: 'USD',
          best_offer_observed_at: '2024-01-01T00:00:00Z',
          best_offer_supplier_name: 'Test Supplier',
          best_offer_supplier_country: 'US',
        },
      ];

      mockExecuteSql.mockResolvedValue({
        rows: {
          length: 1,
          item: (index: number) => mockItems[index],
        },
      } as any);

      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const result = await repository.findInventoryItemsWithBestOffers({
        config,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe('item1');
      expect(result.results[0].name).toBe('Test Item');
    });
  });

  describe('getPriceTrend', () => {
    it('should get price trend data for an inventory item', async () => {
      const mockTrendData = [
        {
          date: '2024-01-01',
          min_price: 10.0,
          max_price: 20.0,
          avg_price: 15.0,
          offer_count: 5,
          min_total_price: 20.0,
          max_total_price: 40.0,
          avg_total_price: 30.0,
        },
      ];

      mockExecuteSql.mockResolvedValue({
        rows: {
          length: 1,
          item: (index: number) => mockTrendData[index],
        },
      } as any);

      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const result = await repository.getPriceTrend('item1', {
        config,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].date).toBe('2024-01-01');
      expect(result.results[0].min_price).toBe(10.0);
      expect(result.results[0].max_price).toBe(20.0);
      expect(result.results[0].avg_price).toBe(15.0);
    });
  });

  describe('findByInventoryItemWithComparison', () => {
    it('should find offers for inventory item with comparison criteria', async () => {
      const mockOffers = [
        {
          id: '1',
          inventory_item_id: 'item1',
          supplier_id: 'supplier1',
          total_price: 10.0,
          effective_price_per_canonical: 5.0,
          amount: 2,
          amount_unit: 'kg',
          amount_canonical: 2,
          currency: 'USD',
          observed_at: '2024-01-01T00:00:00Z',
          captured_at: '2024-01-01T00:00:00Z',
          source_type: 'manual',
          is_tax_included: true,
          shipping_included: false,
          price_per_canonical_excl_shipping: 4.5,
          price_per_canonical_incl_shipping: 5.0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockExecuteSql.mockResolvedValue({
        rows: {
          length: 1,
          item: (index: number) => mockOffers[index],
        },
      } as any);

      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const result = await repository.findByInventoryItemWithComparison('item1', config, {
        limit: 10,
        offset: 0,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].inventory_item_id).toBe('item1');
    });
  });

  describe('findBestOfferForItemWithComparison', () => {
    it('should find best offer for item with comparison criteria', async () => {
      const mockOffers = [
        {
          id: '1',
          inventory_item_id: 'item1',
          supplier_id: 'supplier1',
          total_price: 10.0,
          effective_price_per_canonical: 5.0,
          amount: 2,
          amount_unit: 'kg',
          amount_canonical: 2,
          currency: 'USD',
          observed_at: '2024-01-01T00:00:00Z',
          captured_at: '2024-01-01T00:00:00Z',
          source_type: 'manual',
          is_tax_included: true,
          shipping_included: false,
          price_per_canonical_excl_shipping: 4.5,
          price_per_canonical_incl_shipping: 5.0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockExecuteSql.mockResolvedValue({
        rows: {
          length: 1,
          item: (index: number) => mockOffers[index],
        },
      } as any);

      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const result = await repository.findBestOfferForItemWithComparison('item1', config);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('1');
      expect(result?.inventory_item_id).toBe('item1');
    });

    it('should return null when no offers found', async () => {
      mockExecuteSql.mockResolvedValue({
        rows: {
          length: 0,
          item: () => null,
        },
      } as any);

      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const result = await repository.findBestOfferForItemWithComparison('item1', config);

      expect(result).toBeNull();
    });
  });

  describe('getPriceStatistics', () => {
    it('should get price statistics for an inventory item', async () => {
      const mockStats = {
        min_price: 10.0,
        max_price: 20.0,
        avg_price: 15.0,
        offer_count: 5,
      };

      mockExecuteSql
        .mockResolvedValueOnce({
          rows: {
            length: 1,
            item: () => mockStats,
          },
        } as any)
        .mockResolvedValueOnce({
          rows: {
            length: 1,
            item: () => ({ effective_price_per_canonical: 15.0 }),
          },
        } as any);

      const result = await repository.getPriceStatistics('item1');

      expect(result.minPrice).toBe(10.0);
      expect(result.maxPrice).toBe(20.0);
      expect(result.avgPrice).toBe(15.0);
      expect(result.offerCount).toBe(5);
      expect(result.priceRange).toBe(10.0);
      expect(result.medianPrice).toBe(15.0);
    });

    it('should return zero values when no data found', async () => {
      mockExecuteSql.mockResolvedValue({
        rows: {
          length: 0,
          item: () => null,
        },
      } as any);

      const result = await repository.getPriceStatistics('item1');

      expect(result.minPrice).toBe(0);
      expect(result.maxPrice).toBe(0);
      expect(result.avgPrice).toBe(0);
      expect(result.offerCount).toBe(0);
      expect(result.priceRange).toBe(0);
      expect(result.medianPrice).toBe(0);
    });

    it('should handle date range filter', async () => {
      const mockStats = {
        min_price: 10.0,
        max_price: 20.0,
        avg_price: 15.0,
        offer_count: 3,
      };

      mockExecuteSql
        .mockResolvedValueOnce({
          rows: {
            length: 1,
            item: () => mockStats,
          },
        } as any)
        .mockResolvedValueOnce({
          rows: {
            length: 1,
            item: () => ({ effective_price_per_canonical: 15.0 }),
          },
        } as any);

      const result = await repository.getPriceStatistics('item1', {
        dateRange: {
          start: '2024-01-01',
          end: '2024-12-31',
        },
      });

      expect(result.offerCount).toBe(3);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('o.observed_at >= ?'),
        expect.arrayContaining(['item1', '2024-01-01', '2024-12-31'])
      );
    });
  });

  describe('getSupplierPerformanceStats', () => {
    it('should get supplier performance statistics', async () => {
      const mockStats = {
        total_offers: 10,
        avg_price: 15.0,
        min_price: 10.0,
        max_price: 20.0,
        avg_quality_rating: 4.0,
      };

      const mockBestOffers = {
        best_offer_count: 3,
      };

      mockExecuteSql
        .mockResolvedValueOnce({
          rows: {
            length: 1,
            item: () => mockStats,
          },
        } as any)
        .mockResolvedValueOnce({
          rows: {
            length: 1,
            item: () => mockBestOffers,
          },
        } as any);

      const result = await repository.getSupplierPerformanceStats('supplier1');

      expect(result.totalOffers).toBe(10);
      expect(result.avgPrice).toBe(15.0);
      expect(result.minPrice).toBe(10.0);
      expect(result.maxPrice).toBe(20.0);
      expect(result.bestOfferCount).toBe(3);
      expect(result.avgQualityRating).toBe(4.0);
    });

    it('should return zero values when no data found', async () => {
      mockExecuteSql.mockResolvedValue({
        rows: {
          length: 0,
          item: () => null,
        },
      } as any);

      const result = await repository.getSupplierPerformanceStats('supplier1');

      expect(result.totalOffers).toBe(0);
      expect(result.avgPrice).toBe(0);
      expect(result.minPrice).toBe(0);
      expect(result.maxPrice).toBe(0);
      expect(result.bestOfferCount).toBe(0);
      expect(result.avgQualityRating).toBe(0);
    });

    it('should handle date range filter', async () => {
      const mockStats = {
        total_offers: 5,
        avg_price: 15.0,
        min_price: 10.0,
        max_price: 20.0,
        avg_quality_rating: 4.0,
      };

      const mockBestOffers = {
        best_offer_count: 2,
      };

      mockExecuteSql
        .mockResolvedValueOnce({
          rows: {
            length: 1,
            item: () => mockStats,
          },
        } as any)
        .mockResolvedValueOnce({
          rows: {
            length: 1,
            item: () => mockBestOffers,
          },
        } as any);

      const result = await repository.getSupplierPerformanceStats('supplier1', {
        dateRange: {
          start: '2024-01-01',
          end: '2024-12-31',
        },
      });

      expect(result.totalOffers).toBe(5);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('o.observed_at >= ?'),
        expect.arrayContaining(['supplier1', '2024-01-01', '2024-12-31'])
      );
    });
  });
});
