/**
 * Historical Price Tracking Types
 *
 * This file defines the types and interfaces for tracking and analyzing
 * historical price data for inventory items and offers.
 */

// Base entity interface - copied to avoid circular imports
interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// =============================================================================
// HISTORICAL PRICE ENTITY
// =============================================================================

/**
 * Represents a historical price snapshot for an inventory item
 */
export interface HistoricalPrice extends BaseEntity {
  /** Foreign key to InventoryItem.id */
  inventoryItemId: string;

  /** Foreign key to Supplier.id (optional - can be null for aggregated data) */
  supplierId?: string;

  /** The price at this point in time */
  price: number;

  /** ISO 4217 currency code */
  currency: string;

  /** The unit this price represents (canonical unit) */
  unit: string;

  /** The quantity this price represents */
  quantity: number;

  /** When this price was observed/recorded */
  observedAt: string;

  /** Source of this price data */
  source: HistoricalPriceSource;

  /** Additional metadata about this price point */
  metadata?: HistoricalPriceMetadata;
}

/**
 * Source types for historical price data
 */
export type HistoricalPriceSource = 
  | 'offer'           // From an offer record
  | 'manual'          // Manually entered
  | 'api'             // From external API
  | 'scraped'         // Web scraped
  | 'aggregated';     // Computed from multiple sources

/**
 * Metadata for historical price records
 */
export interface HistoricalPriceMetadata {
  /** Original offer ID if sourced from offer */
  originalOfferId?: string;

  /** Confidence level in this price (0-1) */
  confidence?: number;

  /** Whether this price includes shipping */
  includesShipping?: boolean;

  /** Whether this price includes tax */
  includesTax?: boolean;

  /** Quality rating if available */
  qualityRating?: number;

  /** Any additional context */
  notes?: string;

  /** Tags for categorization */
  tags?: string[];
}

// =============================================================================
// PRICE TREND ANALYSIS TYPES
// =============================================================================

/**
 * Represents a price trend over time
 */
export interface PriceTrend {
  /** The inventory item this trend represents */
  inventoryItemId: string;

  /** The supplier this trend represents (null for aggregated) */
  supplierId?: string;

  /** Time period this trend covers */
  period: TimePeriod;

  /** Trend direction */
  direction: TrendDirection;

  /** Trend strength (0-1, where 1 is very strong) */
  strength: number;

  /** Price change percentage */
  changePercentage: number;

  /** Absolute price change */
  changeAmount: number;

  /** Starting price */
  startPrice: number;

  /** Ending price */
  endPrice: number;

  /** Number of data points used */
  dataPointCount: number;

  /** Confidence in the trend analysis */
  confidence: number;

  /** When this trend was calculated */
  calculatedAt: string;
}

/**
 * Time periods for trend analysis
 */
export type TimePeriod = 
  | '1d'      // 1 day
  | '7d'      // 1 week
  | '30d'     // 1 month
  | '90d'     // 3 months
  | '1y'      // 1 year
  | 'all';    // All available data

/**
 * Trend directions
 */
export type TrendDirection = 
  | 'up'      // Price increasing
  | 'down'    // Price decreasing
  | 'stable'  // Price stable
  | 'volatile'; // Price fluctuating

/**
 * Price statistics for a time period
 */
export interface PriceStatistics {
  /** Minimum price in period */
  min: number;

  /** Maximum price in period */
  max: number;

  /** Average price in period */
  average: number;

  /** Median price in period */
  median: number;

  /** Standard deviation */
  standardDeviation: number;

  /** Price volatility (coefficient of variation) */
  volatility: number;

  /** Number of data points */
  count: number;

  /** Time period covered */
  period: TimePeriod;
}

// =============================================================================
// HISTORICAL PRICE QUERY TYPES
// =============================================================================

/**
 * Options for querying historical prices
 */
export interface HistoricalPriceQueryOptions {
  /** Start date for the query */
  startDate?: string;

  /** End date for the query */
  endDate?: string;

  /** Specific supplier to filter by */
  supplierId?: string;

  /** Whether to include aggregated data */
  includeAggregated?: boolean;

  /** Maximum number of results */
  limit?: number;

  /** Sort order */
  sortOrder?: 'asc' | 'desc';

  /** Minimum confidence level */
  minConfidence?: number;

  /** Specific sources to include */
  sources?: HistoricalPriceSource[];
}

/**
 * Options for trend analysis
 */
export interface TrendAnalysisOptions {
  /** Time period for analysis */
  period: TimePeriod;

  /** Specific supplier to analyze (null for aggregated) */
  supplierId?: string;

  /** Minimum number of data points required */
  minDataPoints?: number;

  /** Whether to include confidence scores */
  includeConfidence?: boolean;

  /** Smoothing factor for trend calculation */
  smoothingFactor?: number;
}

// =============================================================================
// HISTORICAL PRICE SERVICE INTERFACES
// =============================================================================

/**
 * Service for managing historical price data
 */
export interface HistoricalPriceService {
  /**
   * Record a new historical price
   */
  recordPrice(price: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>): Promise<HistoricalPrice>;

  /**
   * Record multiple historical prices
   */
  recordPrices(prices: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>[]): Promise<HistoricalPrice[]>;

  /**
   * Get historical prices for an inventory item
   */
  getHistoricalPrices(
    inventoryItemId: string, 
    options?: HistoricalPriceQueryOptions
  ): Promise<HistoricalPrice[]>;

  /**
   * Get price trend for an inventory item
   */
  getPriceTrend(
    inventoryItemId: string, 
    options: TrendAnalysisOptions
  ): Promise<PriceTrend | null>;

  /**
   * Get price statistics for an inventory item
   */
  getPriceStatistics(
    inventoryItemId: string, 
    period: TimePeriod,
    supplierId?: string
  ): Promise<PriceStatistics | null>;

  /**
   * Get best historical price for an inventory item
   */
  getBestHistoricalPrice(
    inventoryItemId: string,
    period?: TimePeriod,
    supplierId?: string
  ): Promise<HistoricalPrice | null>;

  /**
   * Clean up old historical price data
   */
  cleanupOldData(olderThanDays: number): Promise<number>;
}

// =============================================================================
// HISTORICAL PRICE COMPARATOR OPTIONS
// =============================================================================

/**
 * Options for historical price-based comparison
 */
export interface HistoricalPriceComparatorOptions {
  /** Time period to consider for historical analysis */
  historicalPeriod: TimePeriod;

  /** Weight of historical trend in comparison */
  trendWeight: number;

  /** Weight of current price in comparison */
  currentPriceWeight: number;

  /** Whether to prefer items with stable prices */
  preferStablePrices: boolean;

  /** Whether to consider price volatility */
  considerVolatility: boolean;

  /** Maximum acceptable volatility */
  maxVolatility: number;

  /** Whether to use best historical price as reference */
  useBestHistoricalPrice: boolean;

  /** Minimum number of historical data points required */
  minHistoricalDataPoints: number;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Error thrown by historical price operations
 */
export class HistoricalPriceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'HistoricalPriceError';
  }
}

/**
 * Error thrown when insufficient historical data is available
 */
export class InsufficientHistoricalDataError extends HistoricalPriceError {
  constructor(
    inventoryItemId: string,
    requiredPoints: number,
    availablePoints: number
  ) {
    super(
      `Insufficient historical data for item ${inventoryItemId}: required ${requiredPoints}, available ${availablePoints}`,
      'INSUFFICIENT_DATA'
    );
  }
}

/**
 * Error thrown when trend analysis fails
 */
export class TrendAnalysisError extends HistoricalPriceError {
  constructor(message: string, originalError?: Error) {
    super(message, 'TREND_ANALYSIS_ERROR', originalError);
  }
}
