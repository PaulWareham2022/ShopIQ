/**
 * Historical Price-Based Comparison Strategy
 *
 * Compares offers based on historical price trends, considering price stability,
 * volatility, and trend direction to provide more informed comparisons.
 */

import { BaseComparator } from '../BaseComparator';
import {
  ComparisonResult,
  ValidationResult,
  Offer,
  InventoryItem,
  Supplier,
} from '../types';
import { HistoricalPriceComparatorOptions } from '../types/historical-prices';
import { HistoricalPriceService } from '../../services/HistoricalPriceService';
import { RepositoryFactory } from '../../RepositoryFactory';

/**
 * Compares offers based on historical price trends and stability
 */
export class HistoricalPriceComparator extends BaseComparator {
  readonly id = 'historicalPrice';
  readonly name = 'Historical Price Trend';
  readonly description =
    'Compares offers based on historical price trends, stability, and volatility';
  readonly version = '1.0.0';

  private historicalPriceService: HistoricalPriceService | null = null;
  private repositoryFactory: RepositoryFactory;

  constructor(repositoryFactory: RepositoryFactory) {
    super();
    this.repositoryFactory = repositoryFactory;
  }

  /**
   * Get the historical price service
   */
  private async getHistoricalPriceService(): Promise<HistoricalPriceService> {
    if (!this.historicalPriceService) {
      this.historicalPriceService = new HistoricalPriceService(this.repositoryFactory);
    }
    return this.historicalPriceService;
  }

  protected async performComparison(
    offer: Offer,
    allOffers: Offer[],
    inventoryItem: InventoryItem,
    suppliers: Map<string, Supplier>,
    options: HistoricalPriceComparatorOptions
  ): Promise<ComparisonResult> {
    try {
      const historicalPriceService = await this.getHistoricalPriceService();

      // Get historical price data for this inventory item
      const [priceTrend, priceStatistics, bestHistoricalPrice] = await Promise.all([
        historicalPriceService.getPriceTrend(offer.inventoryItemId, {
          period: options.historicalPeriod,
          supplierId: offer.supplierId,
        }),
        historicalPriceService.getPriceStatistics(
          offer.inventoryItemId,
          options.historicalPeriod,
          offer.supplierId
        ),
        historicalPriceService.getBestHistoricalPrice(
          offer.inventoryItemId,
          options.historicalPeriod,
          offer.supplierId
        ),
      ]);

      // Calculate base score from current price
      const currentPrice = offer.effectivePricePerCanonical;
      let score = currentPrice * options.currentPriceWeight;

      // Apply historical trend adjustments
      if (priceTrend && priceStatistics) {
        const trendAdjustment = this.calculateTrendAdjustment(
          currentPrice,
          priceTrend,
          priceStatistics,
          options
        );
        score += trendAdjustment * options.trendWeight;
      }

      // Apply stability bonus/penalty
      if (priceStatistics && options.preferStablePrices) {
        const stabilityAdjustment = this.calculateStabilityAdjustment(
          currentPrice,
          priceStatistics,
          options
        );
        score += stabilityAdjustment;
      }

      // Apply best historical price comparison
      if (bestHistoricalPrice && options.useBestHistoricalPrice) {
        const bestPriceAdjustment = this.calculateBestPriceAdjustment(
          currentPrice,
          bestHistoricalPrice.price,
          options
        );
        score += bestPriceAdjustment;
      }

      // Generate metadata
      const metadata = this.generateComparisonMetadata(
        offer,
        priceTrend,
        priceStatistics,
        bestHistoricalPrice,
        options
      );

      return this.createResult(offer, score, metadata);
    } catch (error) {
      // If historical data is not available, fall back to basic price comparison
      console.warn('Historical price comparison failed, falling back to basic comparison:', error);
      
      return this.createResult(offer, offer.effectivePricePerCanonical, {
        scoreBreakdown: {
          currentPrice: offer.effectivePricePerCanonical,
          historicalData: 0,
          fallback: 1,
        },
        flags: ['no-historical-data', 'fallback-comparison'],
        explanation: 'Historical price data not available, using current price only',
        confidence: 0.3,
      });
    }
  }

  /**
   * Calculate trend-based price adjustment
   */
  private calculateTrendAdjustment(
    currentPrice: number,
    trend: any,
    statistics: any,
    options: HistoricalPriceComparatorOptions
  ): number {
    let adjustment = 0;

    // Trend direction adjustment
    switch (trend.direction) {
      case 'down':
        // Favor offers when prices are trending down
        adjustment -= currentPrice * 0.1 * trend.strength;
        break;
      case 'up':
        // Penalize offers when prices are trending up
        adjustment += currentPrice * 0.1 * trend.strength;
        break;
      case 'stable':
        // Neutral for stable prices
        break;
      case 'volatile':
        // Penalize volatile prices more heavily
        adjustment += currentPrice * 0.15 * trend.strength;
        break;
    }

    // Volatility adjustment
    if (options.considerVolatility && statistics.volatility > options.maxVolatility) {
      const volatilityPenalty = currentPrice * (statistics.volatility - options.maxVolatility) * 0.2;
      adjustment += volatilityPenalty;
    }

    return adjustment;
  }

  /**
   * Calculate stability-based adjustment
   */
  private calculateStabilityAdjustment(
    currentPrice: number,
    statistics: any,
    options: HistoricalPriceComparatorOptions
  ): number {
    if (!options.preferStablePrices) {
      return 0;
    }

    // Reward stable prices (low volatility)
    const stabilityBonus = currentPrice * (1 - statistics.volatility) * 0.05;
    return -stabilityBonus; // Negative because lower scores are better
  }

  /**
   * Calculate best historical price adjustment
   */
  private calculateBestPriceAdjustment(
    currentPrice: number,
    bestHistoricalPrice: number,
    options: HistoricalPriceComparatorOptions
  ): number {
    if (!options.useBestHistoricalPrice) {
      return 0;
    }

    // Calculate how much more expensive current price is compared to best historical
    const priceIncrease = (currentPrice - bestHistoricalPrice) / bestHistoricalPrice;
    
    // Penalize prices that are significantly higher than historical best
    if (priceIncrease > 0.2) { // More than 20% increase
      return currentPrice * priceIncrease * 0.1;
    }

    // Reward prices that are close to or better than historical best
    if (priceIncrease <= 0) {
      return -currentPrice * Math.abs(priceIncrease) * 0.05;
    }

    return 0;
  }

  /**
   * Generate comparison metadata
   */
  private generateComparisonMetadata(
    offer: Offer,
    trend: any,
    statistics: any,
    bestHistoricalPrice: any,
    options: HistoricalPriceComparatorOptions
  ): any {
    const metadata: any = {
      scoreBreakdown: {
        currentPrice: offer.effectivePricePerCanonical,
        trendAdjustment: 0,
        stabilityAdjustment: 0,
        bestPriceAdjustment: 0,
      },
      flags: [],
      explanation: '',
      confidence: 0.8,
    };

    // Add trend information
    if (trend) {
      metadata.scoreBreakdown.trendAdjustment = this.calculateTrendAdjustment(
        offer.effectivePricePerCanonical,
        trend,
        statistics,
        options
      );
      metadata.trend = {
        direction: trend.direction,
        strength: trend.strength,
        changePercentage: trend.changePercentage,
      };
      metadata.flags.push(`trend-${trend.direction}`);
    }

    // Add statistics information
    if (statistics) {
      metadata.statistics = {
        average: statistics.average,
        volatility: statistics.volatility,
        dataPointCount: statistics.count,
      };
      
      if (statistics.volatility > options.maxVolatility) {
        metadata.flags.push('high-volatility');
      }
    }

    // Add best historical price information
    if (bestHistoricalPrice) {
      const priceIncrease = (offer.effectivePricePerCanonical - bestHistoricalPrice.price) / bestHistoricalPrice.price;
      metadata.bestHistoricalPrice = {
        price: bestHistoricalPrice.price,
        observedAt: bestHistoricalPrice.observedAt,
        priceIncrease: priceIncrease * 100,
      };
      
      if (priceIncrease > 0.2) {
        metadata.flags.push('above-historical-best');
      } else if (priceIncrease <= 0) {
        metadata.flags.push('at-or-below-historical-best');
      }
    }

    // Generate explanation
    metadata.explanation = this.generateExplanation(offer, metadata, options);

    return metadata;
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    offer: Offer,
    metadata: any,
    options: HistoricalPriceComparatorOptions
  ): string {
    const parts: string[] = [];
    
    parts.push(`Current price: ${offer.effectivePricePerCanonical.toFixed(4)} per ${offer.amountUnit}`);

    if (metadata.trend) {
      const trend = metadata.trend;
      parts.push(`Price trend: ${trend.direction} (${trend.changePercentage.toFixed(1)}% change)`);
    }

    if (metadata.statistics) {
      const stats = metadata.statistics;
      parts.push(`Average price: ${stats.average.toFixed(4)} (${stats.dataPointCount} data points)`);
      
      if (stats.volatility > options.maxVolatility) {
        parts.push(`High volatility: ${(stats.volatility * 100).toFixed(1)}%`);
      }
    }

    if (metadata.bestHistoricalPrice) {
      const best = metadata.bestHistoricalPrice;
      if (best.priceIncrease > 0) {
        parts.push(`Above historical best by ${best.priceIncrease.toFixed(1)}%`);
      } else {
        parts.push(`At or below historical best price`);
      }
    }

    return parts.join('; ');
  }

  validateOptions(options?: Record<string, any>): ValidationResult {
    const defaultOptions = this.getDefaultOptions();
    const normalizedOptions = { ...defaultOptions, ...options };

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate historical period
    const validPeriods = ['1d', '7d', '30d', '90d', '1y', 'all'];
    if (!validPeriods.includes(normalizedOptions.historicalPeriod)) {
      errors.push(`historicalPeriod must be one of: ${validPeriods.join(', ')}`);
    }

    // Validate weights
    if (normalizedOptions.trendWeight < 0 || normalizedOptions.trendWeight > 1) {
      errors.push('trendWeight must be between 0 and 1');
    }

    if (normalizedOptions.currentPriceWeight < 0 || normalizedOptions.currentPriceWeight > 1) {
      errors.push('currentPriceWeight must be between 0 and 1');
    }

    // Validate weights sum
    const totalWeight = normalizedOptions.trendWeight + normalizedOptions.currentPriceWeight;
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      warnings.push('trendWeight and currentPriceWeight should sum to 1.0');
    }

    // Validate volatility threshold
    if (normalizedOptions.maxVolatility < 0 || normalizedOptions.maxVolatility > 1) {
      errors.push('maxVolatility must be between 0 and 1');
    }

    // Validate minimum data points
    if (normalizedOptions.minHistoricalDataPoints < 1) {
      errors.push('minHistoricalDataPoints must be at least 1');
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      normalizedOptions,
    };
  }

  getDefaultOptions(): HistoricalPriceComparatorOptions {
    return {
      historicalPeriod: '30d',
      trendWeight: 0.3,
      currentPriceWeight: 0.7,
      preferStablePrices: true,
      considerVolatility: true,
      maxVolatility: 0.2,
      useBestHistoricalPrice: true,
      minHistoricalDataPoints: 3,
    };
  }
}
