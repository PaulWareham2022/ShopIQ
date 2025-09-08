/**
 * SQLite Query Builder for Comparison Engine
 *
 * Provides efficient SQLite queries for sorting and filtering inventory items
 * and offers based on computed price-per-unit and other comparator criteria.
 * Supports dynamic query generation based on user configuration.
 */

import { ComparisonConfig, GlobalComparisonOptions, PriceComparatorOptions } from './types';
import { Offer, InventoryItem, Supplier } from '../types';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

/**
 * Query options for building SQLite queries
 */
export interface QueryOptions {
  /** Comparison configuration */
  config: ComparisonConfig;
  
  /** Global options */
  globalOptions?: GlobalComparisonOptions;
  
  /** Strategy-specific options */
  strategyOptions?: Record<string, any>;
  
  /** Additional filters */
  filters?: QueryFilters;
  
  /** Pagination options */
  pagination?: PaginationOptions;
  
  /** Sort options */
  sort?: SortOptions;
}

/**
 * Query filters for narrowing results
 */
export interface QueryFilters {
  /** Filter by inventory item IDs */
  inventoryItemIds?: string[];
  
  /** Filter by supplier IDs */
  supplierIds?: string[];
  
  /** Filter by date range */
  dateRange?: {
    start: string;
    end: string;
  };
  
  /** Filter by price range */
  priceRange?: {
    min: number;
    max: number;
  };
  
  /** Filter by quality rating */
  qualityRange?: {
    min: number;
    max: number;
  };
  
  /** Filter by currency */
  currencies?: string[];
  
  /** Filter by source type */
  sourceTypes?: ('manual' | 'url' | 'ocr' | 'api')[];
  
  /** Include soft-deleted records */
  includeDeleted?: boolean;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  /** Number of results per page */
  limit?: number;
  
  /** Offset for pagination */
  offset?: number;
}

/**
 * Sort options
 */
export interface SortOptions {
  /** Field to sort by */
  field: string;
  
  /** Sort direction */
  direction: 'ASC' | 'DESC';
  
  /** Secondary sort field */
  secondaryField?: string;
  
  /** Secondary sort direction */
  secondaryDirection?: 'ASC' | 'DESC';
}

/**
 * Query result metadata
 */
export interface QueryResultMetadata {
  /** Total number of results (before pagination) */
  totalCount: number;
  
  /** Number of results returned */
  returnedCount: number;
  
  /** Query execution time in milliseconds */
  executionTimeMs: number;
  
  /** Query used */
  query: string;
  
  /** Parameters used */
  parameters: any[];
}

/**
 * Complete query result
 */
export interface QueryResult<T> {
  /** The actual results */
  results: T[];
  
  /** Result metadata */
  metadata: QueryResultMetadata;
}

// =============================================================================
// QUERY BUILDER CLASS
// =============================================================================

/**
 * SQLite Query Builder for comparison engine queries
 */
export class ComparisonQueryBuilder {
  private baseQuery: string = '';
  private whereConditions: string[] = [];
  private orderByClause: string = '';
  private limitClause: string = '';
  private parameters: any[] = [];
  private parameterIndex: number = 1;

  /**
   * Build a query for finding offers sorted by comparison criteria
   */
  buildOffersQuery(options: QueryOptions): { query: string; parameters: any[] } {
    this.reset();
    
    // Start with base query
    this.baseQuery = `
      SELECT 
        o.*,
        i.name as inventory_item_name,
        i.canonical_dimension,
        i.canonical_unit,
        i.equivalence_factor,
        s.name as supplier_name,
        s.country_code as supplier_country,
        s.default_currency as supplier_currency
      FROM offers o
      INNER JOIN inventory_items i ON o.inventory_item_id = i.id
      INNER JOIN suppliers s ON o.supplier_id = s.id
    `;

    // Add WHERE conditions
    this.addSoftDeleteCondition(options.filters?.includeDeleted);
    this.addInventoryItemFilter(options.filters?.inventoryItemIds);
    this.addSupplierFilter(options.filters?.supplierIds);
    this.addDateRangeFilter(options.filters?.dateRange);
    this.addPriceRangeFilter(options.filters?.priceRange);
    this.addQualityRangeFilter(options.filters?.qualityRange);
    this.addCurrencyFilter(options.filters?.currencies);
    this.addSourceTypeFilter(options.filters?.sourceTypes);

    // Add ORDER BY clause based on strategy
    this.addOrderByClause(options);

    // Add LIMIT clause
    this.addLimitClause(options.pagination);

    const finalQuery = `${this.baseQuery}${this.getWhereClause()}${this.orderByClause}${this.limitClause}`;
    
    return {
      query: finalQuery,
      parameters: this.parameters
    };
  }

  /**
   * Build a query for finding best offers per inventory item
   */
  buildBestOffersQuery(options: QueryOptions): { query: string; parameters: any[] } {
    this.reset();
    
    // Use window function to get best offer per inventory item
    this.baseQuery = `
      WITH ranked_offers AS (
        SELECT 
          o.*,
          i.name as inventory_item_name,
          i.canonical_dimension,
          i.canonical_unit,
          i.equivalence_factor,
          s.name as supplier_name,
          s.country_code as supplier_country,
          s.default_currency as supplier_currency,
          ROW_NUMBER() OVER (
            PARTITION BY o.inventory_item_id 
            ORDER BY ${this.getOrderByExpression(options)}
          ) as rank
        FROM offers o
        INNER JOIN inventory_items i ON o.inventory_item_id = i.id
        INNER JOIN suppliers s ON o.supplier_id = s.id
        ${this.getWhereClause()}
      )
      SELECT * FROM ranked_offers WHERE rank = 1
    `;

    // Add WHERE conditions
    this.addSoftDeleteCondition(options.filters?.includeDeleted);
    this.addInventoryItemFilter(options.filters?.inventoryItemIds);
    this.addSupplierFilter(options.filters?.supplierIds);
    this.addDateRangeFilter(options.filters?.dateRange);
    this.addPriceRangeFilter(options.filters?.priceRange);
    this.addQualityRangeFilter(options.filters?.qualityRange);
    this.addCurrencyFilter(options.filters?.currencies);
    this.addSourceTypeFilter(options.filters?.sourceTypes);

    // Add LIMIT clause
    this.addLimitClause(options.pagination);

    const finalQuery = `${this.baseQuery}${this.limitClause}`;
    
    return {
      query: finalQuery,
      parameters: this.parameters
    };
  }

  /**
   * Build a query for finding inventory items with their best offers
   */
  buildInventoryItemsWithBestOffersQuery(options: QueryOptions): { query: string; parameters: any[] } {
    this.reset();
    
    this.baseQuery = `
      SELECT 
        i.*,
        o.id as best_offer_id,
        o.total_price as best_offer_price,
        o.effective_price_per_canonical as best_offer_price_per_canonical,
        o.currency as best_offer_currency,
        o.observed_at as best_offer_observed_at,
        s.name as best_offer_supplier_name,
        s.country_code as best_offer_supplier_country
      FROM inventory_items i
      LEFT JOIN (
        SELECT 
          o.*,
          s.name as supplier_name,
          s.country_code as supplier_country,
          ROW_NUMBER() OVER (
            PARTITION BY o.inventory_item_id 
            ORDER BY ${this.getOrderByExpression(options)}
          ) as rank
        FROM offers o
        INNER JOIN suppliers s ON o.supplier_id = s.id
        WHERE o.deleted_at IS NULL
        ${this.getInventoryItemWhereClause(options.filters?.inventoryItemIds)}
        ${this.getSupplierWhereClause(options.filters?.supplierIds)}
        ${this.getDateRangeWhereClause(options.filters?.dateRange)}
        ${this.getPriceRangeWhereClause(options.filters?.priceRange)}
        ${this.getQualityRangeWhereClause(options.filters?.qualityRange)}
        ${this.getCurrencyWhereClause(options.filters?.currencies)}
        ${this.getSourceTypeWhereClause(options.filters?.sourceTypes)}
      ) o ON i.id = o.inventory_item_id AND o.rank = 1
      WHERE i.deleted_at IS NULL
    `;

    // Add inventory item filters
    if (options.filters?.inventoryItemIds) {
      this.addCondition(`i.id IN (${this.createPlaceholders(options.filters.inventoryItemIds)})`, options.filters.inventoryItemIds);
    }

    // Add ORDER BY clause
    this.addInventoryItemsOrderByClause(options);

    // Add LIMIT clause
    this.addLimitClause(options.pagination);

    const finalQuery = `${this.baseQuery}${this.orderByClause}${this.limitClause}`;
    
    return {
      query: finalQuery,
      parameters: this.parameters
    };
  }

  /**
   * Build a query for price trend analysis
   */
  buildPriceTrendQuery(inventoryItemId: string, options: QueryOptions): { query: string; parameters: any[] } {
    this.reset();
    
    this.baseQuery = `
      SELECT 
        DATE(o.observed_at) as date,
        MIN(o.effective_price_per_canonical) as min_price,
        MAX(o.effective_price_per_canonical) as max_price,
        AVG(o.effective_price_per_canonical) as avg_price,
        COUNT(*) as offer_count,
        MIN(o.total_price) as min_total_price,
        MAX(o.total_price) as max_total_price,
        AVG(o.total_price) as avg_total_price
      FROM offers o
      WHERE o.inventory_item_id = ? AND o.deleted_at IS NULL
    `;

    this.parameters.push(inventoryItemId);

    // Add date range filter
    this.addDateRangeFilter(options.filters?.dateRange);

    // Add supplier filter
    this.addSupplierFilter(options.filters?.supplierIds);

    // Add currency filter
    this.addCurrencyFilter(options.filters?.currencies);

    // Group by date and order by date
    this.baseQuery += `
      GROUP BY DATE(o.observed_at)
      ORDER BY DATE(o.observed_at) DESC
    `;

    // Add LIMIT clause
    this.addLimitClause(options.pagination);

    const finalQuery = `${this.baseQuery}${this.limitClause}`;
    
    return {
      query: finalQuery,
      parameters: this.parameters
    };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private reset(): void {
    this.baseQuery = '';
    this.whereConditions = [];
    this.orderByClause = '';
    this.limitClause = '';
    this.parameters = [];
    this.parameterIndex = 1;
  }

  private addCondition(condition: string, ...params: any[]): void {
    this.whereConditions.push(condition);
    this.parameters.push(...params);
  }

  private getWhereClause(): string {
    if (this.whereConditions.length === 0) {
      return '';
    }
    return ` WHERE ${this.whereConditions.join(' AND ')}`;
  }

  private createPlaceholders(values: any[]): string {
    return values.map(() => '?').join(', ');
  }

  private addSoftDeleteCondition(includeDeleted?: boolean): void {
    if (!includeDeleted) {
      this.addCondition('o.deleted_at IS NULL');
    }
  }

  private addInventoryItemFilter(inventoryItemIds?: string[]): void {
    if (inventoryItemIds && inventoryItemIds.length > 0) {
      this.addCondition(`o.inventory_item_id IN (${this.createPlaceholders(inventoryItemIds)})`, ...inventoryItemIds);
    }
  }

  private addSupplierFilter(supplierIds?: string[]): void {
    if (supplierIds && supplierIds.length > 0) {
      this.addCondition(`o.supplier_id IN (${this.createPlaceholders(supplierIds)})`, ...supplierIds);
    }
  }

  private addDateRangeFilter(dateRange?: { start: string; end: string }): void {
    if (dateRange) {
      if (dateRange.start) {
        this.addCondition('o.observed_at >= ?', dateRange.start);
      }
      if (dateRange.end) {
        this.addCondition('o.observed_at <= ?', dateRange.end);
      }
    }
  }

  private addPriceRangeFilter(priceRange?: { min: number; max: number }): void {
    if (priceRange) {
      if (priceRange.min !== undefined) {
        this.addCondition('o.effective_price_per_canonical >= ?', priceRange.min);
      }
      if (priceRange.max !== undefined) {
        this.addCondition('o.effective_price_per_canonical <= ?', priceRange.max);
      }
    }
  }

  private addQualityRangeFilter(qualityRange?: { min: number; max: number }): void {
    if (qualityRange) {
      if (qualityRange.min !== undefined) {
        this.addCondition('o.quality_rating >= ?', qualityRange.min);
      }
      if (qualityRange.max !== undefined) {
        this.addCondition('o.quality_rating <= ?', qualityRange.max);
      }
    }
  }

  private addCurrencyFilter(currencies?: string[]): void {
    if (currencies && currencies.length > 0) {
      this.addCondition(`o.currency IN (${this.createPlaceholders(currencies)})`, ...currencies);
    }
  }

  private addSourceTypeFilter(sourceTypes?: ('manual' | 'url' | 'ocr' | 'api')[]): void {
    if (sourceTypes && sourceTypes.length > 0) {
      this.addCondition(`o.source_type IN (${this.createPlaceholders(sourceTypes)})`, ...sourceTypes);
    }
  }

  private addOrderByClause(options: QueryOptions): void {
    const orderExpression = this.getOrderByExpression(options);
    const direction = options.sort?.direction || 'ASC';
    const secondaryField = options.sort?.secondaryField || 'o.observed_at';
    const secondaryDirection = options.sort?.secondaryDirection || 'DESC';
    
    this.orderByClause = ` ORDER BY ${orderExpression} ${direction}, ${secondaryField} ${secondaryDirection}`;
  }

  private addInventoryItemsOrderByClause(options: QueryOptions): void {
    const orderExpression = this.getOrderByExpression(options);
    const direction = options.sort?.direction || 'ASC';
    
    this.orderByClause = ` ORDER BY ${orderExpression} ${direction}, i.name ASC`;
  }

  private getOrderByExpression(options: QueryOptions): string {
    const strategy = options.config.primaryStrategy;
    const strategyOptions = options.strategyOptions || options.config.strategyOptions || {};

    switch (strategy) {
      case 'pricePerCanonical':
        return this.getPricePerCanonicalOrderExpression(strategyOptions);
      case 'totalPrice':
        return this.getTotalPriceOrderExpression(strategyOptions);
      case 'pricePerUnit':
        return this.getPricePerUnitOrderExpression(strategyOptions);
      case 'qualityAdjustedPrice':
        return this.getQualityAdjustedPriceOrderExpression(strategyOptions);
      default:
        // Default to effective price per canonical
        return 'o.effective_price_per_canonical';
    }
  }

  private getPricePerCanonicalOrderExpression(options: PriceComparatorOptions): string {
    if (options.includeShipping === false) {
      return 'o.price_per_canonical_excl_shipping';
    } else if (options.includeShipping === true) {
      return 'o.price_per_canonical_incl_shipping';
    } else {
      return 'o.effective_price_per_canonical';
    }
  }

  private getTotalPriceOrderExpression(options: PriceComparatorOptions): string {
    if (options.includeShipping === false) {
      return 'o.total_price';
    } else if (options.includeShipping === true) {
      return '(o.total_price + COALESCE(o.shipping_cost, 0))';
    } else {
      return 'o.total_price';
    }
  }

  private getPricePerUnitOrderExpression(options: PriceComparatorOptions): string {
    if (options.includeShipping === false) {
      return '(o.total_price / o.amount)';
    } else if (options.includeShipping === true) {
      return '((o.total_price + COALESCE(o.shipping_cost, 0)) / o.amount)';
    } else {
      return '(o.total_price / o.amount)';
    }
  }

  private getQualityAdjustedPriceOrderExpression(options: any): string {
    // For quality-adjusted price, we need to compute the adjusted price
    // This is a simplified version - in practice, you might want to use a more complex expression
    const basePrice = this.getPricePerCanonicalOrderExpression(options);
    return `(${basePrice} * (1 - COALESCE(o.quality_rating, 3) * 0.1))`;
  }

  private addLimitClause(pagination?: PaginationOptions): void {
    if (pagination?.limit) {
      this.limitClause = ` LIMIT ${pagination.limit}`;
      if (pagination.offset) {
        this.limitClause += ` OFFSET ${pagination.offset}`;
      }
    }
  }

  // Helper methods for building WHERE clauses in subqueries
  private getInventoryItemWhereClause(inventoryItemIds?: string[]): string {
    if (inventoryItemIds && inventoryItemIds.length > 0) {
      return ` AND o.inventory_item_id IN (${this.createPlaceholders(inventoryItemIds)})`;
    }
    return '';
  }

  private getSupplierWhereClause(supplierIds?: string[]): string {
    if (supplierIds && supplierIds.length > 0) {
      return ` AND o.supplier_id IN (${this.createPlaceholders(supplierIds)})`;
    }
    return '';
  }

  private getDateRangeWhereClause(dateRange?: { start: string; end: string }): string {
    let clause = '';
    if (dateRange?.start) {
      clause += ` AND o.observed_at >= '${dateRange.start}'`;
    }
    if (dateRange?.end) {
      clause += ` AND o.observed_at <= '${dateRange.end}'`;
    }
    return clause;
  }

  private getPriceRangeWhereClause(priceRange?: { min: number; max: number }): string {
    let clause = '';
    if (priceRange?.min !== undefined) {
      clause += ` AND o.effective_price_per_canonical >= ${priceRange.min}`;
    }
    if (priceRange?.max !== undefined) {
      clause += ` AND o.effective_price_per_canonical <= ${priceRange.max}`;
    }
    return clause;
  }

  private getQualityRangeWhereClause(qualityRange?: { min: number; max: number }): string {
    let clause = '';
    if (qualityRange?.min !== undefined) {
      clause += ` AND o.quality_rating >= ${qualityRange.min}`;
    }
    if (qualityRange?.max !== undefined) {
      clause += ` AND o.quality_rating <= ${qualityRange.max}`;
    }
    return clause;
  }

  private getCurrencyWhereClause(currencies?: string[]): string {
    if (currencies && currencies.length > 0) {
      return ` AND o.currency IN (${currencies.map(c => `'${c}'`).join(', ')})`;
    }
    return '';
  }

  private getSourceTypeWhereClause(sourceTypes?: ('manual' | 'url' | 'ocr' | 'api')[]): string {
    if (sourceTypes && sourceTypes.length > 0) {
      return ` AND o.source_type IN (${sourceTypes.map(t => `'${t}'`).join(', ')})`;
    }
    return '';
  }
}

// =============================================================================
// QUERY EXECUTOR
// =============================================================================

/**
 * Executes comparison queries with performance monitoring
 */
export class ComparisonQueryExecutor {
  private queryBuilder: ComparisonQueryBuilder;

  constructor() {
    this.queryBuilder = new ComparisonQueryBuilder();
  }

  /**
   * Execute a query and return results with metadata
   */
  async executeQuery<T>(
    queryFn: () => { query: string; parameters: any[] },
    executeFn: (query: string, params: any[]) => Promise<T[]>
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    
    const { query, parameters } = queryFn();
    
    try {
      const results = await executeFn(query, parameters);
      const executionTime = Date.now() - startTime;
      
      return {
        results,
        metadata: {
          totalCount: results.length,
          returnedCount: results.length,
          executionTimeMs: executionTime,
          query,
          parameters
        }
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute offers query
   */
  async executeOffersQuery(options: QueryOptions, executeFn: (query: string, params: any[]) => Promise<Offer[]>): Promise<QueryResult<Offer>> {
    return this.executeQuery(
      () => this.queryBuilder.buildOffersQuery(options),
      executeFn
    );
  }

  /**
   * Execute best offers query
   */
  async executeBestOffersQuery(options: QueryOptions, executeFn: (query: string, params: any[]) => Promise<Offer[]>): Promise<QueryResult<Offer>> {
    return this.executeQuery(
      () => this.queryBuilder.buildBestOffersQuery(options),
      executeFn
    );
  }

  /**
   * Execute inventory items with best offers query
   */
  async executeInventoryItemsWithBestOffersQuery(options: QueryOptions, executeFn: (query: string, params: any[]) => Promise<any[]>): Promise<QueryResult<any>> {
    return this.executeQuery(
      () => this.queryBuilder.buildInventoryItemsWithBestOffersQuery(options),
      executeFn
    );
  }

  /**
   * Execute price trend query
   */
  async executePriceTrendQuery(inventoryItemId: string, options: QueryOptions, executeFn: (query: string, params: any[]) => Promise<any[]>): Promise<QueryResult<any>> {
    return this.executeQuery(
      () => this.queryBuilder.buildPriceTrendQuery(inventoryItemId, options),
      executeFn
    );
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

// Classes and types are already exported at their declarations above
