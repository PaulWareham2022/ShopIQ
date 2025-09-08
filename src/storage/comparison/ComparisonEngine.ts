/**
 * Comparison Engine Implementation
 *
 * Main orchestrator for the comparison system that manages strategies,
 * configurations, and provides the primary API for comparing offers.
 */

import {
  ComparisonEngine as IComparisonEngine,
  ComparisonConfig,
  ItemComparisonResults,
  StrategyInfo,
  ValidationResult,
  ComparisonError,
  InvalidConfigError,
  StrategyNotFoundError,
} from './types';
import { Comparator } from './types';
// import { BaseComparator } from './BaseComparator'; // Not used in this file
import { Offer, InventoryItem, Supplier } from '../types';
import { RepositoryFactory } from '../RepositoryFactory';

// Import concrete comparators
import {
  PricePerCanonicalComparator,
  TotalPriceComparator,
  PricePerUnitComparator,
  QualityAdjustedPriceComparator,
} from './strategies/PriceComparators';
import { HistoricalPriceComparator } from './strategies/HistoricalPriceComparator';

/**
 * Main comparison engine implementation
 */
export class ComparisonEngine implements IComparisonEngine {
  private comparators: Map<string, Comparator> = new Map();
  private repositoryFactory: RepositoryFactory;
  private cache: Map<string, ItemComparisonResults> = new Map();
  private cacheConfig: {
    enabled: boolean;
    ttlSeconds: number;
    maxSize: number;
  } = {
    enabled: true,
    ttlSeconds: 300, // 5 minutes
    maxSize: 100,
  };

  constructor(repositoryFactory: RepositoryFactory) {
    this.repositoryFactory = repositoryFactory;
    this.initializeComparators();
  }

  /**
   * Initialize all available comparators
   */
  private initializeComparators(): void {
    const comparators: Comparator[] = [
      new PricePerCanonicalComparator(),
      new TotalPriceComparator(),
      new PricePerUnitComparator(),
      new QualityAdjustedPriceComparator(),
      new HistoricalPriceComparator(this.repositoryFactory),
    ];

    comparators.forEach(comparator => {
      this.comparators.set(comparator.id, comparator);
    });
  }

  /**
   * Compare offers for a specific inventory item
   */
  async compareOffers(
    inventoryItemId: string,
    config: ComparisonConfig
  ): Promise<ItemComparisonResults> {
    const startTime = Date.now();

    try {
      // Validate configuration
      const validationResult = this.validateConfig(config);
      if (!validationResult.isValid) {
        throw new InvalidConfigError(
          validationResult.error || 'Invalid configuration'
        );
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(inventoryItemId, config);
      if (this.cacheConfig.enabled && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        // Check if cache is still valid
        if (this.isCacheValid(cached)) {
          return cached;
        } else {
          this.cache.delete(cacheKey);
        }
      }

      // Load data
      const [inventoryItem, offers, suppliers] = await Promise.all([
        this.loadInventoryItem(inventoryItemId),
        this.loadOffers(inventoryItemId, config.globalOptions),
        this.loadSuppliers(),
      ]);

      if (!inventoryItem) {
        throw new ComparisonError(
          `Inventory item ${inventoryItemId} not found`,
          'ITEM_NOT_FOUND'
        );
      }

      if (offers.length === 0) {
        return this.createEmptyResults(inventoryItem, config, startTime);
      }

      // Get the primary comparator
      const comparator = this.getComparator(config.primaryStrategy);

      // Perform comparisons
      const results = await this.performComparisons(
        offers,
        inventoryItem,
        suppliers,
        comparator,
        config
      );

      // Sort results
      const sortedResults = this.sortResults(
        results,
        config.globalOptions?.sortDirection || 'asc'
      );

      // Create final results
      const finalResults: ItemComparisonResults = {
        inventoryItem,
        results: sortedResults,
        bestOffer: sortedResults.length > 0 ? sortedResults[0] : null,
        config,
        metadata: {
          totalOffers: offers.length,
          excludedOffers: 0, // TODO: Track excluded offers
          executionTimeMs: Date.now() - startTime,
          strategyUsed: config.primaryStrategy,
          comparedAt: new Date().toISOString(),
        },
      };

      // Cache results
      if (this.cacheConfig.enabled) {
        this.cacheResult(cacheKey, finalResults);
      }

      return finalResults;
    } catch (error) {
      if (error instanceof ComparisonError) {
        throw error;
      }
      throw new ComparisonError(
        `Error comparing offers for item ${inventoryItemId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'COMPARISON_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Compare offers for multiple inventory items
   */
  async compareMultipleItems(
    inventoryItemIds: string[],
    config: ComparisonConfig
  ): Promise<Map<string, ItemComparisonResults>> {
    const results = new Map<string, ItemComparisonResults>();

    // Process items in parallel for better performance
    const promises = inventoryItemIds.map(async id => {
      try {
        const result = await this.compareOffers(id, config);
        return { id, result };
      } catch (error) {
        console.error(`Error comparing item ${id}:`, error);
        return { id, error };
      }
    });

    const resolved = await Promise.all(promises);

    resolved.forEach(({ id, result, error }) => {
      if (error) {
        // Create error result
        results.set(id, {
          inventoryItem: { id } as InventoryItem, // Minimal item for error case
          results: [],
          bestOffer: null,
          config,
          metadata: {
            totalOffers: 0,
            excludedOffers: 0,
            executionTimeMs: 0,
            strategyUsed: config.primaryStrategy,
            comparedAt: new Date().toISOString(),
          },
        });
      } else if (result) {
        results.set(id, result);
      }
    });

    return results;
  }

  /**
   * Get available comparison strategies
   */
  getAvailableStrategies(): StrategyInfo[] {
    return Array.from(this.comparators.values()).map(comparator => ({
      id: comparator.id,
      name: comparator.name,
      description: comparator.description,
      version: comparator.version,
      options: this.getStrategyOptions(comparator),
      supportsComposite: this.supportsComposite(comparator),
      dependencies: this.getStrategyDependencies(comparator),
    }));
  }

  /**
   * Validate a comparison configuration
   */
  validateConfig(config: ComparisonConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate primary strategy
    if (!config.primaryStrategy) {
      errors.push('Primary strategy is required');
    } else if (!this.comparators.has(config.primaryStrategy)) {
      errors.push(`Primary strategy '${config.primaryStrategy}' not found`);
    }

    // Validate secondary strategies
    if (config.secondaryStrategies) {
      config.secondaryStrategies.forEach((secondary, index) => {
        if (!this.comparators.has(secondary.strategy)) {
          errors.push(
            `Secondary strategy '${secondary.strategy}' at index ${index} not found`
          );
        }
        if (secondary.weight < 0 || secondary.weight > 1) {
          errors.push(
            `Secondary strategy weight at index ${index} must be between 0 and 1`
          );
        }
      });
    }

    // Validate global options
    if (config.globalOptions) {
      if (
        config.globalOptions.maxResults &&
        config.globalOptions.maxResults < 1
      ) {
        errors.push('maxResults must be at least 1');
      }
      if (
        config.globalOptions.minConfidence &&
        (config.globalOptions.minConfidence < 0 ||
          config.globalOptions.minConfidence > 1)
      ) {
        errors.push('minConfidence must be between 0 and 1');
      }
    }

    // Validate strategy options
    if (
      config.primaryStrategy &&
      this.comparators.has(config.primaryStrategy)
    ) {
      const comparator = this.comparators.get(config.primaryStrategy)!;
      const strategyValidation = comparator.validateOptions(
        config.strategyOptions
      );
      if (!strategyValidation.isValid) {
        errors.push(`Primary strategy options: ${strategyValidation.error}`);
      }
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Get default configuration for a strategy
   */
  getDefaultConfig(strategyId: string): ComparisonConfig {
    const comparator = this.getComparator(strategyId);

    return {
      primaryStrategy: strategyId,
      strategyOptions: comparator.getDefaultOptions(),
      globalOptions: {
        includeDeleted: false,
        maxResults: 50,
        sortDirection: 'asc',
        minConfidence: 0.5,
        includeIncomplete: true,
        applyEquivalenceFactors: true,
      },
    };
  }

  /**
   * Get a comparator by ID
   */
  private getComparator(strategyId: string): Comparator {
    const comparator = this.comparators.get(strategyId);
    if (!comparator) {
      throw new StrategyNotFoundError(strategyId);
    }
    return comparator;
  }

  /**
   * Load inventory item from repository
   */
  private async loadInventoryItem(
    inventoryItemId: string
  ): Promise<InventoryItem | null> {
    const inventoryRepo =
      await this.repositoryFactory.getInventoryItemRepository();
    return await inventoryRepo.findById(inventoryItemId);
  }

  /**
   * Load offers for an inventory item
   */
  private async loadOffers(
    inventoryItemId: string,
    globalOptions?: any
  ): Promise<Offer[]> {
    const offerRepo = await this.repositoryFactory.getOfferRepository();
    const options = {
      includeDeleted: globalOptions?.includeDeleted || false,
      orderBy: 'observed_at',
      orderDirection: 'DESC' as const,
    };

    return await offerRepo.findWhere(
      { inventoryItemId: inventoryItemId },
      options
    );
  }

  /**
   * Load all suppliers
   */
  private async loadSuppliers(): Promise<Map<string, Supplier>> {
    const supplierRepo = await this.repositoryFactory.getSupplierRepository();
    const suppliers = await supplierRepo.findAll();

    const supplierMap = new Map<string, Supplier>();
    suppliers.forEach(supplier => {
      supplierMap.set(supplier.id, supplier);
    });

    return supplierMap;
  }

  /**
   * Perform comparisons for all offers
   */
  private async performComparisons(
    offers: Offer[],
    inventoryItem: InventoryItem,
    suppliers: Map<string, Supplier>,
    comparator: Comparator,
    config: ComparisonConfig
  ): Promise<any[]> {
    const promises = offers.map(offer =>
      comparator.compare(
        offer,
        offers,
        inventoryItem,
        suppliers,
        config.strategyOptions
      )
    );

    return await Promise.all(promises);
  }

  /**
   * Sort comparison results
   */
  private sortResults(results: any[], sortDirection: 'asc' | 'desc'): any[] {
    return results.sort((a, b) => {
      const comparison = a.score - b.score;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Create empty results for items with no offers
   */
  private createEmptyResults(
    inventoryItem: InventoryItem,
    config: ComparisonConfig,
    startTime: number
  ): ItemComparisonResults {
    return {
      inventoryItem,
      results: [],
      bestOffer: null,
      config,
      metadata: {
        totalOffers: 0,
        excludedOffers: 0,
        executionTimeMs: Date.now() - startTime,
        strategyUsed: config.primaryStrategy,
        comparedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Generate cache key for results
   */
  private generateCacheKey(
    inventoryItemId: string,
    config: ComparisonConfig
  ): string {
    const configHash = JSON.stringify(config);
    // Simple hash-based key generation for caching
    const hash = this.simpleHash(configHash);
    return `${inventoryItemId}:${hash}`;
  }

  /**
   * Simple hash function for cache key generation
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if cached results are still valid
   */
  private isCacheValid(cached: ItemComparisonResults): boolean {
    const age = Date.now() - new Date(cached.metadata.comparedAt).getTime();
    return age < this.cacheConfig.ttlSeconds * 1000;
  }

  /**
   * Cache comparison results
   */
  private cacheResult(key: string, results: ItemComparisonResults): void {
    // Implement simple LRU cache
    if (this.cache.size >= this.cacheConfig.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, results);
  }

  /**
   * Get strategy options schema
   */
  private getStrategyOptions(_comparator: Comparator): Record<string, any> {
    // This would be implemented based on the specific comparator
    // For now, return empty object
    return {};
  }

  /**
   * Check if strategy supports composite comparisons
   */
  private supportsComposite(_comparator: Comparator): boolean {
    // Most strategies support composite comparisons
    return true;
  }

  /**
   * Get strategy dependencies
   */
  private getStrategyDependencies(_comparator: Comparator): string[] {
    // Most strategies don't have dependencies
    return [];
  }
}
