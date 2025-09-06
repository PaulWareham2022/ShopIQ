/**
 * Unit Tests for Comparison Query Builder
 *
 * Tests the SQLite query building functionality for the comparison engine,
 * including sorting, filtering, and dynamic query generation.
 */

import { ComparisonQueryBuilder, ComparisonQueryExecutor, QueryOptions } from '../queryBuilder';
import { ComparisonConfig } from '../types';

describe('ComparisonQueryBuilder', () => {
  let queryBuilder: ComparisonQueryBuilder;

  beforeEach(() => {
    queryBuilder = new ComparisonQueryBuilder();
  });

  describe('buildOffersQuery', () => {
    it('should build basic offers query with price per canonical sorting', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
        strategyOptions: {
          includeShipping: true,
          includeTax: true,
        },
      };

      const options: QueryOptions = {
        config,
      };

      const { query, parameters } = queryBuilder.buildOffersQuery(options);

      expect(query).toContain('SELECT');
      expect(query).toContain('FROM offers o');
      expect(query).toContain('INNER JOIN inventory_items i');
      expect(query).toContain('INNER JOIN suppliers s');
      expect(query).toContain('WHERE o.deleted_at IS NULL');
      expect(query).toContain('ORDER BY o.effective_price_per_canonical ASC');
      expect(parameters).toEqual([]);
    });

    it('should build query with inventory item filter', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
        filters: {
          inventoryItemIds: ['item1', 'item2'],
        },
      };

      const { query, parameters } = queryBuilder.buildOffersQuery(options);

      expect(query).toContain('o.inventory_item_id IN (?, ?)');
      expect(parameters).toEqual(['item1', 'item2']);
    });

    it('should build query with supplier filter', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
        filters: {
          supplierIds: ['supplier1'],
        },
      };

      const { query, parameters } = queryBuilder.buildOffersQuery(options);

      expect(query).toContain('o.supplier_id IN (?)');
      expect(parameters).toEqual(['supplier1']);
    });

    it('should build query with date range filter', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
        filters: {
          dateRange: {
            start: '2024-01-01',
            end: '2024-12-31',
          },
        },
      };

      const { query, parameters } = queryBuilder.buildOffersQuery(options);

      expect(query).toContain('o.observed_at >= ?');
      expect(query).toContain('o.observed_at <= ?');
      expect(parameters).toEqual(['2024-01-01', '2024-12-31']);
    });

    it('should build query with price range filter', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
        filters: {
          priceRange: {
            min: 10.0,
            max: 100.0,
          },
        },
      };

      const { query, parameters } = queryBuilder.buildOffersQuery(options);

      expect(query).toContain('o.effective_price_per_canonical >= ?');
      expect(query).toContain('o.effective_price_per_canonical <= ?');
      expect(parameters).toEqual([10.0, 100.0]);
    });

    it('should build query with quality range filter', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
        filters: {
          qualityRange: {
            min: 3,
            max: 5,
          },
        },
      };

      const { query, parameters } = queryBuilder.buildOffersQuery(options);

      expect(query).toContain('o.quality_rating >= ?');
      expect(query).toContain('o.quality_rating <= ?');
      expect(parameters).toEqual([3, 5]);
    });

    it('should build query with currency filter', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
        filters: {
          currencies: ['USD', 'EUR'],
        },
      };

      const { query, parameters } = queryBuilder.buildOffersQuery(options);

      expect(query).toContain('o.currency IN (?, ?)');
      expect(parameters).toEqual(['USD', 'EUR']);
    });

    it('should build query with source type filter', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
        filters: {
          sourceTypes: ['manual', 'url'],
        },
      };

      const { query, parameters } = queryBuilder.buildOffersQuery(options);

      expect(query).toContain('o.source_type IN (?, ?)');
      expect(parameters).toEqual(['manual', 'url']);
    });

    it('should build query with pagination', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
        pagination: {
          limit: 10,
          offset: 20,
        },
      };

      const { query, parameters } = queryBuilder.buildOffersQuery(options);

      expect(query).toContain('LIMIT 10 OFFSET 20');
      expect(parameters).toEqual([]);
    });

    it('should build query with custom sort options', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
        sort: {
          field: 'o.effective_price_per_canonical',
          direction: 'DESC',
          secondaryField: 'o.observed_at',
          secondaryDirection: 'ASC',
        },
      };

      const { query, parameters } = queryBuilder.buildOffersQuery(options);

      expect(query).toContain('ORDER BY o.effective_price_per_canonical DESC, o.observed_at ASC');
    });

    it('should include deleted records when specified', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
        filters: {
          includeDeleted: true,
        },
      };

      const { query, parameters } = queryBuilder.buildOffersQuery(options);

      expect(query).not.toContain('o.deleted_at IS NULL');
      expect(parameters).toEqual([]);
    });
  });

  describe('buildBestOffersQuery', () => {
    it('should build best offers query with window function', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
      };

      const { query, parameters } = queryBuilder.buildBestOffersQuery(options);

      expect(query).toContain('WITH ranked_offers AS');
      expect(query).toContain('ROW_NUMBER() OVER');
      expect(query).toContain('PARTITION BY o.inventory_item_id');
      expect(query).toContain('ORDER BY o.effective_price_per_canonical ASC');
      expect(query).toContain('SELECT * FROM ranked_offers WHERE rank = 1');
    });

    it('should build best offers query with filters', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
        filters: {
          inventoryItemIds: ['item1'],
          supplierIds: ['supplier1'],
        },
      };

      const { query, parameters } = queryBuilder.buildBestOffersQuery(options);

      expect(query).toContain('o.inventory_item_id IN (?)');
      expect(query).toContain('o.supplier_id IN (?)');
      expect(parameters).toEqual(['item1', 'supplier1']);
    });
  });

  describe('buildInventoryItemsWithBestOffersQuery', () => {
    it('should build inventory items with best offers query', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
      };

      const { query, parameters } = queryBuilder.buildInventoryItemsWithBestOffersQuery(options);

      expect(query).toContain('FROM inventory_items i');
      expect(query).toContain('LEFT JOIN');
      expect(query).toContain('ROW_NUMBER() OVER');
      expect(query).toContain('WHERE i.deleted_at IS NULL');
    });

    it('should build query with inventory item filter', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
        filters: {
          inventoryItemIds: ['item1', 'item2'],
        },
      };

      const { query, parameters } = queryBuilder.buildInventoryItemsWithBestOffersQuery(options);

      expect(query).toContain('i.id IN (?, ?)');
      expect(parameters).toEqual(['item1', 'item2']);
    });
  });

  describe('buildPriceTrendQuery', () => {
    it('should build price trend query', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
      };

      const { query, parameters } = queryBuilder.buildPriceTrendQuery('item1', options);

      expect(query).toContain('SELECT DATE(o.observed_at) as date');
      expect(query).toContain('MIN(o.effective_price_per_canonical) as min_price');
      expect(query).toContain('MAX(o.effective_price_per_canonical) as max_price');
      expect(query).toContain('AVG(o.effective_price_per_canonical) as avg_price');
      expect(query).toContain('COUNT(*) as offer_count');
      expect(query).toContain('WHERE o.inventory_item_id = ?');
      expect(query).toContain('GROUP BY DATE(o.observed_at)');
      expect(query).toContain('ORDER BY DATE(o.observed_at) DESC');
      expect(parameters).toEqual(['item1']);
    });

    it('should build price trend query with date range', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
        filters: {
          dateRange: {
            start: '2024-01-01',
            end: '2024-12-31',
          },
        },
      };

      const { query, parameters } = queryBuilder.buildPriceTrendQuery('item1', options);

      expect(query).toContain('o.observed_at >= ?');
      expect(query).toContain('o.observed_at <= ?');
      expect(parameters).toEqual(['item1', '2024-01-01', '2024-12-31']);
    });
  });

  describe('strategy-specific ordering', () => {
    it('should use price per canonical excluding shipping when specified', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
        strategyOptions: {
          includeShipping: false,
        },
      };

      const options: QueryOptions = {
        config,
      };

      const { query } = queryBuilder.buildOffersQuery(options);

      expect(query).toContain('ORDER BY o.price_per_canonical_excl_shipping ASC');
    });

    it('should use price per canonical including shipping when specified', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
        strategyOptions: {
          includeShipping: true,
        },
      };

      const options: QueryOptions = {
        config,
      };

      const { query } = queryBuilder.buildOffersQuery(options);

      expect(query).toContain('ORDER BY o.price_per_canonical_incl_shipping ASC');
    });

    it('should use total price ordering for totalPrice strategy', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'totalPrice',
        strategyOptions: {
          includeShipping: false,
        },
      };

      const options: QueryOptions = {
        config,
      };

      const { query } = queryBuilder.buildOffersQuery(options);

      expect(query).toContain('ORDER BY o.total_price ASC');
    });

    it('should use total price with shipping for totalPrice strategy', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'totalPrice',
        strategyOptions: {
          includeShipping: true,
        },
      };

      const options: QueryOptions = {
        config,
      };

      const { query } = queryBuilder.buildOffersQuery(options);

      expect(query).toContain('ORDER BY (o.total_price + COALESCE(o.shipping_cost, 0)) ASC');
    });

    it('should use price per unit ordering for pricePerUnit strategy', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerUnit',
        strategyOptions: {
          includeShipping: false,
        },
      };

      const options: QueryOptions = {
        config,
      };

      const { query } = queryBuilder.buildOffersQuery(options);

      expect(query).toContain('ORDER BY (o.total_price / o.amount) ASC');
    });

    it('should use quality adjusted price ordering for qualityAdjustedPrice strategy', () => {
      const config: ComparisonConfig = {
        primaryStrategy: 'qualityAdjustedPrice',
      };

      const options: QueryOptions = {
        config,
      };

      const { query } = queryBuilder.buildOffersQuery(options);

      expect(query).toContain('ORDER BY (o.effective_price_per_canonical * (1 - COALESCE(o.quality_rating, 3) * 0.1)) ASC');
    });
  });
});

describe('ComparisonQueryExecutor', () => {
  let queryExecutor: ComparisonQueryExecutor;
  let mockExecuteFn: jest.Mock;

  beforeEach(() => {
    queryExecutor = new ComparisonQueryExecutor();
    mockExecuteFn = jest.fn();
  });

  describe('executeQuery', () => {
    it('should execute query and return results with metadata', async () => {
      const mockResults = [
        { id: '1', name: 'Offer 1' },
        { id: '2', name: 'Offer 2' },
      ];

      mockExecuteFn.mockResolvedValue(mockResults);

      const queryFn = () => ({
        query: 'SELECT * FROM offers',
        parameters: [],
      });

      const result = await queryExecutor.executeQuery(queryFn, mockExecuteFn);

      expect(result.results).toEqual(mockResults);
      expect(result.metadata.totalCount).toBe(2);
      expect(result.metadata.returnedCount).toBe(2);
      expect(result.metadata.query).toBe('SELECT * FROM offers');
      expect(result.metadata.parameters).toEqual([]);
      expect(result.metadata.executionTimeMs).toBeGreaterThan(0);
    });

    it('should handle query execution errors', async () => {
      const error = new Error('Database connection failed');
      mockExecuteFn.mockRejectedValue(error);

      const queryFn = () => ({
        query: 'SELECT * FROM offers',
        parameters: [],
      });

      await expect(queryExecutor.executeQuery(queryFn, mockExecuteFn)).rejects.toThrow(
        'Query execution failed: Database connection failed'
      );
    });
  });

  describe('executeOffersQuery', () => {
    it('should execute offers query', async () => {
      const mockResults = [{ id: '1', name: 'Offer 1' }];
      mockExecuteFn.mockResolvedValue(mockResults);

      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
      };

      const result = await queryExecutor.executeOffersQuery(options, mockExecuteFn);

      expect(result.results).toEqual(mockResults);
      expect(mockExecuteFn).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.any(Array)
      );
    });
  });

  describe('executeBestOffersQuery', () => {
    it('should execute best offers query', async () => {
      const mockResults = [{ id: '1', name: 'Best Offer' }];
      mockExecuteFn.mockResolvedValue(mockResults);

      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
      };

      const result = await queryExecutor.executeBestOffersQuery(options, mockExecuteFn);

      expect(result.results).toEqual(mockResults);
      expect(mockExecuteFn).toHaveBeenCalledWith(
        expect.stringContaining('WITH ranked_offers AS'),
        expect.any(Array)
      );
    });
  });

  describe('executeInventoryItemsWithBestOffersQuery', () => {
    it('should execute inventory items with best offers query', async () => {
      const mockResults = [{ id: '1', name: 'Item 1' }];
      mockExecuteFn.mockResolvedValue(mockResults);

      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
      };

      const result = await queryExecutor.executeInventoryItemsWithBestOffersQuery(options, mockExecuteFn);

      expect(result.results).toEqual(mockResults);
      expect(mockExecuteFn).toHaveBeenCalledWith(
        expect.stringContaining('FROM inventory_items i'),
        expect.any(Array)
      );
    });
  });

  describe('executePriceTrendQuery', () => {
    it('should execute price trend query', async () => {
      const mockResults = [
        { date: '2024-01-01', min_price: 10, max_price: 20, avg_price: 15 },
      ];
      mockExecuteFn.mockResolvedValue(mockResults);

      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
      };

      const options: QueryOptions = {
        config,
      };

      const result = await queryExecutor.executePriceTrendQuery('item1', options, mockExecuteFn);

      expect(result.results).toEqual(mockResults);
      expect(mockExecuteFn).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DATE(o.observed_at) as date'),
        expect.arrayContaining(['item1'])
      );
    });
  });
});
