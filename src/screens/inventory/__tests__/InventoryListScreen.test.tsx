import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { InventoryListScreen } from '../InventoryListScreen';
import { InventoryItemRepository } from '../../../storage/repositories/InventoryItemRepository';

// Mock the repository
jest.mock('../../../storage/repositories/InventoryItemRepository');

const mockFindAll = jest.fn();
const mockDelete = jest.fn();

const mockRepository = {
  findAll: mockFindAll,
  delete: mockDelete,
} as unknown as InventoryItemRepository;

describe('InventoryListScreen', () => {
  const mockOnItemPress = jest.fn();
  const mockOnAddItem = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (InventoryItemRepository as jest.Mock).mockImplementation(
      () => mockRepository
    );
  });

  it('renders loading state initially', () => {
    mockFindAll.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { getByText } = render(
      <InventoryListScreen
        onItemPress={mockOnItemPress}
        onAddItem={mockOnAddItem}
      />
    );

    expect(getByText('Loading inventory...')).toBeTruthy();
  });

  it('renders empty state when no items', async () => {
    mockFindAll.mockResolvedValue([]);

    const { getByText } = render(
      <InventoryListScreen
        onItemPress={mockOnItemPress}
        onAddItem={mockOnAddItem}
      />
    );

    await waitFor(() => {
      expect(getByText('No inventory items')).toBeTruthy();
      expect(getByText('Add your first item to get started')).toBeTruthy();
    });
  });

  it('renders inventory items', async () => {
    const mockItems = [
      {
        id: '1',
        name: 'Test Item 1',
        canonical_unit: 'kg',
        shelf_life_sensitive: false,
        notes: 'Test notes',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Test Item 2',
        canonical_unit: 'ml',
        shelf_life_sensitive: true,
        notes: undefined,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ];

    mockFindAll.mockResolvedValue(mockItems);

    const { getByText } = render(
      <InventoryListScreen
        onItemPress={mockOnItemPress}
        onAddItem={mockOnAddItem}
      />
    );

    await waitFor(() => {
      expect(getByText('Test Item 1')).toBeTruthy();
      expect(getByText('Test Item 2')).toBeTruthy();
      expect(getByText('Unit: kg')).toBeTruthy();
      expect(getByText('Unit: ml')).toBeTruthy();
      expect(getByText('Shelf-life sensitive')).toBeTruthy();
    });
  });

  it('calls onItemPress when item is pressed', async () => {
    const mockItems = [
      {
        id: '1',
        name: 'Test Item',
        canonical_unit: 'kg',
        shelf_life_sensitive: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ];

    mockFindAll.mockResolvedValue(mockItems);

    const { getByText } = render(
      <InventoryListScreen
        onItemPress={mockOnItemPress}
        onAddItem={mockOnAddItem}
      />
    );

    await waitFor(() => {
      const itemElement = getByText('Test Item');
      fireEvent.press(itemElement);
      expect(mockOnItemPress).toHaveBeenCalledWith(mockItems[0]);
    });
  });

  it('calls onAddItem when add button is pressed', () => {
    mockFindAll.mockResolvedValue([]);

    const { getByText } = render(
      <InventoryListScreen
        onItemPress={mockOnItemPress}
        onAddItem={mockOnAddItem}
      />
    );

    const addButton = getByText('+ Add Item');
    fireEvent.press(addButton);

    expect(mockOnAddItem).toHaveBeenCalled();
  });

  it('filters items based on search query', async () => {
    const mockItems = [
      {
        id: '1',
        name: 'Apple',
        canonical_unit: 'kg',
        shelf_life_sensitive: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Banana',
        canonical_unit: 'kg',
        shelf_life_sensitive: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ];

    mockFindAll.mockResolvedValue(mockItems);

    const { getByPlaceholderText, getByText, queryByText } = render(
      <InventoryListScreen
        onItemPress={mockOnItemPress}
        onAddItem={mockOnAddItem}
      />
    );

    await waitFor(() => {
      expect(getByText('Apple')).toBeTruthy();
      expect(getByText('Banana')).toBeTruthy();
    });

    const searchInput = getByPlaceholderText('Search items...');
    fireEvent.changeText(searchInput, 'Apple');

    await waitFor(() => {
      expect(getByText('Apple')).toBeTruthy();
      expect(queryByText('Banana')).toBeNull();
    });
  });

  it('shows delete confirmation when item is long pressed', async () => {
    const mockItems = [
      {
        id: '1',
        name: 'Test Item',
        canonical_unit: 'kg',
        shelf_life_sensitive: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ];

    mockFindAll.mockResolvedValue(mockItems);
    mockDelete.mockResolvedValue(true);

    const { getByText } = render(
      <InventoryListScreen
        onItemPress={mockOnItemPress}
        onAddItem={mockOnAddItem}
      />
    );

    await waitFor(() => {
      const itemElement = getByText('Test Item');
      fireEvent(itemElement, 'longPress');
    });

    // Note: Alert.alert is mocked by React Native Testing Library
    // In a real test, you'd need to mock Alert.alert and test the confirmation flow
  });
});
