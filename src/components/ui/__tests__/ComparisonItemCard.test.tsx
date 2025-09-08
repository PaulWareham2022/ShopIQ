import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ComparisonItemCard } from '../ComparisonItemCard';
import { ComparisonResult } from '../../../storage/comparison/types';
import { Offer } from '../../../storage/types';

// Mock data
const mockOffer: Offer = {
  id: 'offer-1',
  inventoryItemId: 'item-1',
  supplierId: 'supplier-1',
  supplierNameSnapshot: 'Test Supplier',
  supplierUrl: 'https://example.com/product',
  sourceType: 'manual',
  observedAt: '2024-01-15T10:00:00Z',
  capturedAt: '2024-01-15T10:00:00Z',
  totalPrice: 25.99,
  currency: 'CAD',
  isTaxIncluded: true,
  amount: 500,
  amountUnit: 'ml',
  amountCanonical: 500,
  pricePerCanonicalExclShipping: 0.052,
  pricePerCanonicalInclShipping: 0.052,
  effectivePricePerCanonical: 0.052,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const mockComparisonResult: ComparisonResult = {
  offer: mockOffer,
  score: 0.052,
  metadata: {
    explanation: 'This is the best price found',
    confidence: 0.9,
    flags: ['best_price', 'low_shipping'],
    trend: {
      direction: 'down',
      strength: 0.7,
      confidence: 0.8,
    },
  },
};

describe('ComparisonItemCard', () => {
  it('renders correctly with basic props', () => {
    const { getByText } = render(
      <ComparisonItemCard
        comparisonResult={mockComparisonResult}
        testID="test-card"
      />
    );

    expect(getByText('Test Supplier')).toBeTruthy();
    expect(getByText('CAD 25.99')).toBeTruthy();
    expect(getByText('500 ml')).toBeTruthy();
    expect(getByText('Price per ml:')).toBeTruthy();
    expect(getByText('CAD 0.05')).toBeTruthy();
  });

  it('displays best offer badge when isBestOffer is true', () => {
    const { getByText } = render(
      <ComparisonItemCard
        comparisonResult={mockComparisonResult}
        isBestOffer={true}
        testID="test-card"
      />
    );

    expect(getByText('🏆 Best Offer')).toBeTruthy();
  });

  it('displays tied badge when isTiedForBest is true', () => {
    const { getByText } = render(
      <ComparisonItemCard
        comparisonResult={mockComparisonResult}
        isBestOffer={true}
        isTiedForBest={true}
        testID="test-card"
      />
    );

    expect(getByText('🏆 Tied for Best')).toBeTruthy();
  });

  it('displays trend indicator when showPriceTrend is true', () => {
    const { getByText } = render(
      <ComparisonItemCard
        comparisonResult={mockComparisonResult}
        showPriceTrend={true}
        testID="test-card"
      />
    );

    expect(getByText('📉')).toBeTruthy();
    expect(getByText('Falling')).toBeTruthy();
  });

  it('displays confidence indicator', () => {
    const { getByText } = render(
      <ComparisonItemCard
        comparisonResult={mockComparisonResult}
        testID="test-card"
      />
    );

    expect(getByText('High Confidence')).toBeTruthy();
  });

  it('displays flags as chips', () => {
    const { getByText } = render(
      <ComparisonItemCard
        comparisonResult={mockComparisonResult}
        testID="test-card"
      />
    );

    expect(getByText('best_price')).toBeTruthy();
    expect(getByText('low_shipping')).toBeTruthy();
  });

  it('displays supplier URL button when supplierUrl is present', () => {
    const { getByText } = render(
      <ComparisonItemCard
        comparisonResult={mockComparisonResult}
        testID="test-card"
      />
    );

    expect(getByText('🌐 Open Supplier Page')).toBeTruthy();
  });

  it('displays comparison details when showComparisonDetails is true', () => {
    const { getByText } = render(
      <ComparisonItemCard
        comparisonResult={mockComparisonResult}
        showComparisonDetails={true}
        testID="test-card"
      />
    );

    expect(getByText('Comparison Score:')).toBeTruthy();
    expect(getByText('0.05')).toBeTruthy();
    expect(getByText('This is the best price found')).toBeTruthy();
  });

  it('calls onPress when card is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ComparisonItemCard
        comparisonResult={mockComparisonResult}
        onPress={onPress}
        testID="test-card"
      />
    );

    fireEvent.press(getByTestId('test-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onLongPress when card is long pressed', () => {
    const onLongPress = jest.fn();
    const { getByTestId } = render(
      <ComparisonItemCard
        comparisonResult={mockComparisonResult}
        onLongPress={onLongPress}
        testID="test-card"
      />
    );

    fireEvent(getByTestId('test-card'), 'longPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('handles missing metadata gracefully', () => {
    const comparisonResultWithoutMetadata: ComparisonResult = {
      offer: mockOffer,
      score: 0.052,
    };

    const { getByText } = render(
      <ComparisonItemCard
        comparisonResult={comparisonResultWithoutMetadata}
        testID="test-card"
      />
    );

    expect(getByText('Test Supplier')).toBeTruthy();
    expect(getByText('CAD 25.99')).toBeTruthy();
  });

  it('handles missing supplier URL gracefully', () => {
    const offerWithoutUrl = { ...mockOffer, supplierUrl: undefined };
    const comparisonResultWithoutUrl: ComparisonResult = {
      offer: offerWithoutUrl,
      score: 0.052,
    };

    const { queryByText } = render(
      <ComparisonItemCard
        comparisonResult={comparisonResultWithoutUrl}
        testID="test-card"
      />
    );

    expect(queryByText('🌐 Open Supplier Page')).toBeNull();
  });

  it('formats prices correctly', () => {
    const offerWithDifferentPrice = {
      ...mockOffer,
      totalPrice: 0,
      currency: 'USD',
    };
    const comparisonResultWithZeroPrice: ComparisonResult = {
      offer: offerWithDifferentPrice,
      score: 0,
    };

    const { getByText } = render(
      <ComparisonItemCard
        comparisonResult={comparisonResultWithZeroPrice}
        testID="test-card"
      />
    );

    expect(getByText('USD 0.00')).toBeTruthy();
  });

  it('displays source type correctly', () => {
    const { getByText } = render(
      <ComparisonItemCard
        comparisonResult={mockComparisonResult}
        testID="test-card"
      />
    );

    expect(getByText('✋ Manual')).toBeTruthy();
  });
});
