import React from 'react';
import { render } from '@testing-library/react-native';
import { PriceTrendIndicator, PriceTrendData } from '../PriceTrendIndicator';

const mockTrendDataUp: PriceTrendData = {
  direction: 'up',
  strength: 0.8,
  confidence: 0.9,
  statistics: {
    min: 0.05,
    max: 0.08,
    average: 0.065,
    median: 0.064,
    standardDeviation: 0.01,
    volatility: 15.4,
  },
  bestHistoricalPrice: {
    price: 0.045,
    date: '2024-01-10T10:00:00Z',
    supplier: 'Best Supplier',
  },
};

const mockTrendDataDown: PriceTrendData = {
  direction: 'down',
  strength: 0.6,
  confidence: 0.7,
};

const mockTrendDataStable: PriceTrendData = {
  direction: 'stable',
  strength: 0.3,
  confidence: 0.5,
};

describe('PriceTrendIndicator', () => {
  it('renders correctly with basic trend data', () => {
    const { getByText } = render(
      <PriceTrendIndicator trendData={mockTrendDataUp} testID="test-trend" />
    );

    expect(getByText('📈')).toBeTruthy();
    expect(getByText('Rising')).toBeTruthy();
    expect(getByText('90%')).toBeTruthy();
    expect(getByText('80% strength')).toBeTruthy();
  });

  it('displays correct trend direction and emoji', () => {
    const { getByText: getByTextUp } = render(
      <PriceTrendIndicator trendData={mockTrendDataUp} testID="test-trend-up" />
    );

    expect(getByTextUp('📈')).toBeTruthy();
    expect(getByTextUp('Rising')).toBeTruthy();

    const { getByText: getByTextDown } = render(
      <PriceTrendIndicator
        trendData={mockTrendDataDown}
        testID="test-trend-down"
      />
    );

    expect(getByTextDown('📉')).toBeTruthy();
    expect(getByTextDown('Falling')).toBeTruthy();

    const { getByText: getByTextStable } = render(
      <PriceTrendIndicator
        trendData={mockTrendDataStable}
        testID="test-trend-stable"
      />
    );

    expect(getByTextStable('➡️')).toBeTruthy();
    expect(getByTextStable('Stable')).toBeTruthy();
  });

  it('displays confidence indicator with correct color', () => {
    const { getByText: getByTextHigh } = render(
      <PriceTrendIndicator
        trendData={mockTrendDataUp}
        testID="test-trend-high"
      />
    );

    expect(getByTextHigh('High Confidence')).toBeTruthy();

    const { getByText: getByTextMedium } = render(
      <PriceTrendIndicator
        trendData={mockTrendDataDown}
        testID="test-trend-medium"
      />
    );

    expect(getByTextMedium('Medium Confidence')).toBeTruthy();

    const { getByText: getByTextLow } = render(
      <PriceTrendIndicator
        trendData={mockTrendDataStable}
        testID="test-trend-low"
      />
    );

    expect(getByTextLow('Low Confidence')).toBeTruthy();
  });

  it('displays statistics when showStatistics is true', () => {
    const { getByText } = render(
      <PriceTrendIndicator
        trendData={mockTrendDataUp}
        showStatistics={true}
        testID="test-trend"
      />
    );

    expect(getByText('Price Range:')).toBeTruthy();
    expect(getByText('Min: CAD 0.05')).toBeTruthy();
    expect(getByText('Max: CAD 0.08')).toBeTruthy();
    expect(getByText('Avg: CAD 0.07')).toBeTruthy();
    expect(getByText('Volatility: 15.4%')).toBeTruthy();
  });

  it('displays best historical price when showBestHistorical is true', () => {
    const { getByText } = render(
      <PriceTrendIndicator
        trendData={mockTrendDataUp}
        showBestHistorical={true}
        testID="test-trend"
      />
    );

    expect(getByText('Best Historical:')).toBeTruthy();
    expect(getByText('CAD 0.05')).toBeTruthy();
    expect(getByText('Jan 10, 2024 • Best Supplier')).toBeTruthy();
  });

  it('renders with different sizes', () => {
    const { getByTestId: getByTestIdSmall } = render(
      <PriceTrendIndicator
        trendData={mockTrendDataUp}
        size="small"
        testID="test-trend-small"
      />
    );

    expect(getByTestIdSmall('test-trend-small')).toBeTruthy();

    const { getByTestId: getByTestIdLarge } = render(
      <PriceTrendIndicator
        trendData={mockTrendDataUp}
        size="large"
        testID="test-trend-large"
      />
    );

    expect(getByTestIdLarge('test-trend-large')).toBeTruthy();
  });

  it('uses custom currency', () => {
    const { getByText } = render(
      <PriceTrendIndicator
        trendData={mockTrendDataUp}
        currency="USD"
        showStatistics={true}
        testID="test-trend"
      />
    );

    expect(getByText('Min: USD 0.05')).toBeTruthy();
    expect(getByText('Max: USD 0.08')).toBeTruthy();
  });

  it('handles missing statistics gracefully', () => {
    const trendDataWithoutStats: PriceTrendData = {
      direction: 'up',
      strength: 0.8,
      confidence: 0.9,
    };

    const { queryByText } = render(
      <PriceTrendIndicator
        trendData={trendDataWithoutStats}
        showStatistics={true}
        testID="test-trend"
      />
    );

    expect(queryByText('Price Range:')).toBeNull();
  });

  it('handles missing best historical price gracefully', () => {
    const trendDataWithoutBest: PriceTrendData = {
      direction: 'up',
      strength: 0.8,
      confidence: 0.9,
    };

    const { queryByText } = render(
      <PriceTrendIndicator
        trendData={trendDataWithoutBest}
        showBestHistorical={true}
        testID="test-trend"
      />
    );

    expect(queryByText('Best Historical:')).toBeNull();
  });

  it('formats dates correctly', () => {
    const { getByText } = render(
      <PriceTrendIndicator
        trendData={mockTrendDataUp}
        showBestHistorical={true}
        testID="test-trend"
      />
    );

    expect(getByText('Jan 10, 2024 • Best Supplier')).toBeTruthy();
  });

  it('handles invalid dates gracefully', () => {
    const trendDataWithInvalidDate: PriceTrendData = {
      direction: 'up',
      strength: 0.8,
      confidence: 0.9,
      bestHistoricalPrice: {
        price: 0.045,
        date: 'invalid-date',
        supplier: 'Best Supplier',
      },
    };

    const { getByText } = render(
      <PriceTrendIndicator
        trendData={trendDataWithInvalidDate}
        showBestHistorical={true}
        testID="test-trend"
      />
    );

    expect(getByText('invalid-date • Best Supplier')).toBeTruthy();
  });

  it('formats prices correctly', () => {
    const { getByText } = render(
      <PriceTrendIndicator
        trendData={mockTrendDataUp}
        showStatistics={true}
        testID="test-trend"
      />
    );

    expect(getByText('Min: CAD 0.05')).toBeTruthy();
    expect(getByText('Max: CAD 0.08')).toBeTruthy();
    expect(getByText('Avg: CAD 0.07')).toBeTruthy();
  });

  it('handles NaN prices gracefully', () => {
    const trendDataWithNaN: PriceTrendData = {
      direction: 'up',
      strength: 0.8,
      confidence: 0.9,
      statistics: {
        min: NaN,
        max: NaN,
        average: NaN,
        median: NaN,
        standardDeviation: NaN,
        volatility: NaN,
      },
    };

    const { getByText } = render(
      <PriceTrendIndicator
        trendData={trendDataWithNaN}
        showStatistics={true}
        testID="test-trend"
      />
    );

    expect(getByText('Min: CAD 0.00')).toBeTruthy();
    expect(getByText('Max: CAD 0.00')).toBeTruthy();
    expect(getByText('Avg: CAD 0.00')).toBeTruthy();
  });
});
