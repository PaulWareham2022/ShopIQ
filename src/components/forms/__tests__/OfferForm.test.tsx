import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { OfferForm } from '../OfferForm';
import { InventoryItem, Supplier } from '../../../storage/types';
import { getRepositoryFactory } from '../../../storage/RepositoryFactory';

// Mock the canonical units utilities
jest.mock('../../../storage/utils/canonical-units', () => ({
  validateAndConvert: jest.fn(),
  getCanonicalUnit: jest.fn(),
  isSupportedUnit: jest.fn(),
  formatAmount: jest.fn(),
}));

// Mock the repository factory
jest.mock('../../../storage/RepositoryFactory');
const mockGetRepositoryFactory = getRepositoryFactory as jest.MockedFunction<
  typeof getRepositoryFactory
>;

// Import mocked functions
import {
  validateAndConvert,
  getCanonicalUnit,
  isSupportedUnit,
  formatAmount,
} from '../../../storage/utils/canonical-units';

const mockValidateAndConvert = validateAndConvert as jest.MockedFunction<
  typeof validateAndConvert
>;
const mockGetCanonicalUnit = getCanonicalUnit as jest.MockedFunction<
  typeof getCanonicalUnit
>;
const mockIsSupportedUnit = isSupportedUnit as jest.MockedFunction<
  typeof isSupportedUnit
>;
const mockFormatAmount = formatAmount as jest.MockedFunction<
  typeof formatAmount
>;

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
  {
    id: '123e4567-e89b-12d3-a456-426614174002',
    name: 'Another Item',
    category: 'Another Category',
    canonicalDimension: 'volume',
    canonicalUnit: 'L',
    shelfLifeSensitive: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
];

const mockSuppliers: Supplier[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Supplier',
    countryCode: 'CA',
    regionCode: 'ON',
    defaultCurrency: 'CAD',
    membershipRequired: false,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174003',
    name: 'Another Supplier',
    countryCode: 'US',
    regionCode: 'NY',
    defaultCurrency: 'USD',
    membershipRequired: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
];

// Mock repository implementations
const mockInventoryRepo = {
  findAll: jest.fn().mockResolvedValue(mockInventoryItems),
};

const mockSupplierRepo = {
  findAll: jest.fn().mockResolvedValue(mockSuppliers),
};

const mockFactory = {
  getInventoryItemRepository: jest.fn().mockResolvedValue(mockInventoryRepo),
  getSupplierRepository: jest.fn().mockResolvedValue(mockSupplierRepo),
} as unknown as ReturnType<typeof getRepositoryFactory>;

describe('OfferForm Auto-Fill and Linking Logic', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRepositoryFactory.mockReturnValue(mockFactory);

    // Mock Date.now() to return a consistent timestamp for testing
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2024-01-15T10:30:00.000Z');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Auto-fill functionality', () => {
    it('auto-fills the observed date with current timestamp', async () => {
      const { getByDisplayValue } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Wait for component to render and auto-fill date
      await waitFor(() => {
        // The DatePicker should display the formatted current date
        expect(getByDisplayValue('2024-01-15T10:30:00.000Z')).toBeTruthy();
      });
    });

    it('allows editing the auto-filled date', async () => {
      const { getByDisplayValue } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      await waitFor(() => {
        const dateInput = getByDisplayValue('2024-01-15T10:30:00.000Z');

        // Change the date
        fireEvent.changeText(dateInput, '2024-01-20T15:45:00.000Z');

        // Verify the date was updated
        expect(getByDisplayValue('2024-01-20T15:45:00.000Z')).toBeTruthy();
      });
    });
  });

  describe('Repository integration and data fetching', () => {
    it('fetches inventory items and suppliers when not provided as props', async () => {
      render(<OfferForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      // Wait for data to be fetched
      await waitFor(() => {
        expect(mockFactory.getInventoryItemRepository).toHaveBeenCalled();
        expect(mockFactory.getSupplierRepository).toHaveBeenCalled();
        expect(mockInventoryRepo.findAll).toHaveBeenCalled();
        expect(mockSupplierRepo.findAll).toHaveBeenCalled();
      });
    });

    it('does not fetch data when provided as props', async () => {
      render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Wait a bit to ensure useEffect has run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Verify repositories were not called
      expect(mockFactory.getInventoryItemRepository).not.toHaveBeenCalled();
      expect(mockFactory.getSupplierRepository).not.toHaveBeenCalled();
    });

    it('handles repository fetch errors gracefully', async () => {
      // Mock repository to throw error
      const errorFactory = {
        getInventoryItemRepository: jest
          .fn()
          .mockRejectedValue(new Error('Database error')),
        getSupplierRepository: jest
          .fn()
          .mockRejectedValue(new Error('Database error')),
      } as unknown as ReturnType<typeof getRepositoryFactory>;
      mockGetRepositoryFactory.mockReturnValue(errorFactory);

      const { getByText } = render(
        <OfferForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      // Wait for error to be displayed
      await waitFor(() => {
        expect(getByText('Error Loading Form')).toBeTruthy();
        expect(
          getByText('Failed to load form data. Please try again.')
        ).toBeTruthy();
        expect(getByText('Retry')).toBeTruthy();
      });
    });

    it('filters out deleted items and suppliers', async () => {
      // Add deleted items to mock data
      const itemsWithDeleted = [
        ...mockInventoryItems,
        {
          id: '123e4567-e89b-12d3-a456-426614174999',
          name: 'Deleted Item',
          category: 'Test',
          canonicalDimension: 'mass' as const,
          canonicalUnit: 'kg',
          shelfLifeSensitive: false,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          deleted_at: '2024-01-01T12:00:00.000Z', // This item is deleted
        },
      ];

      const suppliersWithDeleted = [
        ...mockSuppliers,
        {
          id: '123e4567-e89b-12d3-a456-426614174998',
          name: 'Deleted Supplier',
          countryCode: 'CA',
          defaultCurrency: 'CAD',
          membershipRequired: false,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          deleted_at: '2024-01-01T12:00:00.000Z', // This supplier is deleted
        },
      ];

      mockInventoryRepo.findAll.mockResolvedValue(itemsWithDeleted);
      mockSupplierRepo.findAll.mockResolvedValue(suppliersWithDeleted);

      const { getByText } = render(
        <OfferForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      // Wait for data to load
      await waitFor(() => {
        // Open inventory picker
        const inventoryPicker = getByText('Select an inventory item...');
        fireEvent.press(inventoryPicker);
      });

      // Verify deleted item is not shown
      await waitFor(() => {
        expect(() => getByText('Deleted Item')).toThrow();
        // But regular items should be shown
        expect(getByText('Test Item')).toBeTruthy();
        expect(getByText('Another Item')).toBeTruthy();
      });
    });
  });

  describe('Picker component integration', () => {
    it('displays inventory items in picker with correct format', async () => {
      const { getByText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Open inventory picker
      const inventoryPicker = getByText('Select an inventory item...');
      fireEvent.press(inventoryPicker);

      // Verify items are displayed with name and category
      await waitFor(() => {
        expect(getByText('Test Item')).toBeTruthy();
        expect(getByText('Test Category')).toBeTruthy();
        expect(getByText('Another Item')).toBeTruthy();
        expect(getByText('Another Category')).toBeTruthy();
      });
    });

    it('displays suppliers in picker with correct format', async () => {
      const { getByText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Open supplier picker
      const supplierPicker = getByText('Select a supplier...');
      fireEvent.press(supplierPicker);

      // Verify suppliers are displayed with name and location
      await waitFor(() => {
        expect(getByText('Test Supplier')).toBeTruthy();
        expect(getByText('CA - ON')).toBeTruthy();
        expect(getByText('Another Supplier')).toBeTruthy();
        expect(getByText('US - NY')).toBeTruthy();
      });
    });

    it('updates form values when picker selections are made', async () => {
      const { getByText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Select inventory item
      const inventoryPicker = getByText('Select an inventory item...');
      fireEvent.press(inventoryPicker);

      await waitFor(() => {
        const testItem = getByText('Test Item');
        fireEvent.press(testItem);
      });

      // Select supplier
      const supplierPicker = getByText('Select a supplier...');
      fireEvent.press(supplierPicker);

      await waitFor(() => {
        const testSupplier = getByText('Test Supplier');
        fireEvent.press(testSupplier);
      });

      // Verify selections are reflected in the form
      await waitFor(() => {
        // The picker should now show the selected values
        expect(getByText('Test Item')).toBeTruthy();
        expect(getByText('Test Supplier')).toBeTruthy();
      });
    });

    it('shows empty state when no items are available', async () => {
      const { getByText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={[]}
          availableSuppliers={[]}
        />
      );

      // Open inventory picker
      const inventoryPicker = getByText('Select an inventory item...');
      fireEvent.press(inventoryPicker);

      // Verify empty state message
      await waitFor(() => {
        expect(
          getByText('No inventory items available. Add some items first.')
        ).toBeTruthy();
      });
    });
  });

  describe('Form validation with picker integration', () => {
    it('validates required picker selections', async () => {
      const { getByText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Try to submit without making selections
      const submitButton = getByText('Save Offer');
      fireEvent.press(submitButton);

      // Check that validation errors appear for picker fields
      await waitFor(() => {
        expect(getByText('Please select an inventory item')).toBeTruthy();
        expect(getByText('Please select a supplier')).toBeTruthy();
      });

      // Verify onSubmit was not called due to validation errors
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('passes validation with valid picker selections', async () => {
      const { getByText, getByPlaceholderText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Make picker selections
      const inventoryPicker = getByText('Select an inventory item...');
      fireEvent.press(inventoryPicker);
      await waitFor(() => {
        const testItem = getByText('Test Item');
        fireEvent.press(testItem);
      });

      const supplierPicker = getByText('Select a supplier...');
      fireEvent.press(supplierPicker);
      await waitFor(() => {
        const testSupplier = getByText('Test Supplier');
        fireEvent.press(testSupplier);
      });

      // Fill other required fields
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

      // Verify onSubmit was called with correct data including picker selections
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            inventory_item_id: '123e4567-e89b-12d3-a456-426614174000',
            supplier_id: '123e4567-e89b-12d3-a456-426614174001',
            supplier_name_snapshot: 'Test Supplier',
            total_price: 10.99,
            currency: 'CAD',
            amount: 1,
            amount_unit: 'kg',
            observed_at: '2024-01-15T10:30:00.000Z',
          })
        );
      });
    });
  });

  describe('Supplier name snapshot functionality', () => {
    it('automatically captures supplier name snapshot when supplier is selected', async () => {
      const { getByText, getByPlaceholderText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Select supplier
      const supplierPicker = getByText('Select a supplier...');
      fireEvent.press(supplierPicker);
      await waitFor(() => {
        const testSupplier = getByText('Test Supplier');
        fireEvent.press(testSupplier);
      });

      // Fill minimum required fields and submit
      const inventoryPicker = getByText('Select an inventory item...');
      fireEvent.press(inventoryPicker);
      await waitFor(() => {
        const testItem = getByText('Test Item');
        fireEvent.press(testItem);
      });

      const priceInput = getByPlaceholderText('Enter total price');
      fireEvent.changeText(priceInput, '10.99');

      const currencyInput = getByPlaceholderText('e.g., CAD, USD, EUR');
      fireEvent.changeText(currencyInput, 'CAD');

      const amountInput = getByPlaceholderText('Quantity');
      fireEvent.changeText(amountInput, '1');

      const unitInput = getByPlaceholderText('e.g., kg, L, unit');
      fireEvent.changeText(unitInput, 'kg');

      const submitButton = getByText('Save Offer');
      fireEvent.press(submitButton);

      // Verify supplier name was captured in snapshot
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            supplier_name_snapshot: 'Test Supplier',
          })
        );
      });
    });
  });

  describe('Photo URI field functionality', () => {
    it('should allow entering a photo URI', async () => {
      const { getByPlaceholderText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      const photoUriInput = getByPlaceholderText('Path to product photo');
      fireEvent.changeText(photoUriInput, 'https://example.com/photo.jpg');

      expect(photoUriInput.props.value).toBe('https://example.com/photo.jpg');
    });

    it('should include photo URI in form submission when provided', async () => {
      const { getByText, getByPlaceholderText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Fill required fields
      const inventoryPicker = getByText('Select an inventory item...');
      fireEvent.press(inventoryPicker);
      await waitFor(() => {
        const testItem = getByText('Test Item');
        fireEvent.press(testItem);
      });

      const supplierPicker = getByText('Select a supplier...');
      fireEvent.press(supplierPicker);
      await waitFor(() => {
        const testSupplier = getByText('Test Supplier');
        fireEvent.press(testSupplier);
      });

      fireEvent.changeText(getByPlaceholderText('Enter total price'), '10.99');
      fireEvent.changeText(getByPlaceholderText('e.g., CAD, USD, EUR'), 'CAD');
      fireEvent.changeText(getByPlaceholderText('Quantity'), '1');
      fireEvent.changeText(getByPlaceholderText('e.g., kg, L, unit'), 'kg');

      // Add photo URI
      const photoUriInput = getByPlaceholderText('Path to product photo');
      fireEvent.changeText(
        photoUriInput,
        'https://example.com/product-photo.jpg'
      );

      // Submit form
      const submitButton = getByText('Save Offer');
      fireEvent.press(submitButton);

      // Verify photo URI is included in submission
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            photo_uri: 'https://example.com/product-photo.jpg',
          })
        );
      });
    });

    it('should handle empty photo URI gracefully', async () => {
      const { getByText, getByPlaceholderText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Fill required fields
      const inventoryPicker = getByText('Select an inventory item...');
      fireEvent.press(inventoryPicker);
      await waitFor(() => {
        const testItem = getByText('Test Item');
        fireEvent.press(testItem);
      });

      const supplierPicker = getByText('Select a supplier...');
      fireEvent.press(supplierPicker);
      await waitFor(() => {
        const testSupplier = getByText('Test Supplier');
        fireEvent.press(testSupplier);
      });

      fireEvent.changeText(getByPlaceholderText('Enter total price'), '10.99');
      fireEvent.changeText(getByPlaceholderText('e.g., CAD, USD, EUR'), 'CAD');
      fireEvent.changeText(getByPlaceholderText('Quantity'), '1');
      fireEvent.changeText(getByPlaceholderText('e.g., kg, L, unit'), 'kg');

      // Leave photo URI empty
      const photoUriInput = getByPlaceholderText('Path to product photo');
      expect(photoUriInput.props.value).toBe('');

      // Submit form
      const submitButton = getByText('Save Offer');
      fireEvent.press(submitButton);

      // Verify form submits successfully without photo URI
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            photo_uri: undefined,
          })
        );
      });
    });

    it('should validate photo URI format when provided', async () => {
      const { getByText, getByPlaceholderText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Fill required fields
      const inventoryPicker = getByText('Select an inventory item...');
      fireEvent.press(inventoryPicker);
      await waitFor(() => {
        const testItem = getByText('Test Item');
        fireEvent.press(testItem);
      });

      const supplierPicker = getByText('Select a supplier...');
      fireEvent.press(supplierPicker);
      await waitFor(() => {
        const testSupplier = getByText('Test Supplier');
        fireEvent.press(testSupplier);
      });

      fireEvent.changeText(getByPlaceholderText('Enter total price'), '10.99');
      fireEvent.changeText(getByPlaceholderText('e.g., CAD, USD, EUR'), 'CAD');
      fireEvent.changeText(getByPlaceholderText('Quantity'), '1');
      fireEvent.changeText(getByPlaceholderText('e.g., kg, L, unit'), 'kg');

      // Add invalid photo URI
      const photoUriInput = getByPlaceholderText('Path to product photo');
      fireEvent.changeText(photoUriInput, 'not-a-valid-url');

      // Submit form
      const submitButton = getByText('Save Offer');
      fireEvent.press(submitButton);

      // Verify validation error appears
      await waitFor(() => {
        expect(getByText('Photo URI must be valid')).toBeTruthy();
      });

      // Verify onSubmit was not called due to validation error
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Price computation and normalization', () => {
    beforeEach(() => {
      // Setup default mock implementations
      mockIsSupportedUnit.mockReturnValue(true);
      mockGetCanonicalUnit.mockReturnValue('g');
      mockFormatAmount.mockImplementation(
        (amount, unit) => `${amount.toFixed(2)} ${unit}`
      );
      mockValidateAndConvert.mockReturnValue({
        isValid: true,
        canonicalAmount: 1000, // 1 kg = 1000 g
        canonicalUnit: 'g',
      });
    });

    it('displays price computation when valid data is entered', async () => {
      const { getByText, getByPlaceholderText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Select inventory item (mass dimension)
      const inventoryPicker = getByText('Select an inventory item...');
      fireEvent.press(inventoryPicker);
      await waitFor(() => {
        const testItem = getByText('Test Item');
        fireEvent.press(testItem);
      });

      // Fill in price and amount data
      const priceInput = getByPlaceholderText('Enter total price');
      fireEvent.changeText(priceInput, '10.00');

      const currencyInput = getByPlaceholderText('e.g., CAD, USD, EUR');
      fireEvent.changeText(currencyInput, 'CAD');

      const amountInput = getByPlaceholderText('Quantity');
      fireEvent.changeText(amountInput, '1');

      const unitInput = getByPlaceholderText('e.g., kg, L, unit');
      fireEvent.changeText(unitInput, 'kg');

      // Wait for price computation to appear
      await waitFor(() => {
        expect(getByText('Price Analysis')).toBeTruthy();
        expect(getByText('Canonical Amount:')).toBeTruthy();
        expect(getByText('1000.00 g')).toBeTruthy(); // Formatted canonical amount
      });

      // Verify unit conversion was called
      expect(mockValidateAndConvert).toHaveBeenCalledWith(1, 'kg', 'mass');
      expect(mockFormatAmount).toHaveBeenCalledWith(1000, 'g');
    });

    it('calculates price per canonical unit excluding shipping correctly', async () => {
      const { getByText, getByPlaceholderText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Setup form with valid data
      const inventoryPicker = getByText('Select an inventory item...');
      fireEvent.press(inventoryPicker);
      await waitFor(() => {
        const testItem = getByText('Test Item');
        fireEvent.press(testItem);
      });

      fireEvent.changeText(getByPlaceholderText('Enter total price'), '20.00');
      fireEvent.changeText(getByPlaceholderText('e.g., CAD, USD, EUR'), 'CAD');
      fireEvent.changeText(getByPlaceholderText('Quantity'), '2');
      fireEvent.changeText(getByPlaceholderText('e.g., kg, L, unit'), 'kg');

      // Mock conversion: 2 kg = 2000 g
      mockValidateAndConvert.mockReturnValue({
        isValid: true,
        canonicalAmount: 2000,
        canonicalUnit: 'g',
      });

      await waitFor(() => {
        // Price per canonical unit = $20.00 / 2000g = $0.0100 per g
        expect(getByText('CAD 0.0100')).toBeTruthy();
      });
    });

    it('calculates price per canonical unit including shipping correctly', async () => {
      const { getByText, getByPlaceholderText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Setup form with valid data including shipping
      const inventoryPicker = getByText('Select an inventory item...');
      fireEvent.press(inventoryPicker);
      await waitFor(() => {
        const testItem = getByText('Test Item');
        fireEvent.press(testItem);
      });

      fireEvent.changeText(getByPlaceholderText('Enter total price'), '20.00');
      fireEvent.changeText(getByPlaceholderText('e.g., CAD, USD, EUR'), 'CAD');
      fireEvent.changeText(getByPlaceholderText('Quantity'), '1');
      fireEvent.changeText(getByPlaceholderText('e.g., kg, L, unit'), 'kg');

      // Add shipping cost
      fireEvent.changeText(getByPlaceholderText('Enter shipping cost'), '5.00');

      await waitFor(() => {
        // Total with shipping = $20.00 + $5.00 = $25.00
        // Price per canonical unit = $25.00 / 1000g = $0.0250 per g
        expect(getByText('CAD 0.0250')).toBeTruthy();
      });
    });

    it('handles shipping included scenario correctly', async () => {
      const { getByText, getByPlaceholderText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Setup form with shipping included
      const inventoryPicker = getByText('Select an inventory item...');
      fireEvent.press(inventoryPicker);
      await waitFor(() => {
        const testItem = getByText('Test Item');
        fireEvent.press(testItem);
      });

      fireEvent.changeText(getByPlaceholderText('Enter total price'), '25.00');
      fireEvent.changeText(getByPlaceholderText('e.g., CAD, USD, EUR'), 'CAD');
      fireEvent.changeText(getByPlaceholderText('Quantity'), '1');
      fireEvent.changeText(getByPlaceholderText('e.g., kg, L, unit'), 'kg');

      // Toggle shipping included
      const shippingSwitch = getByText('Shipping Included');
      fireEvent.press(shippingSwitch);

      await waitFor(() => {
        // When shipping is included, total stays $25.00
        // Price per canonical unit = $25.00 / 1000g = $0.0250 per g
        expect(getByText('CAD 0.0250')).toBeTruthy();
      });
    });

    it('displays unit error when unsupported unit is entered', async () => {
      mockIsSupportedUnit.mockReturnValue(false);

      const { getByText, getByPlaceholderText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Setup form with unsupported unit
      const inventoryPicker = getByText('Select an inventory item...');
      fireEvent.press(inventoryPicker);
      await waitFor(() => {
        const testItem = getByText('Test Item');
        fireEvent.press(testItem);
      });

      fireEvent.changeText(getByPlaceholderText('Enter total price'), '10.00');
      fireEvent.changeText(getByPlaceholderText('e.g., CAD, USD, EUR'), 'CAD');
      fireEvent.changeText(getByPlaceholderText('Quantity'), '1');
      fireEvent.changeText(getByPlaceholderText('e.g., kg, L, unit'), 'xyz'); // Unsupported unit

      await waitFor(() => {
        expect(getByText('Unit "xyz" is not supported')).toBeTruthy();
      });

      // Verify price computation section is not shown
      expect(() => getByText('Price Analysis')).toThrow();
    });

    it('displays unit conversion error when conversion fails', async () => {
      mockIsSupportedUnit.mockReturnValue(true);
      mockValidateAndConvert.mockReturnValue({
        isValid: false,
        errorMessage: 'Unit kg (mass) does not match expected dimension volume',
      });

      const { getByText, getByPlaceholderText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Select volume item but use mass unit
      const inventoryPicker = getByText('Select an inventory item...');
      fireEvent.press(inventoryPicker);
      await waitFor(() => {
        const volumeItem = getByText('Another Item'); // Volume dimension
        fireEvent.press(volumeItem);
      });

      fireEvent.changeText(getByPlaceholderText('Enter total price'), '10.00');
      fireEvent.changeText(getByPlaceholderText('e.g., CAD, USD, EUR'), 'CAD');
      fireEvent.changeText(getByPlaceholderText('Quantity'), '1');
      fireEvent.changeText(getByPlaceholderText('e.g., kg, L, unit'), 'kg'); // Wrong dimension

      await waitFor(() => {
        expect(
          getByText('Unit kg (mass) does not match expected dimension volume')
        ).toBeTruthy();
      });
    });

    it('updates price computation in real-time as user types', async () => {
      const { getByText, getByPlaceholderText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Setup initial form state
      const inventoryPicker = getByText('Select an inventory item...');
      fireEvent.press(inventoryPicker);
      await waitFor(() => {
        const testItem = getByText('Test Item');
        fireEvent.press(testItem);
      });

      const priceInput = getByPlaceholderText('Enter total price');
      const currencyInput = getByPlaceholderText('e.g., CAD, USD, EUR');
      const amountInput = getByPlaceholderText('Quantity');
      const unitInput = getByPlaceholderText('e.g., kg, L, unit');

      // Fill initial values
      fireEvent.changeText(priceInput, '10.00');
      fireEvent.changeText(currencyInput, 'CAD');
      fireEvent.changeText(amountInput, '1');
      fireEvent.changeText(unitInput, 'kg');

      await waitFor(() => {
        expect(getByText('CAD 0.0100')).toBeTruthy(); // $10.00 / 1000g
      });

      // Update price and verify real-time calculation
      fireEvent.changeText(priceInput, '20.00');

      await waitFor(() => {
        expect(getByText('CAD 0.0200')).toBeTruthy(); // $20.00 / 1000g
      });

      // Update amount and verify real-time calculation
      mockValidateAndConvert.mockReturnValue({
        isValid: true,
        canonicalAmount: 2000, // 2 kg = 2000 g
        canonicalUnit: 'g',
      });

      fireEvent.changeText(amountInput, '2');

      await waitFor(() => {
        expect(getByText('CAD 0.0100')).toBeTruthy(); // $20.00 / 2000g
      });
    });

    it('hides price computation when required fields are missing', async () => {
      const { getByText, getByPlaceholderText } = render(
        <OfferForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          availableInventoryItems={mockInventoryItems}
          availableSuppliers={mockSuppliers}
        />
      );

      // Only fill some fields, leave others empty
      const priceInput = getByPlaceholderText('Enter total price');
      fireEvent.changeText(priceInput, '10.00');

      // No inventory item selected, no amount/unit - should not show price computation
      expect(() => getByText('Price Analysis')).toThrow();

      // Select inventory item but still missing amount/unit
      const inventoryPicker = getByText('Select an inventory item...');
      fireEvent.press(inventoryPicker);
      await waitFor(() => {
        const testItem = getByText('Test Item');
        fireEvent.press(testItem);
      });

      // Still should not show price computation
      expect(() => getByText('Price Analysis')).toThrow();
    });
  });
});
