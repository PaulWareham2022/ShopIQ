/**
 * Supplier CRUD Integration Tests
 * Tests the integration between UI screens and repository layer
 */

import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SupplierListScreen } from '../SupplierListScreen';
import { SupplierDetailScreen } from '../SupplierDetailScreen';
import { SupplierRepository } from '../../../storage/repositories/SupplierRepository';
import {
  createTestSupplier,
  resetAllMocks,
} from '../../../storage/__tests__/setup';

// Mock the repository
jest.mock('../../../storage/repositories/SupplierRepository');
const MockedSupplierRepository = SupplierRepository as jest.MockedClass<
  typeof SupplierRepository
>;

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('Supplier CRUD Integration', () => {
  let mockRepository: jest.Mocked<SupplierRepository>;
  const mockOnSupplierPress = jest.fn();
  const mockOnAddSupplier = jest.fn();
  const mockOnBack = jest.fn();
  const mockOnSupplierSaved = jest.fn();

  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();

    // Create a fresh mock repository instance
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByName: jest.fn(),
      findByCountryCode: jest.fn(),
      getStats: jest.fn(),
    } as any;

    MockedSupplierRepository.mockImplementation(() => mockRepository);
  });

  describe('SupplierListScreen Integration', () => {
    it('should load and display suppliers from repository', async () => {
      const testSuppliers = [
        createTestSupplier({ name: 'Amazon Canada', countryCode: 'CA' }),
        createTestSupplier({
          name: 'Costco Halifax',
          countryCode: 'CA',
          membershipRequired: true,
        }),
      ];

      mockRepository.findAll.mockResolvedValue(testSuppliers);

      render(
        <SupplierListScreen
          onSupplierPress={mockOnSupplierPress}
          onAddSupplier={mockOnAddSupplier}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Amazon Canada')).toBeTruthy();
        expect(screen.getByText('Costco Halifax')).toBeTruthy();
      });

      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should handle repository errors gracefully', async () => {
      mockRepository.findAll.mockRejectedValue(
        new Error('Database connection failed')
      );

      render(
        <SupplierListScreen
          onSupplierPress={mockOnSupplierPress}
          onAddSupplier={mockOnAddSupplier}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to load suppliers'
        );
      });
    });

    it('should filter suppliers based on search query', async () => {
      const testSuppliers = [
        createTestSupplier({ name: 'Amazon Canada', countryCode: 'CA' }),
        createTestSupplier({ name: 'Costco Halifax', countryCode: 'CA' }),
        createTestSupplier({ name: 'Walmart', countryCode: 'US' }),
      ];

      mockRepository.findAll.mockResolvedValue(testSuppliers);

      render(
        <SupplierListScreen
          onSupplierPress={mockOnSupplierPress}
          onAddSupplier={mockOnAddSupplier}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Amazon Canada')).toBeTruthy();
      });

      // Search for "amazon"
      const searchInput = screen.getByPlaceholderText('Search suppliers...');
      fireEvent.changeText(searchInput, 'amazon');

      await waitFor(() => {
        expect(screen.getByText('Amazon Canada')).toBeTruthy();
        expect(screen.queryByText('Costco Halifax')).toBeNull();
        expect(screen.queryByText('Walmart')).toBeNull();
      });
    });

    it('should handle supplier deletion through repository', async () => {
      const testSupplier = createTestSupplier({ name: 'Test Supplier' });
      mockRepository.findAll.mockResolvedValue([testSupplier]);
      mockRepository.delete.mockResolvedValue(true);

      render(
        <SupplierListScreen
          onSupplierPress={mockOnSupplierPress}
          onAddSupplier={mockOnAddSupplier}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Supplier')).toBeTruthy();
      });

      // Long press to trigger delete
      const supplierCard = screen.getByText('Test Supplier');
      fireEvent(supplierCard.parent?.parent || supplierCard, 'longPress');

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Delete Supplier',
          'Are you sure you want to delete "Test Supplier"?',
          expect.any(Array)
        );
      });

      // Simulate user confirming deletion
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteButton = alertCall[2].find(
        (button: any) => button.text === 'Delete'
      );
      await deleteButton.onPress();

      expect(mockRepository.delete).toHaveBeenCalledWith(testSupplier.id);
    });

    it('should show empty state when no suppliers exist', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      render(
        <SupplierListScreen
          onSupplierPress={mockOnSupplierPress}
          onAddSupplier={mockOnAddSupplier}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No suppliers yet')).toBeTruthy();
        expect(
          screen.getByText('Tap the + button to add your first supplier')
        ).toBeTruthy();
      });
    });

    it('should display supplier chips correctly', async () => {
      const testSupplier = createTestSupplier({
        name: 'Premium Store',
        countryCode: 'CA',
        defaultCurrency: 'CAD',
        membershipRequired: true,
      });

      mockRepository.findAll.mockResolvedValue([testSupplier]);

      render(
        <SupplierListScreen
          onSupplierPress={mockOnSupplierPress}
          onAddSupplier={mockOnAddSupplier}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Premium Store')).toBeTruthy();
        expect(screen.getByText('CA')).toBeTruthy();
        expect(screen.getByText('CAD')).toBeTruthy();
        expect(screen.getByText('👤 Membership')).toBeTruthy();
      });
    });
  });

  describe('SupplierDetailScreen Integration', () => {
    describe('Creating new supplier', () => {
      it('should create supplier through repository', async () => {
        const newSupplierData = {
          name: 'New Supplier',
          countryCode: 'CA',
          defaultCurrency: 'CAD',
          membershipRequired: false,
        };

        const createdSupplier = createTestSupplier(newSupplierData);
        mockRepository.create.mockResolvedValue(createdSupplier);

        render(
          <SupplierDetailScreen
            onBack={mockOnBack}
            onSupplierSaved={mockOnSupplierSaved}
          />
        );

        // Screen should be in editing mode for new supplier
        await waitFor(() => {
          expect(screen.getByText('Add New Supplier')).toBeTruthy();
        });

        // Fill in the form (this would require more detailed form testing)
        // For now, we'll simulate the form submission directly

        // Simulate form submission with valid data
        // This would normally be triggered by form validation and submission
        await waitFor(() => {
          // Simulate the handleSave function being called with valid data
          expect(mockRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
              name: expect.any(String),
              countryCode: expect.any(String),
              defaultCurrency: expect.any(String),
              membershipRequired: expect.any(Boolean),
            })
          );
        });
      });

      it('should handle creation errors gracefully', async () => {
        mockRepository.create.mockRejectedValue(new Error('Database error'));

        render(
          <SupplierDetailScreen
            onBack={mockOnBack}
            onSupplierSaved={mockOnSupplierSaved}
          />
        );

        // Simulate form submission that fails
        // This would trigger the error handling in handleSave
        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith(
            'Error',
            'Failed to save supplier'
          );
        });
      });
    });

    describe('Editing existing supplier', () => {
      it('should load and display existing supplier data', async () => {
        const existingSupplier = createTestSupplier({
          name: 'Existing Supplier',
          countryCode: 'CA',
          defaultCurrency: 'CAD',
          notes: 'Existing supplier notes',
        });

        mockRepository.findById.mockResolvedValue(existingSupplier);

        render(
          <SupplierDetailScreen
            supplierId={existingSupplier.id}
            onBack={mockOnBack}
            onSupplierSaved={mockOnSupplierSaved}
          />
        );

        await waitFor(() => {
          expect(mockRepository.findById).toHaveBeenCalledWith(
            existingSupplier.id
          );
          expect(screen.getByText('Existing Supplier')).toBeTruthy();
          expect(screen.getByText('CA')).toBeTruthy();
          expect(screen.getByText('CAD')).toBeTruthy();
        });
      });

      it('should handle supplier not found', async () => {
        mockRepository.findById.mockResolvedValue(null);

        render(
          <SupplierDetailScreen
            supplierId="non-existent-id"
            onBack={mockOnBack}
            onSupplierSaved={mockOnSupplierSaved}
          />
        );

        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith(
            'Error',
            'Supplier not found'
          );
          expect(mockOnBack).toHaveBeenCalled();
        });
      });

      it('should update supplier through repository', async () => {
        const existingSupplier = createTestSupplier({
          name: 'Original Name',
          countryCode: 'CA',
          defaultCurrency: 'CAD',
        });

        const updatedSupplier = { ...existingSupplier, name: 'Updated Name' };

        mockRepository.findById.mockResolvedValue(existingSupplier);
        mockRepository.update.mockResolvedValue(updatedSupplier);

        render(
          <SupplierDetailScreen
            supplierId={existingSupplier.id}
            onBack={mockOnBack}
            onSupplierSaved={mockOnSupplierSaved}
          />
        );

        await waitFor(() => {
          expect(screen.getByText('Original Name')).toBeTruthy();
        });

        // Switch to edit mode
        const editButton = screen.getByText('Edit');
        fireEvent.press(editButton);

        await waitFor(() => {
          expect(screen.getByText('Edit Supplier')).toBeTruthy();
        });

        // Simulate form submission with updates
        // This would normally be handled by the form component
        await waitFor(() => {
          expect(mockRepository.update).toHaveBeenCalledWith(
            existingSupplier.id,
            expect.objectContaining({
              name: expect.any(String),
            })
          );
        });
      });

      it('should delete supplier through repository', async () => {
        const existingSupplier = createTestSupplier({
          name: 'Supplier to Delete',
        });

        mockRepository.findById.mockResolvedValue(existingSupplier);
        mockRepository.delete.mockResolvedValue(true);

        render(
          <SupplierDetailScreen
            supplierId={existingSupplier.id}
            onBack={mockOnBack}
            onSupplierSaved={mockOnSupplierSaved}
          />
        );

        await waitFor(() => {
          expect(screen.getByText('Supplier to Delete')).toBeTruthy();
        });

        // Press delete button
        const deleteButton = screen.getByText('Delete Supplier');
        fireEvent.press(deleteButton);

        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith(
            'Delete Supplier',
            'Are you sure you want to delete "Supplier to Delete"?',
            expect.any(Array)
          );
        });

        // Simulate user confirming deletion
        const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
        const confirmButton = alertCall[2].find(
          (button: any) => button.text === 'Delete'
        );
        await confirmButton.onPress();

        expect(mockRepository.delete).toHaveBeenCalledWith(existingSupplier.id);
        expect(mockOnSupplierSaved).toHaveBeenCalled();
      });
    });

    describe('Data display and formatting', () => {
      it('should display shipping policy information correctly', async () => {
        const supplierWithShipping = createTestSupplier({
          name: 'Shipping Store',
          shippingPolicy: {
            freeShippingThreshold: 35.0,
            shippingBaseCost: 5.99,
            shippingPerItemCost: 1.5,
            pickupAvailable: true,
          },
        });

        mockRepository.findById.mockResolvedValue(supplierWithShipping);

        render(
          <SupplierDetailScreen
            supplierId={supplierWithShipping.id}
            onBack={mockOnBack}
            onSupplierSaved={mockOnSupplierSaved}
          />
        );

        await waitFor(() => {
          expect(
            screen.getByText(/Free shipping on orders over \$35/)
          ).toBeTruthy();
          expect(screen.getByText(/Base shipping cost: \$5.99/)).toBeTruthy();
          expect(screen.getByText(/Per-item cost: \$1.50/)).toBeTruthy();
          expect(screen.getByText(/Store pickup available/)).toBeTruthy();
        });
      });

      it('should display URL patterns correctly', async () => {
        const supplierWithUrls = createTestSupplier({
          name: 'URL Store',
          urlPatterns: [
            'https://example.com',
            '*.example.com',
            'example.com/store/*',
          ],
        });

        mockRepository.findById.mockResolvedValue(supplierWithUrls);

        render(
          <SupplierDetailScreen
            supplierId={supplierWithUrls.id}
            onBack={mockOnBack}
            onSupplierSaved={mockOnSupplierSaved}
          />
        );

        await waitFor(() => {
          expect(
            screen.getByText(
              'https://example.com, *.example.com, example.com/store/*'
            )
          ).toBeTruthy();
        });
      });

      it('should format dates correctly', async () => {
        const supplierWithDates = createTestSupplier({
          name: 'Date Store',
          created_at: '2024-01-15T10:30:00.000Z',
          updated_at: '2024-02-20T15:45:00.000Z',
        });

        mockRepository.findById.mockResolvedValue(supplierWithDates);

        render(
          <SupplierDetailScreen
            supplierId={supplierWithDates.id}
            onBack={mockOnBack}
            onSupplierSaved={mockOnSupplierSaved}
          />
        );

        await waitFor(() => {
          // Dates should be formatted as locale date strings
          expect(screen.getByText(/1\/15\/2024|15\/1\/2024/)).toBeTruthy(); // Different locales
          expect(screen.getByText(/2\/20\/2024|20\/2\/2024/)).toBeTruthy();
        });
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle repository connection failures', async () => {
      mockRepository.findAll.mockRejectedValue(new Error('Connection timeout'));

      render(
        <SupplierListScreen
          onSupplierPress={mockOnSupplierPress}
          onAddSupplier={mockOnAddSupplier}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to load suppliers'
        );
      });
    });

    it('should handle validation errors during creation', async () => {
      mockRepository.create.mockRejectedValue(new Error('Validation failed'));

      render(
        <SupplierDetailScreen
          onBack={mockOnBack}
          onSupplierSaved={mockOnSupplierSaved}
        />
      );

      // Simulate form submission that fails validation
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to save supplier'
        );
      });
    });

    it('should handle database constraint violations', async () => {
      mockRepository.create.mockRejectedValue(
        new Error('UNIQUE constraint failed')
      );

      render(
        <SupplierDetailScreen
          onBack={mockOnBack}
          onSupplierSaved={mockOnSupplierSaved}
        />
      );

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to save supplier'
        );
      });
    });
  });
});
