import { OfferFormInputSchema, createFormikValidation } from '../index';

describe('OfferForm Zod Validation', () => {
  const validateForm = createFormikValidation(OfferFormInputSchema);

  describe('Required field validation', () => {
    it('should validate required fields', () => {
      const emptyValues = {
        inventoryItemId: '',
        supplierId: '',
        totalPrice: '',
        currency: '',
        amount: '',
        amountUnit: '',
        observedAt: '',
        isTaxIncluded: true,
        shippingIncluded: false,
      };

      const errors = validateForm(emptyValues);

      expect(errors.inventoryItemId).toBe('Invalid inventory item selection');
      expect(errors.supplierId).toBe('Invalid supplier selection');
      expect(errors.totalPrice).toBe('Total price must be a positive number');
      expect(errors.currency).toBe('Invalid currency code');
      expect(errors.amount).toBe('Amount must be a positive number');
      expect(errors.amountUnit).toBe('Amount unit is required');
    });

    it('should pass validation with valid required fields', () => {
      const validValues = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        supplierId: '123e4567-e89b-12d3-a456-426614174001',
        totalPrice: '10.99',
        currency: 'CAD',
        amount: '1',
        amountUnit: 'kg',
        observedAt: '2024-01-01T00:00:00.000Z',
        isTaxIncluded: true,
        shippingIncluded: false,
        sourceType: 'manual' as const,
      };

      const errors = validateForm(validValues);

      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  describe('Currency validation', () => {
    it('should validate currency format', () => {
      const values = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        supplierId: '123e4567-e89b-12d3-a456-426614174001',
        totalPrice: '10.99',
        currency: 'INVALID',
        amount: '1',
        amountUnit: 'kg',
        observedAt: '2024-01-01T00:00:00.000Z',
        isTaxIncluded: true,
        shippingIncluded: false,
        sourceType: 'manual' as const,
      };

      const errors = validateForm(values);

      expect(errors.currency).toBe('Invalid currency code');
    });

    it('should validate currency case sensitivity', () => {
      const values = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        supplierId: '123e4567-e89b-12d3-a456-426614174001',
        totalPrice: '10.99',
        currency: 'cad',
        amount: '1',
        amountUnit: 'kg',
        observedAt: '2024-01-01T00:00:00.000Z',
        isTaxIncluded: true,
        shippingIncluded: false,
        sourceType: 'manual' as const,
      };

      const errors = validateForm(values);

      expect(errors.currency).toBe('Invalid currency code');
    });

    it('should accept valid currency codes', () => {
      const values = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        supplierId: '123e4567-e89b-12d3-a456-426614174001',
        totalPrice: '10.99',
        currency: 'CAD',
        amount: '1',
        amountUnit: 'kg',
        observedAt: '2024-01-01T00:00:00.000Z',
        isTaxIncluded: true,
        shippingIncluded: false,
        sourceType: 'manual' as const,
      };

      const errors = validateForm(values);

      expect(errors.currency).toBeUndefined();
    });
  });

  describe('Numeric field validation', () => {
    it('should validate positive numbers for price and amount', () => {
      const values = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        supplierId: '123e4567-e89b-12d3-a456-426614174001',
        totalPrice: '-5.99',
        currency: 'CAD',
        amount: '0',
        amountUnit: 'kg',
        observedAt: '2024-01-01T00:00:00.000Z',
        isTaxIncluded: true,
        shippingIncluded: false,
        sourceType: 'manual' as const,
      };

      const errors = validateForm(values);

      expect(errors.totalPrice).toBe('Total price must be a positive number');
      expect(errors.amount).toBe('Amount must be a positive number');
    });

    it('should validate non-numeric strings', () => {
      const values = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        supplierId: '123e4567-e89b-12d3-a456-426614174001',
        totalPrice: 'not-a-number',
        currency: 'CAD',
        amount: 'invalid',
        amountUnit: 'kg',
        observedAt: '2024-01-01T00:00:00.000Z',
        isTaxIncluded: true,
        shippingIncluded: false,
        sourceType: 'manual' as const,
      };

      const errors = validateForm(values);

      expect(errors.totalPrice).toBe('Total price must be a positive number');
      expect(errors.amount).toBe('Amount must be a positive number');
    });
  });

  describe('Optional field validation', () => {
    it('should validate tax rate range', () => {
      const values = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        supplierId: '123e4567-e89b-12d3-a456-426614174001',
        totalPrice: '10.99',
        currency: 'CAD',
        amount: '1',
        amountUnit: 'kg',
        observedAt: '2024-01-01T00:00:00.000Z',
        isTaxIncluded: true,
        shippingIncluded: false,
        sourceType: 'manual' as const,
        taxRate: '1.5', // Invalid: > 1
      };

      const errors = validateForm(values);

      expect(errors.taxRate).toBe(
        'Tax rate must be a decimal between 0 and 1 (e.g., 0.15 for 15%)'
      );
    });

    it('should validate quality rating range', () => {
      const values = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        supplierId: '123e4567-e89b-12d3-a456-426614174001',
        totalPrice: '10.99',
        currency: 'CAD',
        amount: '1',
        amountUnit: 'kg',
        observedAt: '2024-01-01T00:00:00.000Z',
        isTaxIncluded: true,
        shippingIncluded: false,
        sourceType: 'manual' as const,
        qualityRating: '6', // Invalid: > 5
      };

      const errors = validateForm(values);

      expect(errors.qualityRating).toBe(
        'Quality rating must be between 1 and 5'
      );
    });

    it('should validate URL fields', () => {
      const values = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        supplierId: '123e4567-e89b-12d3-a456-426614174001',
        totalPrice: '10.99',
        currency: 'CAD',
        amount: '1',
        amountUnit: 'kg',
        observedAt: '2024-01-01T00:00:00.000Z',
        isTaxIncluded: true,
        shippingIncluded: false,
        sourceType: 'manual' as const,
        supplierUrl: 'not-a-valid-url',
        sourceUrl: 'also-invalid',
        photoUri: 'invalid-uri',
      };

      const errors = validateForm(values);

      expect(errors.supplierUrl).toBe('Supplier URL must be valid');
      expect(errors.sourceUrl).toBe('Source URL must be valid');
      expect(errors.photoUri).toBe('Photo URI must be valid');
    });

    it('should accept valid optional fields', () => {
      const values = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        supplierId: '123e4567-e89b-12d3-a456-426614174001',
        totalPrice: '10.99',
        currency: 'CAD',
        amount: '1',
        amountUnit: 'kg',
        observedAt: '2024-01-01T00:00:00.000Z',
        isTaxIncluded: true,
        shippingIncluded: false,
        sourceType: 'manual' as const,
        taxRate: '0.15',
        qualityRating: '4',
        supplierUrl: 'https://example.com/product',
        sourceUrl: 'https://example.com/source',
        photoUri: 'https://example.com/photo.jpg',
        notes: 'Test notes',
      };

      const errors = validateForm(values);

      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('should validate photo URI format', () => {
      const values = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        supplierId: '123e4567-e89b-12d3-a456-426614174001',
        totalPrice: '10.99',
        currency: 'CAD',
        amount: '1',
        amountUnit: 'kg',
        observedAt: '2024-01-01T00:00:00.000Z',
        isTaxIncluded: true,
        shippingIncluded: false,
        sourceType: 'manual' as const,
        photoUri: 'not-a-valid-url',
      };

      const errors = validateForm(values);

      expect(errors.photoUri).toBe('Photo URI must be valid');
    });

    it('should accept valid photo URI formats', () => {
      const validPhotoUris = [
        'https://example.com/photo.jpg',
        'http://example.com/image.png',
        'https://cdn.example.com/products/123/photo.webp',
        'https://example.com/path/to/image.jpeg',
      ];

      validPhotoUris.forEach(photoUri => {
        const values = {
          inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
          supplierId: '123e4567-e89b-12d3-a456-426614174001',
          totalPrice: '10.99',
          currency: 'CAD',
          amount: '1',
          amountUnit: 'kg',
          observedAt: '2024-01-01T00:00:00.000Z',
          isTaxIncluded: true,
          shippingIncluded: false,
          sourceType: 'manual' as const,
          photoUri,
        };

        const errors = validateForm(values);
        expect(errors.photoUri).toBeUndefined();
      });
    });

    it('should handle empty photo URI', () => {
      const values = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        supplierId: '123e4567-e89b-12d3-a456-426614174001',
        totalPrice: '10.99',
        currency: 'CAD',
        amount: '1',
        amountUnit: 'kg',
        observedAt: '2024-01-01T00:00:00.000Z',
        isTaxIncluded: true,
        shippingIncluded: false,
        sourceType: 'manual' as const,
        photoUri: '',
      };

      const errors = validateForm(values);

      expect(errors.photoUri).toBeUndefined();
    });

    it('should handle undefined photo URI', () => {
      const values = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        supplierId: '123e4567-e89b-12d3-a456-426614174001',
        totalPrice: '10.99',
        currency: 'CAD',
        amount: '1',
        amountUnit: 'kg',
        observedAt: '2024-01-01T00:00:00.000Z',
        isTaxIncluded: true,
        shippingIncluded: false,
        sourceType: 'manual' as const,
        // photoUri is undefined
      };

      const errors = validateForm(values);

      expect(errors.photoUri).toBeUndefined();
    });
  });

  describe('UUID validation', () => {
    it('should validate UUID format for inventory item and supplier IDs', () => {
      const values = {
        inventoryItemId: 'invalid-uuid',
        supplierId: 'also-invalid',
        totalPrice: '10.99',
        currency: 'CAD',
        amount: '1',
        amountUnit: 'kg',
        observedAt: '2024-01-01T00:00:00.000Z',
        isTaxIncluded: true,
        shippingIncluded: false,
        sourceType: 'manual' as const,
      };

      const errors = validateForm(values);

      expect(errors.inventoryItemId).toBe('Invalid inventory item selection');
      expect(errors.supplierId).toBe('Invalid supplier selection');
    });
  });
});
