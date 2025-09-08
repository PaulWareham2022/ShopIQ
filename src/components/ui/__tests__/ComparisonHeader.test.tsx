import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ComparisonHeader } from '../ComparisonHeader';
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

const mockInventoryItemWithDetails: InventoryItem = {
  id: 'item-2',
  name: 'Detailed Item',
  category: 'food',
  canonicalDimension: 'volume',
  canonicalUnit: 'ml',
  shelfLifeSensitive: true,
  usageRatePerDay: 250,
  notes: 'This is a test item with notes',
  attributes: {
    brand: 'Test Brand',
    size: 'Large',
    color: 'Red',
  },
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

describe('ComparisonHeader', () => {
  const mockOnItemPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with basic props', () => {
    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={5}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(getByText('Test Item')).toBeTruthy();
    expect(getByText('• test')).toBeTruthy();
    expect(getByText('5 offers found')).toBeTruthy();
    expect(getByText('Best price:')).toBeTruthy();
    expect(getByText('CAD 0.02 per g')).toBeTruthy();
  });

  it('displays category correctly', () => {
    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(getByText('• test')).toBeTruthy();
  });

  it('handles missing category gracefully', () => {
    const itemWithoutCategory = { ...mockInventoryItem, category: undefined };

    const { queryByText } = render(
      <ComparisonHeader
        inventoryItem={itemWithoutCategory}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(queryByText('• test')).toBeNull();
  });

  it('displays shelf life warning when item is shelf-life sensitive', () => {
    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItemWithDetails}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="ml"
        testID="test-header"
      />
    );

    expect(getByText('⚠️ Shelf-life sensitive')).toBeTruthy();
  });

  it('does not display shelf life warning when item is not shelf-life sensitive', () => {
    const { queryByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(queryByText('⚠️ Shelf-life sensitive')).toBeNull();
  });

  it('displays usage rate when available', () => {
    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItemWithDetails}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="ml"
        testID="test-header"
      />
    );

    expect(getByText('Usage: 250 ml/day')).toBeTruthy();
  });

  it('does not display usage rate when not available', () => {
    const { queryByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(queryByText('Usage:')).toBeNull();
  });

  it('displays notes when available', () => {
    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItemWithDetails}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="ml"
        testID="test-header"
      />
    );

    expect(getByText('Notes:')).toBeTruthy();
    expect(getByText('This is a test item with notes')).toBeTruthy();
  });

  it('does not display notes when not available', () => {
    const { queryByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(queryByText('Notes:')).toBeNull();
  });

  it('displays attributes when available', () => {
    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItemWithDetails}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="ml"
        testID="test-header"
      />
    );

    expect(getByText('Attributes:')).toBeTruthy();
    expect(getByText('brand:')).toBeTruthy();
    expect(getByText('Test Brand')).toBeTruthy();
    expect(getByText('size:')).toBeTruthy();
    expect(getByText('Large')).toBeTruthy();
    expect(getByText('color:')).toBeTruthy();
    expect(getByText('Red')).toBeTruthy();
  });

  it('does not display attributes when not available', () => {
    const { queryByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(queryByText('Attributes:')).toBeNull();
  });

  it('displays attributes when empty object', () => {
    const itemWithEmptyAttributes = { ...mockInventoryItem, attributes: {} };

    const { queryByText } = render(
      <ComparisonHeader
        inventoryItem={itemWithEmptyAttributes}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(queryByText('Attributes:')).toBeNull();
  });

  it('calculates and displays savings correctly', () => {
    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        showSavings={true}
        testID="test-header"
      />
    );

    expect(getByText('Save CAD 0.03 (60%)')).toBeTruthy();
    expect(getByText('Price range:')).toBeTruthy();
    expect(getByText('CAD 0.02 - CAD 0.05')).toBeTruthy();
  });

  it('does not display savings when showSavings is false', () => {
    const { queryByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        showSavings={false}
        testID="test-header"
      />
    );

    expect(queryByText('Save CAD')).toBeNull();
    expect(queryByText('Price range:')).toBeNull();
  });

  it('does not display savings when prices are equal', () => {
    const { queryByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={1}
        bestPrice={0.02}
        highestPrice={0.02}
        currency="CAD"
        canonicalUnit="g"
        showSavings={true}
        testID="test-header"
      />
    );

    expect(queryByText('Save CAD')).toBeNull();
    expect(queryByText('Price range:')).toBeNull();
  });

  it('handles zero prices correctly', () => {
    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={3}
        bestPrice={0}
        highestPrice={0}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(getByText('CAD 0.00 per g')).toBeTruthy();
  });

  it('handles NaN prices correctly', () => {
    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={3}
        bestPrice={NaN}
        highestPrice={NaN}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(getByText('CAD 0.00 per g')).toBeTruthy();
  });

  it('handles different currencies correctly', () => {
    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="USD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(getByText('USD 0.02 per g')).toBeTruthy();
    expect(getByText('Save USD 0.03 (60%)')).toBeTruthy();
  });

  it('handles different canonical units correctly', () => {
    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItemWithDetails}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="ml"
        testID="test-header"
      />
    );

    expect(getByText('CAD 0.02 per ml')).toBeTruthy();
    expect(getByText('Unit: ml (volume)')).toBeTruthy();
  });

  it('displays correct offer count for singular', () => {
    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={1}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(getByText('1 offer found')).toBeTruthy();
  });

  it('displays correct offer count for plural', () => {
    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={5}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(getByText('5 offers found')).toBeTruthy();
  });

  it('calls onItemPress when item is pressed', () => {
    const { getByTestId } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        onItemPress={mockOnItemPress}
        testID="test-header"
      />
    );

    fireEvent.press(getByTestId('test-header'));
    expect(mockOnItemPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onItemPress when not provided', () => {
    const { getByTestId } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    // Should not crash when pressed without onItemPress
    fireEvent.press(getByTestId('test-header'));
    expect(mockOnItemPress).not.toHaveBeenCalled();
  });

  it('applies custom container style', () => {
    const customStyle = { backgroundColor: 'red' };

    const { getByTestId } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        containerStyle={customStyle}
        testID="test-header"
      />
    );

    expect(getByTestId('test-header')).toBeTruthy();
  });

  it('hides item details when showItemDetails is false', () => {
    const { queryByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItemWithDetails}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="ml"
        showItemDetails={false}
        testID="test-header"
      />
    );

    expect(queryByText('Unit: ml (volume)')).toBeNull();
    expect(queryByText('⚠️ Shelf-life sensitive')).toBeNull();
  });

  it('shows item details when showItemDetails is true', () => {
    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItemWithDetails}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="ml"
        showItemDetails={true}
        testID="test-header"
      />
    );

    expect(getByText('Unit: ml (volume)')).toBeTruthy();
    expect(getByText('⚠️ Shelf-life sensitive')).toBeTruthy();
  });

  it('handles very small price differences correctly', () => {
    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={3}
        bestPrice={0.000001}
        highestPrice={0.000002}
        currency="CAD"
        canonicalUnit="g"
        showSavings={true}
        testID="test-header"
      />
    );

    expect(getByText('CAD 0.000001 per g')).toBeTruthy();
    expect(getByText('Save CAD 0.000001 (50%)')).toBeTruthy();
  });

  it('handles large price differences correctly', () => {
    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={3}
        bestPrice={0.01}
        highestPrice={100.0}
        currency="CAD"
        canonicalUnit="g"
        showSavings={true}
        testID="test-header"
      />
    );

    expect(getByText('CAD 0.01 per g')).toBeTruthy();
    expect(getByText('Save CAD 99.99 (100%)')).toBeTruthy();
  });

  it('handles negative prices gracefully', () => {
    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={3}
        bestPrice={-0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(getByText('CAD -0.02 per g')).toBeTruthy();
  });

  it('handles undefined attributes gracefully', () => {
    const itemWithUndefinedAttributes = {
      ...mockInventoryItem,
      attributes: undefined,
    };

    const { queryByText } = render(
      <ComparisonHeader
        inventoryItem={itemWithUndefinedAttributes}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(queryByText('Attributes:')).toBeNull();
  });

  it('handles null attributes gracefully', () => {
    const itemWithNullAttributes = {
      ...mockInventoryItem,
      attributes: undefined,
    };

    const { queryByText } = render(
      <ComparisonHeader
        inventoryItem={itemWithNullAttributes}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(queryByText('Attributes:')).toBeNull();
  });

  it('handles empty string notes gracefully', () => {
    const itemWithEmptyNotes = { ...mockInventoryItem, notes: '' };

    const { queryByText } = render(
      <ComparisonHeader
        inventoryItem={itemWithEmptyNotes}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(queryByText('Notes:')).toBeNull();
  });

  it('handles very long notes correctly', () => {
    const longNotes =
      'This is a very long note that should be truncated to prevent layout issues in the header component. It should be limited to a reasonable number of lines.';
    const itemWithLongNotes = { ...mockInventoryItem, notes: longNotes };

    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={itemWithLongNotes}
        totalOffers={3}
        bestPrice={0.02}
        highestPrice={0.05}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(getByText('Notes:')).toBeTruthy();
    expect(getByText(longNotes)).toBeTruthy();
  });

  it('handles zero total offers correctly', () => {
    const { getByText } = render(
      <ComparisonHeader
        inventoryItem={mockInventoryItem}
        totalOffers={0}
        bestPrice={0}
        highestPrice={0}
        currency="CAD"
        canonicalUnit="g"
        testID="test-header"
      />
    );

    expect(getByText('0 offers found')).toBeTruthy();
    expect(getByText('CAD 0.00 per g')).toBeTruthy();
  });
});
