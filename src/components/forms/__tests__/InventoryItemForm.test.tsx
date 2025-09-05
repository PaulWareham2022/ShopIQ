import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { InventoryItemForm } from '../InventoryItemForm';
// import { ValidatedInventoryItem } from '../../../storage/validation/schemas';

// Mock the canonical units utilities
jest.mock('../../../storage/utils/canonical-units', () => ({
  getSupportedUnitsForDimension: jest.fn(() => ['kg', 'g', 'lb']),
  getUnitDimension: jest.fn((unit: string) => {
    const massUnits = ['kg', 'g', 'lb'];
    return massUnits.includes(unit) ? 'mass' : undefined;
  }),
  isSupportedUnit: jest.fn((unit: string) => {
    const supportedUnits = ['kg', 'g', 'lb', 'ml', 'l'];
    return supportedUnits.includes(unit);
  }),
  getSupportedDimensions: jest.fn(() => ['mass', 'volume']),
}));

describe('InventoryItemForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form fields correctly', () => {
    const { getByText } = render(
      <InventoryItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    expect(getByText('Item Name *')).toBeTruthy();
    expect(getByText('Category')).toBeTruthy();
    expect(getByText('Canonical Unit *')).toBeTruthy();
    expect(getByText('Shelf-life Sensitive')).toBeTruthy();
    expect(getByText('Save Item')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('shows validation errors for required fields', async () => {
    const { getByText } = render(
      <InventoryItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    const submitButton = getByText('Save Item');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText('Item name is required')).toBeTruthy();
      expect(getByText('Canonical unit is required')).toBeTruthy();
    });
  });

  it('validates unit input', async () => {
    const { getByText, getByPlaceholderText } = render(
      <InventoryItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    const nameInput = getByPlaceholderText('Enter item name');
    const unitInput = getByPlaceholderText('Enter unit (e.g., kg, ml, unit)');
    const submitButton = getByText('Save Item');

    fireEvent.changeText(nameInput, 'Test Item');
    fireEvent.changeText(unitInput, 'invalid-unit');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(
        getByText('Unsupported unit. Please select from suggestions.')
      ).toBeTruthy();
    });
  });

  it('calls onSubmit with correct data when form is valid', async () => {
    const { getByText, getByPlaceholderText } = render(
      <InventoryItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    const nameInput = getByPlaceholderText('Enter item name');
    const unitInput = getByPlaceholderText('Enter unit (e.g., kg, ml, unit)');
    const submitButton = getByText('Save Item');

    fireEvent.changeText(nameInput, 'Test Item');
    fireEvent.changeText(unitInput, 'kg');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Item',
          canonicalUnit: 'kg',
          canonicalDimension: 'mass',
          shelfLifeSensitive: false,
        })
      );
    });
  });

  it('calls onCancel when cancel button is pressed', () => {
    const { getByText } = render(
      <InventoryItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows shelf life days field when shelf life sensitive is enabled', () => {
    const { getByText, getByPlaceholderText } = render(
      <InventoryItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    const shelfLifeSwitch = getByText('Shelf-life Sensitive');
    fireEvent.press(shelfLifeSwitch);

    expect(getByPlaceholderText('Enter shelf life in days')).toBeTruthy();
  });

  it('validates shelf life days as positive number', async () => {
    const { getByText, getByPlaceholderText } = render(
      <InventoryItemForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    const shelfLifeSwitch = getByText('Shelf-life Sensitive');
    fireEvent.press(shelfLifeSwitch);

    const shelfLifeInput = getByPlaceholderText('Enter shelf life in days');
    const submitButton = getByText('Save Item');

    fireEvent.changeText(shelfLifeInput, '-5');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText('Shelf life must be a positive number')).toBeTruthy();
    });
  });
});
