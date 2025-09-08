/**
 * Comparison Engine Types
 *
 * This file defines the core types and interfaces for the comparison engine,
 * including comparators, configurations, and results.
 */

import { Offer, InventoryItem, Supplier } from '../types';

// =============================================================================
// CORE COMPARATOR INTERFACES
// =============================================================================

/**
 * Comparison result for a single offer
 */
export interface ComparisonResult {
  /** The offer being compared */
  offer: Offer;

  /** The computed comparison score (lower is better for price-based comparisons) */
  score: number;

  /** Additional metadata about the comparison */
  metadata?: {
    /** Strategy-specific breakdown of the score */
    scoreBreakdown?: Record<string, number>;

    /** Human-readable explanation of the comparison */
    explanation?: string;

    /** Flags indicating special conditions */
    flags?: string[];

    /** Confidence level in the comparison (0-1) */
    confidence?: number;

    /** Historical price trend data (for HistoricalPriceComparator) */
    trend?: {
      direction: 'up' | 'down' | 'stable';
      strength: number;
      confidence: number;
    };

    /** Price statistics (for HistoricalPriceComparator) */
    statistics?: {
      min: number;
      max: number;
      average: number;
      median: number;
      standardDeviation: number;
      volatility: number;
    };

    /** Best historical price (for HistoricalPriceComparator) */
    bestHistoricalPrice?: {
      price: number;
      date: string;
      supplier: string;
    };
  };
}

/**
 * Complete comparison results for an inventory item
 */
export interface ItemComparisonResults {
  /** The inventory item being compared */
  inventoryItem: InventoryItem;

  /** All offers sorted by comparison score */
  results: ComparisonResult[];

  /** The best offer according to the comparison */
  bestOffer: ComparisonResult | null;

  /** Comparison configuration used */
  config: ComparisonConfig;

  /** Metadata about the comparison process */
  metadata: {
    /** Number of offers compared */
    totalOffers: number;

    /** Number of offers excluded (e.g., deleted, invalid) */
    excludedOffers: number;

    /** Comparison execution time in milliseconds */
    executionTimeMs: number;

    /** Strategy used for comparison */
    strategyUsed: string;

    /** Timestamp when comparison was performed */
    comparedAt: string;
  };
}

/**
 * Base interface for all comparison strategies
 */
export interface Comparator {
  /** Unique identifier for this comparator */
  readonly id: string;

  /** Human-readable name for this comparator */
  readonly name: string;

  /** Description of what this comparator does */
  readonly description: string;

  /** Version of this comparator implementation */
  readonly version: string;

  /**
   * Compare a single offer against others
   * @param offer The offer to compare
   * @param allOffers All offers for the same inventory item
   * @param inventoryItem The inventory item being compared
   * @param suppliers Map of supplier IDs to supplier objects
   * @param options Strategy-specific options
   * @returns Comparison result for the offer
   */
  compare(
    offer: Offer,
    allOffers: Offer[],
    inventoryItem: InventoryItem,
    suppliers: Map<string, Supplier>,
    options?: Record<string, any>
  ): Promise<ComparisonResult>;

  /**
   * Validate that the provided options are valid for this comparator
   * @param options Options to validate
   * @returns Validation result
   */
  validateOptions(options?: Record<string, any>): ValidationResult;

  /**
   * Get default options for this comparator
   * @returns Default options
   */
  getDefaultOptions(): Record<string, any>;
}

/**
 * Validation result for comparator options
 */
export interface ValidationResult {
  /** Whether the options are valid */
  isValid: boolean;

  /** Error message if validation failed */
  error?: string;

  /** Warnings about the options */
  warnings?: string[];

  /** Normalized options (with defaults applied) */
  normalizedOptions?: Record<string, any>;
}

// =============================================================================
// COMPARISON CONFIGURATION
// =============================================================================

/**
 * Configuration for the comparison engine
 */
export interface ComparisonConfig {
  /** Primary comparison strategy to use */
  primaryStrategy: string;

  /** Options specific to the primary strategy */
  strategyOptions?: Record<string, any>;

  /** Secondary strategies for composite comparisons */
  secondaryStrategies?: SecondaryStrategy[];

  /** Global options that apply to all comparisons */
  globalOptions?: GlobalComparisonOptions;

  /** Context-specific configuration overrides */
  contextOverrides?: Record<string, Partial<ComparisonConfig>>;

  /** Cache configuration */
  cacheConfig?: CacheConfig;
}

/**
 * Secondary strategy configuration for composite comparisons
 */
export interface SecondaryStrategy {
  /** Strategy identifier */
  strategy: string;

  /** Weight of this strategy in the composite score */
  weight: number;

  /** Strategy-specific options */
  options?: Record<string, any>;
}

/**
 * Global options for all comparisons
 */
export interface GlobalComparisonOptions {
  /** Whether to include soft-deleted offers */
  includeDeleted?: boolean;

  /** Maximum number of results to return */
  maxResults?: number;

  /** Sort direction for results */
  sortDirection?: 'asc' | 'desc';

  /** Minimum confidence threshold for results */
  minConfidence?: number;

  /** Whether to include offers with missing data */
  includeIncomplete?: boolean;

  /** Currency for price comparisons (if different from offer currency) */
  targetCurrency?: string;

  /** Whether to apply equivalence factors from inventory items */
  applyEquivalenceFactors?: boolean;
}

/**
 * Cache configuration for comparison results
 */
export interface CacheConfig {
  /** Whether to enable caching */
  enabled: boolean;

  /** Cache TTL in seconds */
  ttlSeconds?: number;

  /** Maximum cache size */
  maxSize?: number;

  /** Cache key generation strategy */
  keyStrategy?: 'config' | 'config+data' | 'custom';
}

// =============================================================================
// STRATEGY-SPECIFIC OPTIONS
// =============================================================================

/**
 * Options for price-based comparators
 */
export interface PriceComparatorOptions {
  /** Whether to include shipping costs */
  includeShipping?: boolean;

  /** Whether to include tax costs */
  includeTax?: boolean;

  /** Whether to use effective price (includes tax and shipping) */
  useEffectivePrice?: boolean;

  /** Whether to use canonical unit pricing */
  useCanonicalUnit?: boolean;

  /** Currency conversion rate (if needed) */
  currencyRate?: number;
}

/**
 * Options for quality-based comparators
 */
export interface QualityComparatorOptions {
  /** Weight of quality in the comparison */
  qualityWeight?: number;

  /** Weight of price in the comparison */
  priceWeight?: number;

  /** Factor for quality adjustments */
  qualityAdjustmentFactor?: number;

  /** Whether to prefer higher quality ratings */
  preferHigher?: boolean;

  /** Minimum quality rating to consider */
  minQualityRating?: number;
}

/**
 * Options for temporal comparators
 */
export interface TemporalComparatorOptions {
  /** Maximum age of offers in days */
  maxAgeDays?: number;

  /** Decay factor for older offers */
  decayFactor?: number;

  /** Trend analysis window in days */
  trendWindowDays?: number;

  /** Weight of trend analysis */
  trendWeight?: number;

  /** Whether to prefer more recent offers */
  preferRecent?: boolean;
}

/**
 * Options for supplier-based comparators
 */
export interface SupplierComparatorOptions {
  /** Weight of supplier reliability */
  reliabilityWeight?: number;

  /** Supplier reliability scores */
  supplierScores?: Record<string, number>;

  /** Penalty for membership requirements */
  membershipPenalty?: number;

  /** Whether to consider membership value */
  considerMembershipValue?: boolean;

  /** Preferred suppliers (higher priority) */
  preferredSuppliers?: string[];
}

/**
 * Options for composite comparators
 */
export interface CompositeComparatorOptions {
  /** Strategies to combine */
  strategies: Array<{
    strategy: string;
    weight: number;
    options?: Record<string, any>;
  }>;

  /** Method for combining scores */
  combinationMethod?: 'weighted' | 'ranked' | 'normalized';

  /** Whether to normalize scores before combining */
  normalizeScores?: boolean;
}

// =============================================================================
// COMPARISON ENGINE INTERFACE
// =============================================================================

/**
 * Main interface for the comparison engine
 */
export interface ComparisonEngine {
  /**
   * Compare offers for a specific inventory item
   * @param inventoryItemId ID of the inventory item
   * @param config Comparison configuration
   * @returns Comparison results
   */
  compareOffers(
    inventoryItemId: string,
    config: ComparisonConfig
  ): Promise<ItemComparisonResults>;

  /**
   * Compare offers for multiple inventory items
   * @param inventoryItemIds Array of inventory item IDs
   * @param config Comparison configuration
   * @returns Map of inventory item ID to comparison results
   */
  compareMultipleItems(
    inventoryItemIds: string[],
    config: ComparisonConfig
  ): Promise<Map<string, ItemComparisonResults>>;

  /**
   * Get available comparison strategies
   * @returns Array of available strategy information
   */
  getAvailableStrategies(): StrategyInfo[];

  /**
   * Validate a comparison configuration
   * @param config Configuration to validate
   * @returns Validation result
   */
  validateConfig(config: ComparisonConfig): ValidationResult;

  /**
   * Get default configuration for a strategy
   * @param strategyId Strategy identifier
   * @returns Default configuration
   */
  getDefaultConfig(strategyId: string): ComparisonConfig;
}

/**
 * Information about an available comparison strategy
 */
export interface StrategyInfo {
  /** Unique identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description */
  description: string;

  /** Version */
  version: string;

  /** Available options and their types */
  options?: Record<
    string,
    {
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      required?: boolean;
      default?: any;
      description?: string;
      min?: number;
      max?: number;
      enum?: any[];
    }
  >;

  /** Whether this strategy supports composite comparisons */
  supportsComposite?: boolean;

  /** Dependencies on other strategies */
  dependencies?: string[];
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Error thrown by the comparison engine
 */
export class ComparisonError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ComparisonError';
  }
}

/**
 * Error thrown when a comparison strategy is not found
 */
export class StrategyNotFoundError extends ComparisonError {
  constructor(strategyId: string) {
    super(
      `Comparison strategy '${strategyId}' not found`,
      'STRATEGY_NOT_FOUND'
    );
  }
}

/**
 * Error thrown when comparison configuration is invalid
 */
export class InvalidConfigError extends ComparisonError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message, 'INVALID_CONFIG');
  }
}

/**
 * Error thrown when comparison data is invalid
 */
export class InvalidDataError extends ComparisonError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message, 'INVALID_DATA');
  }
}
