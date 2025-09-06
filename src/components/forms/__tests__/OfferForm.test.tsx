import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { OfferForm } from '../OfferForm';
import { InventoryItem, Supplier } from '../../../storage/types';

// Mock data for testing
const mockInventoryItems: InventoryItem[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Item',
    category: 'Test Category',
    canonicalDimension: 'mass',
    canonicalUnit: 'kg',
    shelfLifeSensitive: false,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
];

const mockSuppliers: Supplier[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Supplier',
    countryCode: 'CA',
    defaultCurrency: 'CAD',
    membershipRequired: false,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
];

describe('OfferForm Zod Validation Integration', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates required fields using Zod schema', async () => {
    const { getByText } = render(
      <OfferForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        availableInventoryItems={mockInventoryItems}
        availableSuppliers={mockSuppliers}
      />
    );

    // Try to submit without filling required fields
    const submitButton = getByText('Save Offer');
    fireEvent.press(submitButton);

    // Check that validation errors appear
    await waitFor(() => {
      expect(getByText('Please select an inventory item')).toBeTruthy();
      expect(getByText('Please select a supplier')).toBeTruthy();
      expect(getByText('Total price is required')).toBeTruthy();
      expect(getByText('Currency is required')).toBeTruthy();
      expect(getByText('Amount is required')).toBeTruthy();
      expect(getByText('Amount unit is required')).toBeTruthy();
    });

    // Verify onSubmit was not called due to validation errors
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates currency format using Zod schema', async () => {
    const { getByText, getByPlaceholderText } = render(
      <OfferForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        availableInventoryItems={mockInventoryItems}
        availableSuppliers={mockSuppliers}
      />
    );

    // Fill currency with invalid format
    const currencyInput = getByPlaceholderText('e.g., CAD, USD, EUR');
    fireEvent.changeText(currencyInput, 'INVALID');

    // Trigger validation by trying to submit
    const submitButton = getByText('Save Offer');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(
        getByText('Currency must be a 3-letter code (e.g., CAD, USD)')
      ).toBeTruthy();
    });
  });

  it('validates numeric fields using Zod schema', async () => {
    const { getByText, getByPlaceholderText } = render(
      <OfferForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        availableInventoryItems={mockInventoryItems}
        availableSuppliers={mockSuppliers}
      />
    );

    // Fill with invalid numeric values
    const priceInput = getByPlaceholderText('Enter total price');
    fireEvent.changeText(priceInput, 'not-a-number');

    const amountInput = getByPlaceholderText('Quantity');
    fireEvent.changeText(amountInput, '-5');

    // Trigger validation
    const submitButton = getByText('Save Offer');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText('Total price must be a positive number')).toBeTruthy();
      expect(getByText('Amount must be a positive number')).toBeTruthy();
    });
  });

  it('validates optional tax rate field using Zod schema', async () => {
    const { getByText, getByPlaceholderText } = render(
      <OfferForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        availableInventoryItems={mockInventoryItems}
        availableSuppliers={mockSuppliers}
      />
    );

    // Toggle tax included to false to show tax rate field
    const taxIncludedSwitch = getByText('Tax Included in Price');
    fireEvent.press(taxIncludedSwitch);

    // Fill tax rate with invalid value (> 1)
    const taxRateInput = getByPlaceholderText('e.g., 0.15 for 15%');
    fireEvent.changeText(taxRateInput, '1.5');

    // Trigger validation
    const submitButton = getByText('Save Offer');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(
        getByText(
          'Tax rate must be a decimal between 0 and 1 (e.g., 0.15 for 15%)'
        )
      ).toBeTruthy();
    });
  });

  it('passes validation with valid data', async () => {
    const { getByText, getByPlaceholderText } = render(
      <OfferForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        availableInventoryItems={mockInventoryItems}
        availableSuppliers={mockSuppliers}
      />
    );

    // Fill all required fields with valid data
    const inventoryInput = getByPlaceholderText(
      'Enter inventory item ID (temporary)'
    );
    fireEvent.changeText(
      inventoryInput,
      '123e4567-e89b-12d3-a456-426614174000'
    );

    const supplierInput = getByPlaceholderText('Enter supplier ID (temporary)');
    fireEvent.changeText(supplierInput, '123e4567-e89b-12d3-a456-426614174001');

    const priceInput = getByPlaceholderText('Enter total price');
    fireEvent.changeText(priceInput, '10.99');

    const currencyInput = getByPlaceholderText('e.g., CAD, USD, EUR');
    fireEvent.changeText(currencyInput, 'CAD');

    const amountInput = getByPlaceholderText('Quantity');
    fireEvent.changeText(amountInput, '1');

    const unitInput = getByPlaceholderText('e.g., kg, L, unit');
    fireEvent.changeText(unitInput, 'kg');

    // Submit the form
    const submitButton = getByText('Save Offer');
    fireEvent.press(submitButton);

    // Verify onSubmit was called with valid data
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          inventory_item_id: '123e4567-e89b-12d3-a456-426614174000',
          supplier_id: '123e4567-e89b-12d3-a456-426614174001',
          total_price: 10.99,
          currency: 'CAD',
          amount: 1,
          amount_unit: 'kg',
        })
      );
    });
  });
});
