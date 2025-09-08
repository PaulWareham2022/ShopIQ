/**
 * Comparison Offer Repository
 *
 * Extends the base OfferRepository with comparison engine query capabilities.
 * Provides efficient SQLite queries for sorting and filtering based on
 * computed price-per-unit and other comparator criteria.
 */

import { OfferRepository } from './OfferRepository';
import { Offer } from '../types';
import { ComparisonQueryBuilder, ComparisonQueryExecutor, QueryOptions, QueryResult } from '../comparison/queryBuilder';
import { ComparisonConfig } from '../comparison/types';
import { executeSql } from '../sqlite/database';
import { DatabaseError } from '../types';

/**
 * Extended offer repository with comparison engine capabilities
 */
export class ComparisonOfferRepository extends OfferRepository {
  private queryBuilder: ComparisonQueryBuilder;
  private queryExecutor: ComparisonQueryExecutor;

  constructor() {
    super();
    this.queryBuilder = new ComparisonQueryBuilder();
    this.queryExecutor = new ComparisonQueryExecutor();
  }

  /**
   * Find offers sorted by comparison criteria
   */
  async findOffersByComparison(options: QueryOptions): Promise<QueryResult<Offer>> {
    try {
      return await this.queryExecutor.executeOffersQuery(
        options,
        this.executeQuery.bind(this)
      );
    } catch (error) {
      throw new DatabaseError(
        'Failed to find offers by comparison criteria',
        error as Error
      );
    }
  }

  /**
   * Find best offers per inventory item based on comparison criteria
   */
  async findBestOffersByComparison(options: QueryOptions): Promise<QueryResult<Offer>> {
    try {
      return await this.queryExecutor.executeBestOffersQuery(
        options,
        this.executeQuery.bind(this)
      );
    } catch (error) {
      throw new DatabaseError(
        'Failed to find best offers by comparison criteria',
        error as Error
      );
    }
  }

  /**
   * Find inventory items with their best offers
   */
  async findInventoryItemsWithBestOffers(options: QueryOptions): Promise<QueryResult<any>> {
    try {
      return await this.queryExecutor.executeInventoryItemsWithBestOffersQuery(
        options,
        this.executeQuery.bind(this)
      );
    } catch (error) {
      throw new DatabaseError(
        'Failed to find inventory items with best offers',
        error as Error
      );
    }
  }

  /**
   * Get price trend data for an inventory item
   */
  async getPriceTrend(inventoryItemId: string, options: QueryOptions): Promise<QueryResult<any>> {
    try {
      return await this.queryExecutor.executePriceTrendQuery(
        inventoryItemId,
        options,
        this.executeQuery.bind(this)
      );
    } catch (error) {
      throw new DatabaseError(
        'Failed to get price trend data',
        error as Error
      );
    }
  }

  /**
   * Find offers for a specific inventory item with advanced sorting
   */
  async findByInventoryItemWithComparison(
    inventoryItemId: string,
    config: ComparisonConfig,
    options?: {
      limit?: number;
      offset?: number;
      includeDeleted?: boolean;
      dateRange?: { start: string; end: string };
      priceRange?: { min: number; max: number };
      qualityRange?: { min: number; max: number };
    }
  ): Promise<QueryResult<Offer>> {
    const queryOptions: QueryOptions = {
      config,
      filters: {
        inventoryItemIds: [inventoryItemId],
        includeDeleted: options?.includeDeleted,
        dateRange: options?.dateRange,
        priceRange: options?.priceRange,
        qualityRange: options?.qualityRange,
      },
      pagination: {
        limit: options?.limit,
        offset: options?.offset,
      },
    };

    return this.findOffersByComparison(queryOptions);
  }

  /**
   * Find best offer for a specific inventory item with comparison criteria
   */
  async findBestOfferForItemWithComparison(
    inventoryItemId: string,
    config: ComparisonConfig,
    options?: {
      includeDeleted?: boolean;
      dateRange?: { start: string; end: string };
      priceRange?: { min: number; max: number };
      qualityRange?: { min: number; max: number };
    }
  ): Promise<Offer | null> {
    const queryOptions: QueryOptions = {
      config,
      filters: {
        inventoryItemIds: [inventoryItemId],
        includeDeleted: options?.includeDeleted,
        dateRange: options?.dateRange,
        priceRange: options?.priceRange,
        qualityRange: options?.qualityRange,
      },
      pagination: {
        limit: 1,
      },
    };

    const result = await this.findBestOffersByComparison(queryOptions);
    return result.results.length > 0 ? result.results[0] : null;
  }

  /**
   * Find offers by multiple inventory items with comparison criteria
   */
  async findByInventoryItemsWithComparison(
    inventoryItemIds: string[],
    config: ComparisonConfig,
    options?: {
      limit?: number;
      offset?: number;
      includeDeleted?: boolean;
      dateRange?: { start: string; end: string };
      priceRange?: { min: number; max: number };
      qualityRange?: { min: number; max: number };
    }
  ): Promise<QueryResult<Offer>> {
    const queryOptions: QueryOptions = {
      config,
      filters: {
        inventoryItemIds,
        includeDeleted: options?.includeDeleted,
        dateRange: options?.dateRange,
        priceRange: options?.priceRange,
        qualityRange: options?.qualityRange,
      },
      pagination: {
        limit: options?.limit,
        offset: options?.offset,
      },
    };

    return this.findOffersByComparison(queryOptions);
  }

  /**
   * Find offers by supplier with comparison criteria
   */
  async findBySupplierWithComparison(
    supplierId: string,
    config: ComparisonConfig,
    options?: {
      limit?: number;
      offset?: number;
      includeDeleted?: boolean;
      dateRange?: { start: string; end: string };
      priceRange?: { min: number; max: number };
      qualityRange?: { min: number; max: number };
    }
  ): Promise<QueryResult<Offer>> {
    const queryOptions: QueryOptions = {
      config,
      filters: {
        supplierIds: [supplierId],
        includeDeleted: options?.includeDeleted,
        dateRange: options?.dateRange,
        priceRange: options?.priceRange,
        qualityRange: options?.qualityRange,
      },
      pagination: {
        limit: options?.limit,
        offset: options?.offset,
      },
    };

    return this.findOffersByComparison(queryOptions);
  }

  /**
   * Find offers by multiple suppliers with comparison criteria
   */
  async findBySuppliersWithComparison(
    supplierIds: string[],
    config: ComparisonConfig,
    options?: {
      limit?: number;
      offset?: number;
      includeDeleted?: boolean;
      dateRange?: { start: string; end: string };
      priceRange?: { min: number; max: number };
      qualityRange?: { min: number; max: number };
    }
  ): Promise<QueryResult<Offer>> {
    const queryOptions: QueryOptions = {
      config,
      filters: {
        supplierIds,
        includeDeleted: options?.includeDeleted,
        dateRange: options?.dateRange,
        priceRange: options?.priceRange,
        qualityRange: options?.qualityRange,
      },
      pagination: {
        limit: options?.limit,
        offset: options?.offset,
      },
    };

    return this.findOffersByComparison(queryOptions);
  }

  /**
   * Get price statistics for an inventory item
   */
  async getPriceStatistics(
    inventoryItemId: string,
    options?: {
      includeDeleted?: boolean;
      dateRange?: { start: string; end: string };
      supplierIds?: string[];
    }
  ): Promise<{
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    medianPrice: number;
    offerCount: number;
    priceRange: number;
  }> {
    try {
      let whereConditions = ['o.inventory_item_id = ?', 'o.deleted_at IS NULL'];
      const parameters: any[] = [inventoryItemId];

      if (options?.dateRange) {
        if (options.dateRange.start) {
          whereConditions.push('o.observed_at >= ?');
          parameters.push(options.dateRange.start);
        }
        if (options.dateRange.end) {
          whereConditions.push('o.observed_at <= ?');
          parameters.push(options.dateRange.end);
        }
      }

      if (options?.supplierIds && options.supplierIds.length > 0) {
        whereConditions.push(`o.supplier_id IN (${options.supplierIds.map(() => '?').join(', ')})`);
        parameters.push(...options.supplierIds);
      }

      const sql = `
        SELECT 
          MIN(o.effective_price_per_canonical) as min_price,
          MAX(o.effective_price_per_canonical) as max_price,
          AVG(o.effective_price_per_canonical) as avg_price,
          COUNT(*) as offer_count
        FROM offers o
        WHERE ${whereConditions.join(' AND ')}
      `;

      const result = await executeSql(sql, parameters);
      
      if (result.rows.length === 0) {
        return {
          minPrice: 0,
          maxPrice: 0,
          avgPrice: 0,
          medianPrice: 0,
          offerCount: 0,
          priceRange: 0,
        };
      }

      const row = result.rows.item(0);
      const minPrice = row.min_price || 0;
      const maxPrice = row.max_price || 0;
      const avgPrice = row.avg_price || 0;
      const offerCount = row.offer_count || 0;
      const priceRange = maxPrice - minPrice;

      // Calculate median price
      const medianSql = `
        SELECT effective_price_per_canonical
        FROM offers o
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY effective_price_per_canonical
        LIMIT 1 OFFSET ?
      `;
      
      const medianOffset = Math.floor(offerCount / 2);
      const medianResult = await executeSql(medianSql, [...parameters, medianOffset]);
      const medianPrice = medianResult.rows.length > 0 ? medianResult.rows.item(0).effective_price_per_canonical : avgPrice;

      return {
        minPrice,
        maxPrice,
        avgPrice,
        medianPrice,
        offerCount,
        priceRange,
      };
    } catch (error) {
      throw new DatabaseError(
        'Failed to get price statistics',
        error as Error
      );
    }
  }

  /**
   * Get supplier performance statistics
   */
  async getSupplierPerformanceStats(
    supplierId: string,
    options?: {
      includeDeleted?: boolean;
      dateRange?: { start: string; end: string };
    }
  ): Promise<{
    totalOffers: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    bestOfferCount: number;
    avgQualityRating: number;
  }> {
    try {
      let whereConditions = ['o.supplier_id = ?', 'o.deleted_at IS NULL'];
      const parameters: any[] = [supplierId];

      if (options?.dateRange) {
        if (options.dateRange.start) {
          whereConditions.push('o.observed_at >= ?');
          parameters.push(options.dateRange.start);
        }
        if (options.dateRange.end) {
          whereConditions.push('o.observed_at <= ?');
          parameters.push(options.dateRange.end);
        }
      }

      const sql = `
        SELECT 
          COUNT(*) as total_offers,
          AVG(o.effective_price_per_canonical) as avg_price,
          MIN(o.effective_price_per_canonical) as min_price,
          MAX(o.effective_price_per_canonical) as max_price,
          AVG(o.quality_rating) as avg_quality_rating
        FROM offers o
        WHERE ${whereConditions.join(' AND ')}
      `;

      const result = await executeSql(sql, parameters);
      
      if (result.rows.length === 0) {
        return {
          totalOffers: 0,
          avgPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          bestOfferCount: 0,
          avgQualityRating: 0,
        };
      }

      const row = result.rows.item(0);
      const totalOffers = row.total_offers || 0;
      const avgPrice = row.avg_price || 0;
      const minPrice = row.min_price || 0;
      const maxPrice = row.max_price || 0;
      const avgQualityRating = row.avg_quality_rating || 0;

      // Count best offers (offers that are the cheapest for their inventory item)
      const bestOfferSql = `
        SELECT COUNT(*) as best_offer_count
        FROM offers o
        WHERE o.supplier_id = ? 
          AND o.deleted_at IS NULL
          AND o.effective_price_per_canonical = (
            SELECT MIN(o2.effective_price_per_canonical)
            FROM offers o2
            WHERE o2.inventory_item_id = o.inventory_item_id
              AND o2.deleted_at IS NULL
          )
        ${options?.dateRange?.start ? 'AND o.observed_at >= ?' : ''}
        ${options?.dateRange?.end ? 'AND o.observed_at <= ?' : ''}
      `;

      const bestOfferParams = [supplierId];
      if (options?.dateRange?.start) bestOfferParams.push(options.dateRange.start);
      if (options?.dateRange?.end) bestOfferParams.push(options.dateRange.end);

      const bestOfferResult = await executeSql(bestOfferSql, bestOfferParams);
      const bestOfferCount = bestOfferResult.rows.length > 0 ? bestOfferResult.rows.item(0).best_offer_count : 0;

      return {
        totalOffers,
        avgPrice,
        minPrice,
        maxPrice,
        bestOfferCount,
        avgQualityRating,
      };
    } catch (error) {
      throw new DatabaseError(
        'Failed to get supplier performance statistics',
        error as Error
      );
    }
  }

  /**
   * Execute a raw SQL query (used by query executor)
   */
  private async executeQuery(query: string, parameters: any[]): Promise<Offer[]> {
    try {
      const result = await executeSql(query, parameters);
      const offers: Offer[] = [];

      for (let i = 0; i < result.rows.length; i++) {
        offers.push(this.mapRowToEntity(result.rows.item(i)));
      }

      return offers;
    } catch (error) {
      throw new DatabaseError(
        'Failed to execute comparison query',
        error as Error
      );
    }
  }
}
