/**
 * Unit tests for trend analysis utilities
 */

import {
  calculatePriceStatistics,
  analyzePriceTrend,
  filterPricesByPeriod,
  getTimePeriodBoundaries,
  smoothPrices,
  detectPriceAnomalies,
  predictFuturePrice,
} from '../../comparison/trendAnalysis';
import { HistoricalPrice, TimePeriod } from '../../types';
import { TrendAnalysisOptions } from '../../types/historical-prices';

describe('Trend Analysis Utilities', () => {
  describe('calculatePriceStatistics', () => {
    it('should calculate basic statistics correctly', () => {
      const prices: HistoricalPrice[] = [
        {
          id: '1',
          inventoryItemId: 'item-1',
          price: 10.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          inventoryItemId: 'item-1',
          price: 12.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-02T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-02T10:00:00Z',
          updated_at: '2024-01-02T10:00:00Z',
        },
        {
          id: '3',
          inventoryItemId: 'item-1',
          price: 8.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-03T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-03T10:00:00Z',
          updated_at: '2024-01-03T10:00:00Z',
        },
      ];

      const stats = calculatePriceStatistics(prices, '7d');

      expect(stats.min).toBe(8.00);
      expect(stats.max).toBe(12.00);
      expect(stats.average).toBe(10.00);
      expect(stats.median).toBe(10.00);
      expect(stats.count).toBe(3);
      expect(stats.standardDeviation).toBeCloseTo(1.63, 1);
      expect(stats.volatility).toBeCloseTo(0.163, 2);
    });

    it('should throw error for empty price array', () => {
      expect(() => calculatePriceStatistics([], '7d')).toThrow(
        'Cannot calculate statistics for empty price array'
      );
    });
  });

  describe('analyzePriceTrend', () => {
    it('should detect upward trend', () => {
      const prices: HistoricalPrice[] = [
        {
          id: '1',
          inventoryItemId: 'item-1',
          price: 10.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          inventoryItemId: 'item-1',
          price: 11.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-02T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-02T10:00:00Z',
          updated_at: '2024-01-02T10:00:00Z',
        },
        {
          id: '3',
          inventoryItemId: 'item-1',
          price: 12.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-03T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-03T10:00:00Z',
          updated_at: '2024-01-03T10:00:00Z',
        },
      ];

      const options: TrendAnalysisOptions = {
        period: '7d',
        minDataPoints: 2,
      };

      const trend = analyzePriceTrend(prices, options);

      expect(trend).toBeDefined();
      expect(trend!.direction).toBe('up');
      expect(trend!.changePercentage).toBe(20); // 20% increase
      expect(trend!.changeAmount).toBe(2.00);
      expect(trend!.startPrice).toBe(10.00);
      expect(trend!.endPrice).toBe(12.00);
      expect(trend!.dataPointCount).toBe(3);
    });

    it('should detect downward trend', () => {
      const prices: HistoricalPrice[] = [
        {
          id: '1',
          inventoryItemId: 'item-1',
          price: 12.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          inventoryItemId: 'item-1',
          price: 11.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-02T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-02T10:00:00Z',
          updated_at: '2024-01-02T10:00:00Z',
        },
        {
          id: '3',
          inventoryItemId: 'item-1',
          price: 10.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-03T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-03T10:00:00Z',
          updated_at: '2024-01-03T10:00:00Z',
        },
      ];

      const options: TrendAnalysisOptions = {
        period: '7d',
        minDataPoints: 2,
      };

      const trend = analyzePriceTrend(prices, options);

      expect(trend).toBeDefined();
      expect(trend!.direction).toBe('down');
      expect(trend!.changePercentage).toBeCloseTo(-16.67, 1); // ~16.67% decrease
      expect(trend!.changeAmount).toBe(-2.00);
    });

    it('should detect stable trend', () => {
      const prices: HistoricalPrice[] = [
        {
          id: '1',
          inventoryItemId: 'item-1',
          price: 10.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          inventoryItemId: 'item-1',
          price: 10.01,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-02T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-02T10:00:00Z',
          updated_at: '2024-01-02T10:00:00Z',
        },
        {
          id: '3',
          inventoryItemId: 'item-1',
          price: 9.99,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-03T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-03T10:00:00Z',
          updated_at: '2024-01-03T10:00:00Z',
        },
      ];

      const options: TrendAnalysisOptions = {
        period: '7d',
        minDataPoints: 2,
      };

      const trend = analyzePriceTrend(prices, options);

      expect(trend).toBeDefined();
      expect(trend!.direction).toBe('stable');
      expect(Math.abs(trend!.changePercentage)).toBeLessThan(1); // Very small change
    });

    it('should return null for insufficient data', () => {
      const prices: HistoricalPrice[] = [
        {
          id: '1',
          inventoryItemId: 'item-1',
          price: 10.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
      ];

      const options: TrendAnalysisOptions = {
        period: '7d',
        minDataPoints: 2,
      };

      const trend = analyzePriceTrend(prices, options);

      expect(trend).toBeNull();
    });
  });

  describe('filterPricesByPeriod', () => {
    it('should filter prices by 7-day period', () => {
      const now = new Date('2024-01-10T12:00:00Z');
      const prices: HistoricalPrice[] = [
        {
          id: '1',
          inventoryItemId: 'item-1',
          price: 10.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z', // 9 days ago
          source: 'offer',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          inventoryItemId: 'item-1',
          price: 11.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-05T10:00:00Z', // 5 days ago
          source: 'offer',
          created_at: '2024-01-05T10:00:00Z',
          updated_at: '2024-01-05T10:00:00Z',
        },
        {
          id: '3',
          inventoryItemId: 'item-1',
          price: 12.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-09T10:00:00Z', // 1 day ago
          source: 'offer',
          created_at: '2024-01-09T10:00:00Z',
          updated_at: '2024-01-09T10:00:00Z',
        },
      ];

      // Mock Date.now to return our test date
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => now.getTime());

      try {
        const filtered = filterPricesByPeriod(prices, '7d');

        expect(filtered).toHaveLength(2);
        expect(filtered[0].id).toBe('2');
        expect(filtered[1].id).toBe('3');
      } finally {
        Date.now = originalDateNow;
      }
    });
  });

  describe('getTimePeriodBoundaries', () => {
    it('should return correct boundaries for 7-day period', () => {
      const { startDate, endDate } = getTimePeriodBoundaries('7d');

      const expectedEndDate = new Date();
      const expectedStartDate = new Date();
      expectedStartDate.setDate(expectedEndDate.getDate() - 7);

      expect(endDate.getTime()).toBeCloseTo(expectedEndDate.getTime(), -3); // Within 1 second
      expect(startDate.getTime()).toBeCloseTo(expectedStartDate.getTime(), -3);
    });

    it('should return correct boundaries for 30-day period', () => {
      const { startDate, endDate } = getTimePeriodBoundaries('30d');

      const expectedEndDate = new Date();
      const expectedStartDate = new Date();
      expectedStartDate.setDate(expectedEndDate.getDate() - 30);

      expect(endDate.getTime()).toBeCloseTo(expectedEndDate.getTime(), -3);
      expect(startDate.getTime()).toBeCloseTo(expectedStartDate.getTime(), -3);
    });
  });

  describe('smoothPrices', () => {
    it('should smooth prices using moving average', () => {
      const prices: HistoricalPrice[] = [
        {
          id: '1',
          inventoryItemId: 'item-1',
          price: 10.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          inventoryItemId: 'item-1',
          price: 20.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-02T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-02T10:00:00Z',
          updated_at: '2024-01-02T10:00:00Z',
        },
        {
          id: '3',
          inventoryItemId: 'item-1',
          price: 12.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-03T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-03T10:00:00Z',
          updated_at: '2024-01-03T10:00:00Z',
        },
      ];

      const smoothed = smoothPrices(prices, 3);

      expect(smoothed).toHaveLength(3);
      // First price should be average of first 2 prices
      expect(smoothed[0].price).toBe(15.00);
      // Second price should be average of all 3 prices
      expect(smoothed[1].price).toBe(14.00);
      // Third price should be average of last 2 prices
      expect(smoothed[2].price).toBe(16.00);
    });
  });

  describe('detectPriceAnomalies', () => {
    it('should detect high price anomalies', () => {
      const prices: HistoricalPrice[] = [
        {
          id: '1',
          inventoryItemId: 'item-1',
          price: 10.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          inventoryItemId: 'item-1',
          price: 11.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-02T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-02T10:00:00Z',
          updated_at: '2024-01-02T10:00:00Z',
        },
        {
          id: '3',
          inventoryItemId: 'item-1',
          price: 25.00, // Anomaly - much higher than others
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-03T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-03T10:00:00Z',
          updated_at: '2024-01-03T10:00:00Z',
        },
      ];

      const anomalies = detectPriceAnomalies(prices, 2.0);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].price.id).toBe('3');
      expect(anomalies[0].anomalyType).toBe('high');
      expect(anomalies[0].deviation).toBeGreaterThan(2.0);
    });

    it('should detect low price anomalies', () => {
      const prices: HistoricalPrice[] = [
        {
          id: '1',
          inventoryItemId: 'item-1',
          price: 10.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          inventoryItemId: 'item-1',
          price: 11.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-02T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-02T10:00:00Z',
          updated_at: '2024-01-02T10:00:00Z',
        },
        {
          id: '3',
          inventoryItemId: 'item-1',
          price: 2.00, // Anomaly - much lower than others
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-03T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-03T10:00:00Z',
          updated_at: '2024-01-03T10:00:00Z',
        },
      ];

      const anomalies = detectPriceAnomalies(prices, 2.0);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].price.id).toBe('3');
      expect(anomalies[0].anomalyType).toBe('low');
      expect(anomalies[0].deviation).toBeGreaterThan(2.0);
    });
  });

  describe('predictFuturePrice', () => {
    it('should predict future price for upward trend', () => {
      const trend = {
        inventoryItemId: 'item-1',
        period: '7d' as TimePeriod,
        direction: 'up' as const,
        strength: 0.8,
        changePercentage: 20, // 20% increase over 7 days
        changeAmount: 2.00,
        startPrice: 10.00,
        endPrice: 12.00,
        dataPointCount: 7,
        confidence: 0.8,
        calculatedAt: '2024-01-07T10:00:00Z',
      };

      const prediction = predictFuturePrice(trend, 7); // Predict 7 days ahead

      expect(prediction.predictedPrice).toBeGreaterThan(12.00);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.range.min).toBeLessThan(prediction.predictedPrice);
      expect(prediction.range.max).toBeGreaterThan(prediction.predictedPrice);
    });

    it('should return current price for volatile trends', () => {
      const trend = {
        inventoryItemId: 'item-1',
        period: '7d' as TimePeriod,
        direction: 'volatile' as const,
        strength: 0.2,
        changePercentage: 0,
        changeAmount: 0,
        startPrice: 10.00,
        endPrice: 10.00,
        dataPointCount: 7,
        confidence: 0.3,
        calculatedAt: '2024-01-07T10:00:00Z',
      };

      const prediction = predictFuturePrice(trend, 7);

      expect(prediction.predictedPrice).toBe(10.00);
      expect(prediction.confidence).toBe(0.2);
    });
  });
});
