/**
 * Comparison Engine Utilities
 *
 * Utility functions for working with comparison results and configurations.
 */

import {
  ComparisonResult,
  ItemComparisonResults,
  ComparisonConfig,
} from './types';

/**
 * Format comparison results for display
 */
export function formatComparisonResults(
  results: ItemComparisonResults
): string {
  const { inventoryItem, results: comparisonResults, bestOffer } = results;

  let output = `Comparison Results for ${inventoryItem.name}\n`;
  output += `Strategy: ${results.metadata.strategyUsed}\n`;
  output += `Total Offers: ${results.metadata.totalOffers}\n`;
  output += `Execution Time: ${results.metadata.executionTimeMs}ms\n\n`;

  if (bestOffer) {
    output += `Best Offer:\n`;
    output += `  Supplier: ${bestOffer.offer.supplierNameSnapshot || 'Unknown'}\n`;
    output += `  Price: ${bestOffer.offer.currency} ${bestOffer.score.toFixed(4)}\n`;
    output += `  Score: ${bestOffer.score.toFixed(4)}\n`;
    if (bestOffer.metadata?.confidence) {
      output += `  Confidence: ${(bestOffer.metadata.confidence * 100).toFixed(1)}%\n`;
    }
    output += `\n`;
  }

  output += `All Offers (sorted by score):\n`;
  comparisonResults.forEach((result, index) => {
    const supplier = result.offer.supplierNameSnapshot || 'Unknown';
    const price = result.offer.currency + ' ' + result.score.toFixed(4);
    const flags = result.metadata?.flags?.join(', ') || 'none';

    output += `  ${index + 1}. ${supplier}: ${price} (flags: ${flags})\n`;
  });

  return output;
}

/**
 * Calculate price difference between offers
 */
export function calculatePriceDifference(
  offer1: ComparisonResult,
  offer2: ComparisonResult
): {
  absolute: number;
  percentage: number;
  cheaper: ComparisonResult;
  moreExpensive: ComparisonResult;
} {
  const diff = Math.abs(offer1.score - offer2.score);
  const percentage = (diff / Math.min(offer1.score, offer2.score)) * 100;

  const cheaper = offer1.score < offer2.score ? offer1 : offer2;
  const moreExpensive = offer1.score < offer2.score ? offer2 : offer1;

  return {
    absolute: diff,
    percentage,
    cheaper,
    moreExpensive,
  };
}

/**
 * Filter comparison results by criteria
 */
export function filterComparisonResults(
  results: ComparisonResult[],
  criteria: {
    minConfidence?: number;
    maxPrice?: number;
    minQualityRating?: number;
    includeFlags?: string[];
    excludeFlags?: string[];
    suppliers?: string[];
  }
): ComparisonResult[] {
  return results.filter(result => {
    // Confidence filter
    if (
      criteria.minConfidence &&
      (!result.metadata?.confidence ||
        result.metadata.confidence < criteria.minConfidence)
    ) {
      return false;
    }

    // Price filter
    if (criteria.maxPrice && result.score > criteria.maxPrice) {
      return false;
    }

    // Quality rating filter
    if (
      criteria.minQualityRating &&
      (!result.offer.qualityRating ||
        result.offer.qualityRating < criteria.minQualityRating)
    ) {
      return false;
    }

    // Flags filter
    const flags = result.metadata?.flags || [];
    if (
      criteria.includeFlags &&
      !criteria.includeFlags.some(flag => flags.includes(flag))
    ) {
      return false;
    }

    if (
      criteria.excludeFlags &&
      criteria.excludeFlags.some(flag => flags.includes(flag))
    ) {
      return false;
    }

    // Supplier filter
    if (
      criteria.suppliers &&
      !criteria.suppliers.includes(result.offer.supplierId)
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Group comparison results by supplier
 */
export function groupResultsBySupplier(
  results: ComparisonResult[]
): Map<string, ComparisonResult[]> {
  const grouped = new Map<string, ComparisonResult[]>();

  results.forEach(result => {
    const supplierId = result.offer.supplierId;
    if (!grouped.has(supplierId)) {
      grouped.set(supplierId, []);
    }
    grouped.get(supplierId)!.push(result);
  });

  return grouped;
}

/**
 * Calculate statistics for comparison results
 */
export function calculateComparisonStatistics(results: ComparisonResult[]): {
  count: number;
  averageScore: number;
  medianScore: number;
  minScore: number;
  maxScore: number;
  standardDeviation: number;
  priceRange: number;
  averageConfidence: number;
} {
  if (results.length === 0) {
    return {
      count: 0,
      averageScore: 0,
      medianScore: 0,
      minScore: 0,
      maxScore: 0,
      standardDeviation: 0,
      priceRange: 0,
      averageConfidence: 0,
    };
  }

  const scores = results.map(r => r.score);
  const confidences = results.map(r => r.metadata?.confidence || 0);

  // Sort scores for median calculation
  const sortedScores = [...scores].sort((a, b) => a - b);

  const count = results.length;
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / count;
  const medianScore =
    count % 2 === 0
      ? (sortedScores[count / 2 - 1] + sortedScores[count / 2]) / 2
      : sortedScores[Math.floor(count / 2)];
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const priceRange = maxScore - minScore;

  // Standard deviation
  const variance =
    scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) /
    count;
  const standardDeviation = Math.sqrt(variance);

  // Average confidence
  const averageConfidence =
    confidences.reduce((sum, conf) => sum + conf, 0) / count;

  return {
    count,
    averageScore,
    medianScore,
    minScore,
    maxScore,
    standardDeviation,
    priceRange,
    averageConfidence,
  };
}

/**
 * Validate comparison configuration
 */
export function validateComparisonConfig(config: ComparisonConfig): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!config.primaryStrategy) {
    errors.push('Primary strategy is required');
  }

  // Check global options
  if (config.globalOptions) {
    if (
      config.globalOptions.maxResults !== undefined &&
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

  // Check secondary strategies
  if (config.secondaryStrategies) {
    const totalWeight = config.secondaryStrategies.reduce(
      (sum, s) => sum + s.weight,
      0
    );
    if (totalWeight > 1) {
      warnings.push('Total weight of secondary strategies exceeds 1.0');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create a comparison configuration from a simple strategy name
 */
export function createSimpleConfig(strategyId: string): ComparisonConfig {
  return {
    primaryStrategy: strategyId,
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
 * Merge multiple comparison configurations
 */
export function mergeComparisonConfigs(
  base: ComparisonConfig,
  overrides: Partial<ComparisonConfig>
): ComparisonConfig {
  return {
    primaryStrategy: overrides.primaryStrategy || base.primaryStrategy,
    strategyOptions: overrides.strategyOptions 
      ? { ...base.strategyOptions, ...overrides.strategyOptions }
      : base.strategyOptions,
    secondaryStrategies:
      overrides.secondaryStrategies || base.secondaryStrategies,
    globalOptions: overrides.globalOptions 
      ? { ...base.globalOptions, ...overrides.globalOptions }
      : base.globalOptions,
    contextOverrides: overrides.contextOverrides
      ? {
          ...base.contextOverrides,
          ...overrides.contextOverrides,
        }
      : base.contextOverrides,
    cacheConfig: base.cacheConfig && overrides.cacheConfig 
      ? { ...base.cacheConfig, ...overrides.cacheConfig }
      : overrides.cacheConfig || base.cacheConfig,
  };
}

/**
 * Get human-readable strategy description
 */
export function getStrategyDescription(strategyId: string): string {
  const descriptions: Record<string, string> = {
    pricePerCanonical:
      'Compare by price per canonical unit (most accurate for different quantities)',
    totalPrice: 'Compare by total price regardless of quantity',
    pricePerUnit: 'Compare by price per display unit (not canonical)',
    qualityAdjustedPrice: 'Adjust price based on quality rating',
    recentPrice: 'Prefer more recent price observations',
    supplierReliability: 'Factor in supplier reliability scores',
  };

  return descriptions[strategyId] || 'Unknown strategy';
}

/**
 * Check if a strategy is suitable for a given use case
 */
export function isStrategySuitable(
  strategyId: string,
  useCase: 'price' | 'quality' | 'bulk' | 'recent' | 'reliability'
): boolean {
  const suitability: Record<string, string[]> = {
    pricePerCanonical: ['price', 'bulk'],
    totalPrice: ['price'],
    pricePerUnit: ['price'],
    qualityAdjustedPrice: ['price', 'quality'],
    recentPrice: ['recent'],
    supplierReliability: ['reliability'],
  };

  return suitability[strategyId]?.includes(useCase) || false;
}
