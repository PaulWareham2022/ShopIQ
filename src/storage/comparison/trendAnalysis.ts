/**
 * Price Trend Analysis Utilities
 *
 * Provides utilities for analyzing price trends, calculating statistics,
 * and determining trend directions and strengths.
 */

import {
  HistoricalPrice,
  PriceTrend,
  PriceStatistics,
  TrendDirection,
  TimePeriod,
  TrendAnalysisOptions,
} from '../types/historical-prices';

// =============================================================================
// TREND ANALYSIS UTILITIES
// =============================================================================

/**
 * Calculate price statistics for a set of historical prices
 */
export function calculatePriceStatistics(
  prices: HistoricalPrice[],
  period: TimePeriod
): PriceStatistics {
  if (prices.length === 0) {
    throw new Error('Cannot calculate statistics for empty price array');
  }

  const priceValues = prices.map(p => p.price).sort((a, b) => a - b);
  const count = priceValues.length;

  // Basic statistics
  const min = priceValues[0];
  const max = priceValues[count - 1];
  const sum = priceValues.reduce((acc, price) => acc + price, 0);
  const average = sum / count;

  // Median calculation
  const median = count % 2 === 0
    ? (priceValues[count / 2 - 1] + priceValues[count / 2]) / 2
    : priceValues[Math.floor(count / 2)];

  // Standard deviation
  const variance = priceValues.reduce((acc, price) => acc + Math.pow(price - average, 2), 0) / count;
  const standardDeviation = Math.sqrt(variance);

  // Volatility (coefficient of variation)
  const volatility = average > 0 ? standardDeviation / average : 0;

  return {
    min,
    max,
    average,
    median,
    standardDeviation,
    volatility,
    count,
    period,
  };
}

/**
 * Analyze price trend from historical data
 */
export function analyzePriceTrend(
  prices: HistoricalPrice[],
  options: TrendAnalysisOptions
): PriceTrend | null {
  if (prices.length < 2) {
    return null;
  }

  // Sort prices by observation date
  const sortedPrices = [...prices].sort((a, b) => 
    new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()
  );

  const startPrice = sortedPrices[0].price;
  const endPrice = sortedPrices[sortedPrices.length - 1].price;
  const changeAmount = endPrice - startPrice;
  const changePercentage = startPrice > 0 ? (changeAmount / startPrice) * 100 : 0;

  // Calculate trend direction and strength
  const { direction, strength } = calculateTrendDirectionAndStrength(
    sortedPrices,
    options
  );

  // Calculate confidence based on data quality
  const confidence = calculateTrendConfidence(sortedPrices, options);

  return {
    inventoryItemId: sortedPrices[0].inventoryItemId,
    supplierId: options.supplierId,
    period: options.period,
    direction,
    strength,
    changePercentage,
    changeAmount,
    startPrice,
    endPrice,
    dataPointCount: sortedPrices.length,
    confidence,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate trend direction and strength
 */
function calculateTrendDirectionAndStrength(
  sortedPrices: HistoricalPrice[],
  options: TrendAnalysisOptions
): { direction: TrendDirection; strength: number } {
  if (sortedPrices.length < 2) {
    return { direction: 'stable', strength: 0 };
  }

  const prices = sortedPrices.map(p => p.price);
  const startPrice = prices[0];
  const endPrice = prices[prices.length - 1];

  // Calculate linear regression to determine trend
  const { slope, rSquared } = calculateLinearRegression(
    sortedPrices.map((p, i) => ({ x: i, y: p.price }))
  );

  // Determine direction based on slope
  let direction: TrendDirection;
  if (Math.abs(slope) < 0.001) {
    direction = 'stable';
  } else if (slope > 0) {
    direction = 'up';
  } else {
    direction = 'down';
  }

  // Calculate strength based on R-squared and price change
  const priceChangeRatio = Math.abs(endPrice - startPrice) / startPrice;
  const strength = Math.min(rSquared * priceChangeRatio * 10, 1);

  // Check for volatility (high standard deviation relative to mean)
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const coefficientOfVariation = Math.sqrt(variance) / mean;

  // If volatility is high, mark as volatile
  if (coefficientOfVariation > 0.2 && strength < 0.3) {
    direction = 'volatile';
  }

  return { direction, strength };
}

/**
 * Calculate linear regression for trend analysis
 */
function calculateLinearRegression(
  points: Array<{ x: number; y: number }>
): { slope: number; intercept: number; rSquared: number } {
  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);
  const sumYY = points.reduce((sum, p) => sum + p.y * p.y, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const yMean = sumY / n;
  const ssRes = points.reduce((sum, p) => {
    const predicted = slope * p.x + intercept;
    return sum + Math.pow(p.y - predicted, 2);
  }, 0);
  const ssTot = points.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
  const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

  return { slope, intercept, rSquared };
}

/**
 * Calculate confidence in trend analysis
 */
function calculateTrendConfidence(
  prices: HistoricalPrice[],
  options: TrendAnalysisOptions
): number {
  let confidence = 0.5; // Base confidence

  // Increase confidence with more data points
  const dataPointBonus = Math.min(prices.length / 20, 0.3);
  confidence += dataPointBonus;

  // Increase confidence if we have recent data
  const now = new Date();
  const mostRecent = new Date(prices[prices.length - 1].observedAt);
  const daysSinceRecent = (now.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceRecent < 7) {
    confidence += 0.2;
  } else if (daysSinceRecent < 30) {
    confidence += 0.1;
  }

  // Increase confidence if data has high quality (confidence scores)
  const avgConfidence = prices.reduce((sum, p) => 
    sum + (p.metadata?.confidence || 0.5), 0
  ) / prices.length;
  confidence += (avgConfidence - 0.5) * 0.3;

  // Decrease confidence if data is sparse
  const timeSpan = new Date(prices[prices.length - 1].observedAt).getTime() - 
                   new Date(prices[0].observedAt).getTime();
  const daysSpan = timeSpan / (1000 * 60 * 60 * 24);
  const dataDensity = prices.length / daysSpan;
  
  if (dataDensity < 0.1) { // Less than 1 data point per 10 days
    confidence -= 0.2;
  }

  return Math.max(0, Math.min(1, confidence));
}

/**
 * Get time period boundaries for trend analysis
 */
export function getTimePeriodBoundaries(period: TimePeriod): {
  startDate: Date;
  endDate: Date;
} {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case '1d':
      startDate.setDate(endDate.getDate() - 1);
      break;
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    case 'all':
      startDate.setFullYear(2000); // Arbitrary early date
      break;
    default:
      throw new Error(`Unknown time period: ${period}`);
  }

  return { startDate, endDate };
}

/**
 * Filter historical prices by time period
 */
export function filterPricesByPeriod(
  prices: HistoricalPrice[],
  period: TimePeriod
): HistoricalPrice[] {
  const { startDate, endDate } = getTimePeriodBoundaries(period);
  
  return prices.filter(price => {
    const observedDate = new Date(price.observedAt);
    return observedDate >= startDate && observedDate <= endDate;
  });
}

/**
 * Smooth price data using moving average
 */
export function smoothPrices(
  prices: HistoricalPrice[],
  windowSize: number = 3
): HistoricalPrice[] {
  if (prices.length < windowSize) {
    return prices;
  }

  const sortedPrices = [...prices].sort((a, b) => 
    new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()
  );

  const smoothed: HistoricalPrice[] = [];

  for (let i = 0; i < sortedPrices.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(sortedPrices.length, start + windowSize);
    const window = sortedPrices.slice(start, end);
    
    const averagePrice = window.reduce((sum, p) => sum + p.price, 0) / window.length;
    
    smoothed.push({
      ...sortedPrices[i],
      price: averagePrice,
    });
  }

  return smoothed;
}

/**
 * Detect price anomalies in historical data
 */
export function detectPriceAnomalies(
  prices: HistoricalPrice[],
  threshold: number = 2.0 // Standard deviations
): Array<{
  price: HistoricalPrice;
  anomalyType: 'high' | 'low';
  deviation: number;
}> {
  if (prices.length < 3) {
    return [];
  }

  const priceValues = prices.map(p => p.price);
  const mean = priceValues.reduce((sum, p) => sum + p, 0) / priceValues.length;
  const variance = priceValues.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / priceValues.length;
  const standardDeviation = Math.sqrt(variance);

  const anomalies: Array<{
    price: HistoricalPrice;
    anomalyType: 'high' | 'low';
    deviation: number;
  }> = [];

  prices.forEach(price => {
    const deviation = Math.abs(price.price - mean) / standardDeviation;
    
    if (deviation > threshold) {
      anomalies.push({
        price,
        anomalyType: price.price > mean ? 'high' : 'low',
        deviation,
      });
    }
  });

  return anomalies;
}

/**
 * Predict future price based on trend analysis
 */
export function predictFuturePrice(
  trend: PriceTrend,
  daysAhead: number = 7
): {
  predictedPrice: number;
  confidence: number;
  range: { min: number; max: number };
} {
  if (trend.direction === 'volatile' || trend.strength < 0.3) {
    // For volatile or weak trends, return current price with low confidence
    return {
      predictedPrice: trend.endPrice,
      confidence: 0.2,
      range: {
        min: trend.endPrice * 0.8,
        max: trend.endPrice * 1.2,
      },
    };
  }

  // Calculate daily change rate
  const periodDays = getPeriodDays(trend.period);
  const dailyChangeRate = trend.changePercentage / periodDays;
  
  // Predict future price
  const predictedChange = (dailyChangeRate / 100) * daysAhead;
  const predictedPrice = trend.endPrice * (1 + predictedChange);

  // Calculate confidence based on trend strength and data quality
  const confidence = Math.min(trend.confidence * trend.strength, 0.8);

  // Calculate prediction range based on historical volatility
  const volatility = Math.abs(dailyChangeRate) * 0.5; // Rough estimate
  const range = {
    min: predictedPrice * (1 - volatility),
    max: predictedPrice * (1 + volatility),
  };

  return {
    predictedPrice,
    confidence,
    range,
  };
}

/**
 * Get number of days for a time period
 */
function getPeriodDays(period: TimePeriod): number {
  switch (period) {
    case '1d': return 1;
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '1y': return 365;
    case 'all': return 365; // Default to 1 year for calculations
    default: return 30;
  }
}
