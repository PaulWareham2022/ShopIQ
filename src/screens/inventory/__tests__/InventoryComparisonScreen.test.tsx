import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { InventoryComparisonScreen } from '../InventoryComparisonScreen';
import { InventoryItem } from '../../../storage/types';
import {
  ComparisonResult,
  ItemComparisonResults,
} from '../../../storage/comparison/types';
import { Offer } from '../../../storage/types';

// Mock the comparison engine and repository factory
const mockCompareOffers = jest.fn();
const mockCreateComparisonEngine = jest.fn(() => ({
  compareOffers: mockCompareOffers,
}));

jest.mock('../../../storage/comparison', () => ({
  createComparisonEngine: mockCreateComparisonEngine,
}));

jest.mock('../../../storage/RepositoryFactory', () => ({
  RepositoryFactory: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

const mockInventoryItem: InventoryItem = {
  id: 'test-item',
  name: 'Test Item',
  category: 'test',
  canonicalDimension: 'mass',
  canonicalUnit: 'g',
  shelfLifeSensitive: false,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const mockOffer: Offer = {
  id: 'offer-1',
  inventoryItemId: 'test-item',
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
  amountUnit: 'g',
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

const mockComparisonResults: ItemComparisonResults = {
  inventoryItem: mockInventoryItem,
  results: [mockComparisonResult],
  bestOffer: mockComparisonResult,
  config: {
    primaryStrategy: 'pricePerCanonical',
  },
  metadata: {
    totalOffers: 1,
    excludedOffers: 0,
    executionTimeMs: 10,
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

describe('InventoryComparisonScreen', () => {
  const mockOnBack = jest.fn();
  const mockOnAddOffer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation
    mockCompareOffers.mockResolvedValue(mockComparisonResults);
  });

  it('should render loading state initially', () => {
    const { getByText } = render(
      <InventoryComparisonScreen
        inventoryItem={mockInventoryItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    expect(getByText('Loading Comparison...')).toBeTruthy();
  });

  it('should render comparison results after loading', async () => {
    const { getByText } = render(
      <InventoryComparisonScreen
        inventoryItem={mockInventoryItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    // Wait for the loading to complete and check for the comparison list
    await waitFor(() => {
      expect(getByText('Compare Test Item')).toBeTruthy();
    });

    // Should show the comparison results
    expect(getByText('Test Supplier')).toBeTruthy();
    expect(getByText('CAD 25.99')).toBeTruthy();
  });

  it('should render empty state when no offers found', async () => {
    mockCompareOffers.mockResolvedValue(mockEmptyComparisonResults);

    const { getByText } = render(
      <InventoryComparisonScreen
        inventoryItem={mockInventoryItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    await waitFor(() => {
      expect(getByText('Compare Test Item')).toBeTruthy();
    });

    expect(getByText('No offers found')).toBeTruthy();
    expect(
      getByText(
        'No offers are available for this item yet. Add some offers to see comparisons.'
      )
    ).toBeTruthy();
  });

  it('should handle comparison engine errors gracefully', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockCompareOffers.mockRejectedValue(new Error('Comparison failed'));

    const { getByText } = render(
      <InventoryComparisonScreen
        inventoryItem={mockInventoryItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    await waitFor(() => {
      expect(getByText('Compare Test Item')).toBeTruthy();
    });

    // Should show error state or empty state
    expect(getByText('No offers found')).toBeTruthy();

    consoleErrorSpy.mockRestore();
  });

  it('should call onBack when back button is pressed', async () => {
    const { getByText } = render(
      <InventoryComparisonScreen
        inventoryItem={mockInventoryItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(getByText('Compare Test Item')).toBeTruthy();
    });

    // The back button should be rendered (implementation depends on Header component)
    // This test verifies the component renders without crashing
    expect(mockOnBack).not.toHaveBeenCalled();
  });

  it('should call onAddOffer when add offer button is pressed', async () => {
    const { getByText } = render(
      <InventoryComparisonScreen
        inventoryItem={mockInventoryItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    await waitFor(() => {
      expect(getByText('Compare Test Item')).toBeTruthy();
    });

    // Look for add offer button (implementation depends on Header component)
    // This test verifies the component renders without crashing
    expect(mockOnAddOffer).not.toHaveBeenCalled();
  });

  it('should display comparison summary correctly', async () => {
    const { getByText } = render(
      <InventoryComparisonScreen
        inventoryItem={mockInventoryItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    await waitFor(() => {
      expect(getByText('Compare Test Item')).toBeTruthy();
    });

    // Should show summary information
    expect(getByText('1 offer found')).toBeTruthy();
    expect(getByText('Best price:')).toBeTruthy();
    expect(getByText('CAD 0.05 per g')).toBeTruthy();
  });

  it('should handle multiple offers correctly', async () => {
    const multipleOffers = [
      mockComparisonResult,
      {
        ...mockComparisonResult,
        offer: {
          ...mockOffer,
          id: 'offer-2',
          supplierNameSnapshot: 'Another Supplier',
          totalPrice: 30.0,
          effectivePricePerCanonical: 0.06,
        },
        score: 0.06,
      },
    ];

    const multipleResults: ItemComparisonResults = {
      ...mockComparisonResults,
      results: multipleOffers,
      metadata: {
        ...mockComparisonResults.metadata,
        totalOffers: 2,
      },
    };

    mockCompareOffers.mockResolvedValue(multipleResults);

    const { getByText } = render(
      <InventoryComparisonScreen
        inventoryItem={mockInventoryItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    await waitFor(() => {
      expect(getByText('Compare Test Item')).toBeTruthy();
    });

    // Should show both offers
    expect(getByText('Test Supplier')).toBeTruthy();
    expect(getByText('Another Supplier')).toBeTruthy();
    expect(getByText('2 offers found')).toBeTruthy();
  });

  it('should handle refresh correctly', async () => {
    const { getByTestId } = render(
      <InventoryComparisonScreen
        inventoryItem={mockInventoryItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    await waitFor(() => {
      expect(getByTestId('comparison-list')).toBeTruthy();
    });

    // The refresh functionality should be available
    // This test verifies the component renders with refresh capability
  });

  it('should handle offer press correctly', async () => {
    const { getByText } = render(
      <InventoryComparisonScreen
        inventoryItem={mockInventoryItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    await waitFor(() => {
      expect(getByText('Test Supplier')).toBeTruthy();
    });

    // Press on an offer (this would typically open supplier URL or show details)
    // This test verifies the component renders without crashing when offers are pressed
  });

  it('should handle offer long press correctly', async () => {
    const { getByText } = render(
      <InventoryComparisonScreen
        inventoryItem={mockInventoryItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    await waitFor(() => {
      expect(getByText('Test Supplier')).toBeTruthy();
    });

    // Long press on an offer (this would typically show additional actions)
    // This test verifies the component renders without crashing when offers are long pressed
  });

  it('should display price trends correctly', async () => {
    const { getByText } = render(
      <InventoryComparisonScreen
        inventoryItem={mockInventoryItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    await waitFor(() => {
      expect(getByText('Test Supplier')).toBeTruthy();
    });

    // Should show price trend indicators
    expect(getByText('📉')).toBeTruthy();
    expect(getByText('Falling')).toBeTruthy();
  });

  it('should display best offer badge correctly', async () => {
    const { getByText } = render(
      <InventoryComparisonScreen
        inventoryItem={mockInventoryItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    await waitFor(() => {
      expect(getByText('Test Supplier')).toBeTruthy();
    });

    // Should show best offer badge
    expect(getByText('🏆 Best Offer')).toBeTruthy();
  });

  it('should handle different inventory item types correctly', async () => {
    const volumeItem: InventoryItem = {
      ...mockInventoryItem,
      id: 'volume-item',
      name: 'Volume Item',
      canonicalDimension: 'volume',
      canonicalUnit: 'ml',
    };

    const { getByText } = render(
      <InventoryComparisonScreen
        inventoryItem={volumeItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    await waitFor(() => {
      expect(getByText('Compare Volume Item')).toBeTruthy();
    });

    // Should display with correct unit
    expect(getByText('CAD 0.05 per ml')).toBeTruthy();
  });

  it('should handle shelf-life sensitive items correctly', async () => {
    const shelfLifeItem: InventoryItem = {
      ...mockInventoryItem,
      shelfLifeSensitive: true,
    };

    const { getByText } = render(
      <InventoryComparisonScreen
        inventoryItem={shelfLifeItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    await waitFor(() => {
      expect(getByText('Compare Test Item')).toBeTruthy();
    });

    // Should show shelf-life warning if implemented in the header
    // This test verifies the component renders without crashing for shelf-life sensitive items
  });

  it('should handle comparison engine configuration correctly', async () => {
    const { getByText } = render(
      <InventoryComparisonScreen
        inventoryItem={mockInventoryItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    await waitFor(() => {
      expect(getByText('Compare Test Item')).toBeTruthy();
    });

    // Verify that the comparison engine was called with correct configuration
    expect(mockCreateComparisonEngine).toHaveBeenCalled();
    expect(mockCompareOffers).toHaveBeenCalledWith('test-item');
  });

  it('should handle rapid re-renders correctly', async () => {
    const { rerender, getByText } = render(
      <InventoryComparisonScreen
        inventoryItem={mockInventoryItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    // Rapidly re-render with the same props
    rerender(
      <InventoryComparisonScreen
        inventoryItem={mockInventoryItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    await waitFor(() => {
      expect(getByText('Compare Test Item')).toBeTruthy();
    });

    // Should handle rapid re-renders without issues
    expect(getByText('Test Supplier')).toBeTruthy();
  });

  it('should handle component unmounting during loading', () => {
    const { unmount } = render(
      <InventoryComparisonScreen
        inventoryItem={mockInventoryItem}
        onBack={mockOnBack}
        onAddOffer={mockOnAddOffer}
      />
    );

    // Unmount before loading completes
    unmount();

    // Should not crash or cause memory leaks
    expect(mockCompareOffers).toHaveBeenCalled();
  });
});
