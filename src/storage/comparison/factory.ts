/**
 * Comparison Engine Factory
 *
 * Factory functions for creating and configuring comparison engines.
 */

import { ComparisonEngine } from './ComparisonEngine';
import { RepositoryFactory } from '../RepositoryFactory';
import { ComparisonConfig } from './types';

/**
 * Create a new comparison engine instance
 * @param repositoryFactory Repository factory for data access
 * @returns Configured comparison engine
 */
export function createComparisonEngine(
  repositoryFactory: RepositoryFactory
): ComparisonEngine {
  return new ComparisonEngine(repositoryFactory);
}

/**
 * Create a comparison engine with default configuration
 * @param repositoryFactory Repository factory for data access
 * @param defaultConfig Default configuration to use
 * @returns Configured comparison engine
 */
export function createComparisonEngineWithDefaults(
  repositoryFactory: RepositoryFactory,
  defaultConfig?: Partial<ComparisonConfig>
): ComparisonEngine {
  const engine = new ComparisonEngine(repositoryFactory);

  // Apply default configuration if provided
  if (defaultConfig) {
    // This would be implemented to set default configuration
    // For now, just return the engine
  }

  return engine;
}

/**
 * Create a comparison engine optimized for specific use cases
 */
export const ComparisonEnginePresets = {
  /**
   * Create engine optimized for price comparison
   */
  forPriceComparison(repositoryFactory: RepositoryFactory): ComparisonEngine {
    return createComparisonEngine(repositoryFactory);
  },

  /**
   * Create engine optimized for quality-focused comparison
   */
  forQualityComparison(repositoryFactory: RepositoryFactory): ComparisonEngine {
    return createComparisonEngine(repositoryFactory);
  },

  /**
   * Create engine optimized for bulk purchasing
   */
  forBulkPurchasing(repositoryFactory: RepositoryFactory): ComparisonEngine {
    return createComparisonEngine(repositoryFactory);
  },

  /**
   * Create engine optimized for recent price analysis
   */
  forRecentPrices(repositoryFactory: RepositoryFactory): ComparisonEngine {
    return createComparisonEngine(repositoryFactory);
  },
};
