/**
 * Historical Price Tracking Service
 *
 * High-level service for managing historical price data, including
 * automatic recording, trend analysis, and price statistics.
 */

import {
  HistoricalPrice,
  HistoricalPriceService as IHistoricalPriceService,
  HistoricalPriceQueryOptions,
  TrendAnalysisOptions,
  PriceTrend,
  PriceStatistics,
  TimePeriod,
  HistoricalPriceSource,
  HistoricalPriceMetadata,
} from '../types/historical-prices';
import { HistoricalPriceRepository } from '../repositories/HistoricalPriceRepository';
import { RepositoryFactory } from '../RepositoryFactory';
import {
  analyzePriceTrend,
  calculatePriceStatistics,
  filterPricesByPeriod,
  getTimePeriodBoundaries,
} from '../comparison/trendAnalysis';
import { Offer, InventoryItem } from '../types';
import { getCurrentTimestamp } from '../utils/timestamp';

/**
 * Service for managing historical price data
 */
export class HistoricalPriceService implements IHistoricalPriceService {
  private repositoryFactory: RepositoryFactory;
  private historicalPriceRepository: HistoricalPriceRepository | null = null;

  constructor(repositoryFactory: RepositoryFactory) {
    this.repositoryFactory = repositoryFactory;
  }

  /**
   * Get the historical price repository
   */
  private async getRepository(): Promise<HistoricalPriceRepository> {
    if (!this.historicalPriceRepository) {
      this.historicalPriceRepository = await this.repositoryFactory.getHistoricalPriceRepository() as HistoricalPriceRepository;
    }
    return this.historicalPriceRepository;
  }

  /**
   * Record a new historical price
   */
  async recordPrice(
    price: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>
  ): Promise<HistoricalPrice> {
    const repository = await this.getRepository();
    return await repository.create(price);
  }

  /**
   * Record multiple historical prices
   */
  async recordPrices(
    prices: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<HistoricalPrice[]> {
    const repository = await this.getRepository();
    return await repository.createMany(prices);
  }

  /**
   * Record historical price from an offer
   */
  async recordPriceFromOffer(
    offer: Offer,
    inventoryItem: InventoryItem,
    options?: {
      includeShipping?: boolean;
      includeTax?: boolean;
      confidence?: number;
      notes?: string;
    }
  ): Promise<HistoricalPrice> {
    const price = offer.effectivePricePerCanonical;
    const metadata: HistoricalPriceMetadata = {
      originalOfferId: offer.id,
      confidence: options?.confidence || 0.8,
      includesShipping: options?.includeShipping ?? true,
      includesTax: options?.includeTax ?? true,
      qualityRating: offer.qualityRating,
      notes: options?.notes,
    };

    return await this.recordPrice({
      inventoryItemId: offer.inventoryItemId,
      supplierId: offer.supplierId,
      price,
      currency: offer.currency,
      unit: inventoryItem.canonicalUnit,
      quantity: offer.amountCanonical,
      observedAt: offer.observedAt,
      source: 'offer',
      metadata,
    });
  }

  /**
   * Record aggregated historical price (average across suppliers)
   */
  async recordAggregatedPrice(
    inventoryItemId: string,
    prices: Array<{ price: number; currency: string; observedAt: string }>,
    unit: string,
    quantity: number,
    options?: {
      confidence?: number;
      notes?: string;
    }
  ): Promise<HistoricalPrice> {
    if (prices.length === 0) {
      throw new Error('Cannot create aggregated price from empty price array');
    }

    // Calculate weighted average (assuming all prices are in same currency for now)
    const totalPrice = prices.reduce((sum, p) => sum + p.price, 0);
    const averagePrice = totalPrice / prices.length;

    // Use the most recent observation date
    const mostRecentDate = prices.reduce((latest, p) => 
      p.observedAt > latest ? p.observedAt : latest, prices[0].observedAt
    );

    const metadata: HistoricalPriceMetadata = {
      confidence: options?.confidence || 0.6,
      notes: options?.notes || `Aggregated from ${prices.length} sources`,
      tags: ['aggregated'],
    };

    return await this.recordPrice({
      inventoryItemId,
      supplierId: undefined, // No specific supplier for aggregated data
      price: averagePrice,
      currency: prices[0].currency, // Assume all same currency
      unit,
      quantity,
      observedAt: mostRecentDate,
      source: 'aggregated',
      metadata,
    });
  }

  /**
   * Get historical prices for an inventory item
   */
  async getHistoricalPrices(
    inventoryItemId: string,
    options?: HistoricalPriceQueryOptions
  ): Promise<HistoricalPrice[]> {
    const repository = await this.getRepository();
    return await repository.getHistoricalPricesForItem(inventoryItemId, {
      startDate: options?.startDate,
      endDate: options?.endDate,
      supplierId: options?.supplierId,
      source: options?.sources?.[0], // For now, just use first source
      limit: options?.limit,
      orderBy: options?.sortOrder === 'desc' ? 'observed_at' : 'observed_at',
      orderDirection: options?.sortOrder === 'desc' ? 'DESC' : 'ASC',
    });
  }

  /**
   * Get price trend for an inventory item
   */
  async getPriceTrend(
    inventoryItemId: string,
    options: TrendAnalysisOptions
  ): Promise<PriceTrend | null> {
    const repository = await this.getRepository();
    
    // Get time boundaries for the period
    const { startDate, endDate } = getTimePeriodBoundaries(options.period);
    
    // Get historical prices for the period
    const prices = await repository.getHistoricalPricesForItem(inventoryItemId, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      supplierId: options.supplierId,
      source: 'offer', // Focus on offer data for trends
    });

    // Filter by minimum data points if specified
    if (options.minDataPoints && prices.length < options.minDataPoints) {
      return null;
    }

    // Analyze the trend
    return analyzePriceTrend(prices, options);
  }

  /**
   * Get price statistics for an inventory item
   */
  async getPriceStatistics(
    inventoryItemId: string,
    period: TimePeriod,
    supplierId?: string
  ): Promise<PriceStatistics | null> {
    const repository = await this.getRepository();
    
    // Get time boundaries for the period
    const { startDate, endDate } = getTimePeriodBoundaries(period);
    
    // Get historical prices for the period
    const prices = await repository.getHistoricalPricesForItem(inventoryItemId, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      supplierId,
    });

    if (prices.length === 0) {
      return null;
    }

    return calculatePriceStatistics(prices, period);
  }

  /**
   * Get best historical price for an inventory item
   */
  async getBestHistoricalPrice(
    inventoryItemId: string,
    period?: TimePeriod,
    supplierId?: string
  ): Promise<HistoricalPrice | null> {
    const repository = await this.getRepository();
    
    let options: any = { supplierId };
    
    if (period) {
      const { startDate, endDate } = getTimePeriodBoundaries(period);
      options.startDate = startDate.toISOString();
      options.endDate = endDate.toISOString();
    }
    
    return await repository.getBestHistoricalPrice(inventoryItemId, options);
  }

  /**
   * Get price trend comparison across suppliers
   */
  async getSupplierPriceTrends(
    inventoryItemId: string,
    period: TimePeriod
  ): Promise<Map<string, PriceTrend>> {
    const repository = await this.getRepository();
    const { startDate, endDate } = getTimePeriodBoundaries(period);
    
    // Get all prices for the period
    const allPrices = await repository.getHistoricalPricesForItem(inventoryItemId, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Group by supplier
    const pricesBySupplier = new Map<string, HistoricalPrice[]>();
    allPrices.forEach(price => {
      const supplierId = price.supplierId || 'aggregated';
      if (!pricesBySupplier.has(supplierId)) {
        pricesBySupplier.set(supplierId, []);
      }
      pricesBySupplier.get(supplierId)!.push(price);
    });

    // Analyze trends for each supplier
    const trends = new Map<string, PriceTrend>();
    for (const [supplierId, prices] of pricesBySupplier) {
      if (prices.length >= 2) {
        const trend = analyzePriceTrend(prices, {
          period,
          supplierId: supplierId === 'aggregated' ? undefined : supplierId,
        });
        if (trend) {
          trends.set(supplierId, trend);
        }
      }
    }

    return trends;
  }

  /**
   * Get price alerts (significant price changes)
   */
  async getPriceAlerts(
    inventoryItemId: string,
    options?: {
      threshold?: number; // Percentage change threshold
      period?: TimePeriod;
      supplierId?: string;
    }
  ): Promise<Array<{
    type: 'increase' | 'decrease';
    percentage: number;
    currentPrice: number;
    previousPrice: number;
    date: string;
    supplierId?: string;
  }>> {
    const period = options?.period || '7d';
    const threshold = options?.threshold || 10; // 10% default threshold
    
    const prices = await this.getHistoricalPrices(inventoryItemId, {
      startDate: getTimePeriodBoundaries(period).startDate.toISOString(),
      endDate: getTimePeriodBoundaries(period).endDate.toISOString(),
      supplierId: options?.supplierId,
    });

    if (prices.length < 2) {
      return [];
    }

    // Sort by date
    const sortedPrices = prices.sort((a, b) => 
      new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()
    );

    const alerts: Array<{
      type: 'increase' | 'decrease';
      percentage: number;
      currentPrice: number;
      previousPrice: number;
      date: string;
      supplierId?: string;
    }> = [];

    // Check for significant changes
    for (let i = 1; i < sortedPrices.length; i++) {
      const current = sortedPrices[i];
      const previous = sortedPrices[i - 1];
      
      const changePercentage = Math.abs((current.price - previous.price) / previous.price) * 100;
      
      if (changePercentage >= threshold) {
        alerts.push({
          type: current.price > previous.price ? 'increase' : 'decrease',
          percentage: changePercentage,
          currentPrice: current.price,
          previousPrice: previous.price,
          date: current.observedAt,
          supplierId: current.supplierId,
        });
      }
    }

    return alerts;
  }

  /**
   * Clean up old historical price data
   */
  async cleanupOldData(olderThanDays: number): Promise<number> {
    const repository = await this.getRepository();
    return await repository.cleanupOldData(olderThanDays);
  }

  /**
   * Get price history summary for an inventory item
   */
  async getPriceHistorySummary(
    inventoryItemId: string,
    period: TimePeriod = '30d'
  ): Promise<{
    currentPrice?: number;
    bestPrice?: number;
    averagePrice?: number;
    priceRange: { min: number; max: number };
    trend: PriceTrend | null;
    supplierCount: number;
    dataPointCount: number;
    lastUpdated: string;
  }> {
    const [prices, trend, statistics] = await Promise.all([
      this.getHistoricalPrices(inventoryItemId, {
        startDate: getTimePeriodBoundaries(period).startDate.toISOString(),
        endDate: getTimePeriodBoundaries(period).endDate.toISOString(),
      }),
      this.getPriceTrend(inventoryItemId, { period }),
      this.getPriceStatistics(inventoryItemId, period),
    ]);

    const uniqueSuppliers = new Set(prices.map(p => p.supplierId).filter(Boolean));
    const mostRecentPrice = prices.length > 0 
      ? prices.sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime())[0]
      : null;

    return {
      currentPrice: mostRecentPrice?.price,
      bestPrice: statistics?.min,
      averagePrice: statistics?.average,
      priceRange: {
        min: statistics?.min || 0,
        max: statistics?.max || 0,
      },
      trend,
      supplierCount: uniqueSuppliers.size,
      dataPointCount: prices.length,
      lastUpdated: mostRecentPrice?.observedAt || getCurrentTimestamp(),
    };
  }
}
