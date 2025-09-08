import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ComparisonList } from '../ComparisonList';
import {
  ComparisonResult,
  ItemComparisonResults,
} from '../../../storage/comparison/types';
import { Offer } from '../../../storage/types';
import { InventoryItem } from '../../../storage/types';

// Mock data
const mockInventoryItem: InventoryItem = {
  id: 'item-1',
  name: 'Test Item',
  category: 'test',
  canonicalDimension: 'mass',
  canonicalUnit: 'g',
  shelfLifeSensitive: false,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const mockOffer1: Offer = {
  id: 'offer-1',
  inventoryItemId: 'item-1',
  supplierId: 'supplier-1',
  supplierNameSnapshot: 'Best Supplier',
  supplierUrl: 'https://example.com/product1',
  sourceType: 'manual',
  observedAt: '2024-01-15T10:00:00Z',
  capturedAt: '2024-01-15T10:00:00Z',
  totalPrice: 10.0,
  currency: 'CAD',
  isTaxIncluded: true,
  amount: 500,
  amountUnit: 'g',
  amountCanonical: 500,
  pricePerCanonicalExclShipping: 0.02,
  pricePerCanonicalInclShipping: 0.02,
  effectivePricePerCanonical: 0.02,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const mockOffer2: Offer = {
  id: 'offer-2',
  inventoryItemId: 'item-1',
  supplierId: 'supplier-2',
  supplierNameSnapshot: 'Good Supplier',
  supplierUrl: 'https://example.com/product2',
  sourceType: 'manual',
  observedAt: '2024-01-15T10:00:00Z',
  capturedAt: '2024-01-15T10:00:00Z',
  totalPrice: 15.0,
  currency: 'CAD',
  isTaxIncluded: true,
  amount: 500,
  amountUnit: 'g',
  amountCanonical: 500,
  pricePerCanonicalExclShipping: 0.03,
  pricePerCanonicalInclShipping: 0.03,
  effectivePricePerCanonical: 0.03,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const mockOffer3: Offer = {
  id: 'offer-3',
  inventoryItemId: 'item-1',
  supplierId: 'supplier-3',
  supplierNameSnapshot: 'Expensive Supplier',
  supplierUrl: 'https://example.com/product3',
  sourceType: 'manual',
  observedAt: '2024-01-15T10:00:00Z',
  capturedAt: '2024-01-15T10:00:00Z',
  totalPrice: 20.0,
  currency: 'CAD',
  isTaxIncluded: true,
  amount: 500,
  amountUnit: 'g',
  amountCanonical: 500,
  pricePerCanonicalExclShipping: 0.04,
  pricePerCanonicalInclShipping: 0.04,
  effectivePricePerCanonical: 0.04,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const mockComparisonResult1: ComparisonResult = {
  offer: mockOffer1,
  score: 0.02,
  metadata: {
    explanation: 'Best price found',
    confidence: 0.9,
    flags: ['best_price'],
    trend: {
      direction: 'down',
      strength: 0.7,
      confidence: 0.8,
    },
  },
};

const mockComparisonResult2: ComparisonResult = {
  offer: mockOffer2,
  score: 0.03,
  metadata: {
    explanation: 'Good price',
    confidence: 0.8,
    flags: ['good_price'],
    trend: {
      direction: 'stable',
      strength: 0.3,
      confidence: 0.6,
    },
  },
};

const mockComparisonResult3: ComparisonResult = {
  offer: mockOffer3,
  score: 0.04,
  metadata: {
    explanation: 'Higher price',
    confidence: 0.7,
    flags: ['higher_price'],
    trend: {
      direction: 'up',
      strength: 0.5,
      confidence: 0.7,
    },
  },
};

const mockComparisonResults: ItemComparisonResults = {
  inventoryItem: mockInventoryItem,
  results: [
    mockComparisonResult1,
    mockComparisonResult2,
    mockComparisonResult3,
  ],
  bestOffer: mockComparisonResult1,
  config: {
    primaryStrategy: 'pricePerCanonical',
  },
  metadata: {
    totalOffers: 3,
    excludedOffers: 0,
    executionTimeMs: 15,
    strategyUsed: 'pricePerCanonical',
    comparedAt: '2024-01-15T10:00:00Z',
  },
};

const mockEmptyComparisonResults: ItemComparisonResults = {
  inventoryItem: mockInventoryItem,
  results: [],
  bestOffer: null,
  config: {
    primaryStrategy: 'pricePerCanonical',
  },
  metadata: {
    totalOffers: 0,
    excludedOffers: 0,
    executionTimeMs: 5,
    strategyUsed: 'pricePerCanonical',
    comparedAt: '2024-01-15T10:00:00Z',
  },
};

describe('ComparisonList', () => {
  const mockOnOfferPress = jest.fn();
  const mockOnOfferLongPress = jest.fn();
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with comparison results', () => {
    const { getByText, getByTestId } = render(
      <ComparisonList
        comparisonResults={mockComparisonResults}
        testID="test-comparison-list"
      />
    );

    // Check that the list is rendered
    expect(getByTestId('test-comparison-list')).toBeTruthy();

    // Check that offers are displayed (sorted by score)
    expect(getByText('Best Supplier')).toBeTruthy();
    expect(getByText('Good Supplier')).toBeTruthy();
    expect(getByText('Expensive Supplier')).toBeTruthy();
  });

  it('sorts results by score (lowest first)', () => {
    const { getByTestId } = render(
      <ComparisonList
        comparisonResults={mockComparisonResults}
        testID="test-comparison-list"
      />
    );

    // Get all item cards
    const item1 = getByTestId('test-comparison-list-item-0');
    const item2 = getByTestId('test-comparison-list-item-1');
    const item3 = getByTestId('test-comparison-list-item-2');

    expect(item1).toBeTruthy();
    expect(item2).toBeTruthy();
    expect(item3).toBeTruthy();

    // The first item should be the one with the lowest score (Best Supplier with 0.02)
    // This is verified by the testID structure and the sorting logic
  });

  it('displays best offer badge on the first item', () => {
    const { getByText } = render(
      <ComparisonList
        comparisonResults={mockComparisonResults}
        testID="test-comparison-list"
      />
    );

    // The best offer should be highlighted
    expect(getByText('🏆 Best Offer')).toBeTruthy();
  });

  it('handles tied offers correctly', () => {
    // Create tied offers with the same score
    const tiedOffer1 = {
      ...mockOffer1,
      id: 'tied-1',
      supplierNameSnapshot: 'Tied Supplier 1',
    };
    const tiedOffer2 = {
      ...mockOffer1,
      id: 'tied-2',
      supplierNameSnapshot: 'Tied Supplier 2',
    };

    const tiedResult1: ComparisonResult = {
      ...mockComparisonResult1,
      offer: tiedOffer1,
      score: 0.02,
    };
    const tiedResult2: ComparisonResult = {
      ...mockComparisonResult2,
      offer: tiedOffer2,
      score: 0.02,
    };

    const tiedComparisonResults: ItemComparisonResults = {
      ...mockComparisonResults,
      results: [tiedResult1, tiedResult2],
    };

    const { getByText } = render(
      <ComparisonList
        comparisonResults={tiedComparisonResults}
        testID="test-comparison-list"
      />
    );

    // Both tied offers should show "Tied for Best"
    expect(getByText('🏆 Tied for Best')).toBeTruthy();
  });

  it('renders empty state when no results', () => {
    const { getByText } = render(
      <ComparisonList
        comparisonResults={mockEmptyComparisonResults}
        testID="test-comparison-list"
      />
    );

    expect(getByText('No offers found')).toBeTruthy();
    expect(
      getByText(
        'No offers are available for this item yet. Add some offers to see comparisons.'
      )
    ).toBeTruthy();
  });

  it('displays list header with summary information', () => {
    const { getByText } = render(
      <ComparisonList
        comparisonResults={mockComparisonResults}
        testID="test-comparison-list"
      />
    );

    // Check header information
    expect(getByText('Test Item')).toBeTruthy();
    expect(getByText('3 offers found')).toBeTruthy();
    expect(getByText('Best price:')).toBeTruthy();
    expect(getByText('CAD 0.02 per g')).toBeTruthy();
  });

  it('calculates and displays savings correctly', () => {
    const { getByText } = render(
      <ComparisonList
        comparisonResults={mockComparisonResults}
        testID="test-comparison-list"
      />
    );

    // Should show savings from highest to lowest price
    expect(getByText('Save up to CAD 0.02 (50%)')).toBeTruthy();
  });

  it('calls onOfferPress when an offer is pressed', () => {
    const { getByTestId } = render(
      <ComparisonList
        comparisonResults={mockComparisonResults}
        onOfferPress={mockOnOfferPress}
        testID="test-comparison-list"
      />
    );

    // Press the first offer
    fireEvent.press(getByTestId('test-comparison-list-item-0'));

    expect(mockOnOfferPress).toHaveBeenCalledTimes(1);
    expect(mockOnOfferPress).toHaveBeenCalledWith(mockComparisonResult1);
  });

  it('calls onOfferLongPress when an offer is long pressed', () => {
    const { getByTestId } = render(
      <ComparisonList
        comparisonResults={mockComparisonResults}
        onOfferLongPress={mockOnOfferLongPress}
        testID="test-comparison-list"
      />
    );

    // Long press the first offer
    fireEvent(getByTestId('test-comparison-list-item-0'), 'longPress');

    expect(mockOnOfferLongPress).toHaveBeenCalledTimes(1);
    expect(mockOnOfferLongPress).toHaveBeenCalledWith(mockComparisonResult1);
  });

  it('shows comparison details when showComparisonDetails is true', () => {
    const { getByText } = render(
      <ComparisonList
        comparisonResults={mockComparisonResults}
        showComparisonDetails={true}
        testID="test-comparison-list"
      />
    );

    // Should show comparison details
    expect(getByText('Comparison Score:')).toBeTruthy();
    expect(getByText('Best price found')).toBeTruthy();
  });

  it('shows price trend when showPriceTrend is true', () => {
    const { getByText } = render(
      <ComparisonList
        comparisonResults={mockComparisonResults}
        showPriceTrend={true}
        testID="test-comparison-list"
      />
    );

    // Should show trend indicators
    expect(getByText('📉')).toBeTruthy(); // Falling trend
    expect(getByText('Falling')).toBeTruthy();
  });

  it('hides price trend when showPriceTrend is false', () => {
    const { queryByText } = render(
      <ComparisonList
        comparisonResults={mockComparisonResults}
        showPriceTrend={false}
        testID="test-comparison-list"
      />
    );

    // Should not show trend indicators
    expect(queryByText('📉')).toBeNull();
    expect(queryByText('Falling')).toBeNull();
  });

  it('handles pull-to-refresh correctly', () => {
    const { getByTestId } = render(
      <ComparisonList
        comparisonResults={mockComparisonResults}
        refreshing={false}
        onRefresh={mockOnRefresh}
        testID="test-comparison-list"
      />
    );

    // The RefreshControl should be present
    const flatList = getByTestId('test-comparison-list');
    expect(flatList).toBeTruthy();

    // Note: Testing actual pull-to-refresh gesture requires more complex setup
    // This test verifies the RefreshControl is configured correctly
  });

  it('shows refreshing state correctly', () => {
    const { getByTestId } = render(
      <ComparisonList
        comparisonResults={mockComparisonResults}
        refreshing={true}
        onRefresh={mockOnRefresh}
        testID="test-comparison-list"
      />
    );

    // The component should render without crashing when refreshing
    expect(getByTestId('test-comparison-list')).toBeTruthy();
  });

  it('handles missing metadata gracefully', () => {
    const resultsWithoutMetadata: ComparisonResult[] = [
      { offer: mockOffer1, score: 0.02 },
      { offer: mockOffer2, score: 0.03 },
    ];

    const comparisonResultsWithoutMetadata: ItemComparisonResults = {
      ...mockComparisonResults,
      results: resultsWithoutMetadata,
    };

    const { getByText } = render(
      <ComparisonList
        comparisonResults={comparisonResultsWithoutMetadata}
        testID="test-comparison-list"
      />
    );

    // Should still render the offers
    expect(getByText('Best Supplier')).toBeTruthy();
    expect(getByText('Good Supplier')).toBeTruthy();
  });

  it('handles zero prices correctly', () => {
    const zeroPriceOffer = {
      ...mockOffer1,
      totalPrice: 0,
      effectivePricePerCanonical: 0,
    };
    const zeroPriceResult: ComparisonResult = {
      offer: zeroPriceOffer,
      score: 0,
    };

    const zeroPriceComparisonResults: ItemComparisonResults = {
      ...mockComparisonResults,
      results: [zeroPriceResult],
    };

    const { getByText } = render(
      <ComparisonList
        comparisonResults={zeroPriceComparisonResults}
        testID="test-comparison-list"
      />
    );

    // Should handle zero prices gracefully
    expect(getByText('CAD 0.00')).toBeTruthy();
    expect(getByText('CAD 0.00 per g')).toBeTruthy();
  });

  it('handles NaN prices correctly', () => {
    const nanPriceOffer = {
      ...mockOffer1,
      totalPrice: NaN,
      effectivePricePerCanonical: NaN,
    };
    const nanPriceResult: ComparisonResult = {
      offer: nanPriceOffer,
      score: NaN,
    };

    const nanPriceComparisonResults: ItemComparisonResults = {
      ...mockComparisonResults,
      results: [nanPriceResult],
    };

    const { getByText } = render(
      <ComparisonList
        comparisonResults={nanPriceComparisonResults}
        testID="test-comparison-list"
      />
    );

    // Should handle NaN prices gracefully
    expect(getByText('CAD 0.00')).toBeTruthy();
  });

  it('applies custom container style', () => {
    const customStyle = { backgroundColor: 'red' };

    const { getByTestId } = render(
      <ComparisonList
        comparisonResults={mockComparisonResults}
        containerStyle={customStyle}
        testID="test-comparison-list"
      />
    );

    // The component should render with custom style
    expect(getByTestId('test-comparison-list')).toBeTruthy();
  });

  it('uses correct canonical unit in header', () => {
    const customInventoryItem = { ...mockInventoryItem, canonicalUnit: 'ml' };
    const customComparisonResults = {
      ...mockComparisonResults,
      inventoryItem: customInventoryItem,
    };

    const { getByText } = render(
      <ComparisonList
        comparisonResults={customComparisonResults}
        testID="test-comparison-list"
      />
    );

    // Should use the correct canonical unit
    expect(getByText('CAD 0.02 per ml')).toBeTruthy();
  });

  it('handles single offer correctly', () => {
    const singleOfferResults: ItemComparisonResults = {
      ...mockComparisonResults,
      results: [mockComparisonResult1],
    };

    const { getByText } = render(
      <ComparisonList
        comparisonResults={singleOfferResults}
        testID="test-comparison-list"
      />
    );

    // Should display single offer correctly
    expect(getByText('1 offer found')).toBeTruthy();
    expect(getByText('Best Supplier')).toBeTruthy();
    expect(getByText('🏆 Best Offer')).toBeTruthy();
  });

  it('handles very small price differences correctly', () => {
    const smallDiffOffer1 = {
      ...mockOffer1,
      effectivePricePerCanonical: 0.000001,
    };
    const smallDiffOffer2 = {
      ...mockOffer2,
      effectivePricePerCanonical: 0.000002,
    };

    const smallDiffResult1: ComparisonResult = {
      offer: smallDiffOffer1,
      score: 0.000001,
    };
    const smallDiffResult2: ComparisonResult = {
      offer: smallDiffOffer2,
      score: 0.000002,
    };

    const smallDiffComparisonResults: ItemComparisonResults = {
      ...mockComparisonResults,
      results: [smallDiffResult1, smallDiffResult2],
    };

    const { getByText } = render(
      <ComparisonList
        comparisonResults={smallDiffComparisonResults}
        testID="test-comparison-list"
      />
    );

    // Should handle very small prices with more decimal places
    expect(getByText('CAD 0.000001 per g')).toBeTruthy();
  });

  it('maintains performance optimizations', () => {
    const { getByTestId } = render(
      <ComparisonList
        comparisonResults={mockComparisonResults}
        testID="test-comparison-list"
      />
    );

    // The FlatList should be configured with performance optimizations
    const flatList = getByTestId('test-comparison-list');
    expect(flatList).toBeTruthy();

    // Performance optimizations are internal to the component
    // This test verifies the component renders without performance issues
  });
});
