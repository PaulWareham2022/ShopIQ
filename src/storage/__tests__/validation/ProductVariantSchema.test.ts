/**
 * Unit tests for ProductVariant validation schemas
 */

import {
  ProductVariantSchema,
  CreateProductVariantSchema,
  validateEntity,
  validateEntityStrict,
  validatePartialEntity,
} from '../../validation/schemas';

describe('ProductVariantSchema', () => {
  const validProductVariant = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    inventoryItemId: '550e8400-e29b-41d4-a716-446655440001',
    packageSize: '500ml bottle',
    unit: 'ml',
    barcodeValue: '1234567890123',
    metadata: { brand: 'Generic', flavor: 'Original' },
    notes: 'Standard size bottle',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    deleted_at: undefined,
  };

  describe('valid data', () => {
    it('should validate a complete ProductVariant', () => {
      const result = validateEntity(ProductVariantSchema, validProductVariant);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validProductVariant);
      }
    });

    it('should validate ProductVariant without optional fields', () => {
      const minimalVariant = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        inventoryItemId: '550e8400-e29b-41d4-a716-446655440001',
        packageSize: '1kg bag',
        unit: 'g',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = validateEntity(ProductVariantSchema, minimalVariant);
      expect(result.success).toBe(true);
    });

    it('should validate ProductVariant with null optional fields', () => {
      const variantWithNulls = {
        ...validProductVariant,
        barcodeValue: null,
        metadata: null,
        notes: null,
        deleted_at: null,
      };

      const result = validateEntity(ProductVariantSchema, variantWithNulls);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid data', () => {
    it('should reject invalid UUID for id', () => {
      const invalidVariant = {
        ...validProductVariant,
        id: 'not-a-uuid',
      };

      const result = validateEntity(ProductVariantSchema, invalidVariant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.issues[0].message).toContain('ID must be a valid UUID');
      }
    });

    it('should reject invalid UUID for inventoryItemId', () => {
      const invalidVariant = {
        ...validProductVariant,
        inventoryItemId: 'not-a-uuid',
      };

      const result = validateEntity(ProductVariantSchema, invalidVariant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.issues[0].message).toContain('Inventory item ID must be a valid UUID');
      }
    });

    it('should reject empty packageSize', () => {
      const invalidVariant = {
        ...validProductVariant,
        packageSize: '',
      };

      const result = validateEntity(ProductVariantSchema, invalidVariant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.issues[0].message).toContain('Package size cannot be empty');
      }
    });

    it('should reject packageSize that is too long', () => {
      const invalidVariant = {
        ...validProductVariant,
        packageSize: 'a'.repeat(101),
      };

      const result = validateEntity(ProductVariantSchema, invalidVariant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.issues[0].message).toContain('Package size too long');
      }
    });

    it('should reject empty unit', () => {
      const invalidVariant = {
        ...validProductVariant,
        unit: '',
      };

      const result = validateEntity(ProductVariantSchema, invalidVariant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.issues[0].message).toContain('Unit cannot be empty');
      }
    });

    it('should reject unit that is too long', () => {
      const invalidVariant = {
        ...validProductVariant,
        unit: 'a'.repeat(21),
      };

      const result = validateEntity(ProductVariantSchema, invalidVariant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.issues[0].message).toContain('Unit too long');
      }
    });

    it('should reject barcode that is too short', () => {
      const invalidVariant = {
        ...validProductVariant,
        barcodeValue: '1234567',
      };

      const result = validateEntity(ProductVariantSchema, invalidVariant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.issues[0].message).toContain('Barcode must be at least 8 characters');
      }
    });

    it('should reject barcode that is too long', () => {
      const invalidVariant = {
        ...validProductVariant,
        barcodeValue: '1'.repeat(21),
      };

      const result = validateEntity(ProductVariantSchema, invalidVariant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.issues[0].message).toContain('Barcode too long');
      }
    });

    it('should reject barcode with non-numeric characters', () => {
      const invalidVariant = {
        ...validProductVariant,
        barcodeValue: '123456789012a',
      };

      const result = validateEntity(ProductVariantSchema, invalidVariant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.issues[0].message).toContain('Barcode must contain only digits');
      }
    });

    it('should reject notes that are too long', () => {
      const invalidVariant = {
        ...validProductVariant,
        notes: 'a'.repeat(1001),
      };

      const result = validateEntity(ProductVariantSchema, invalidVariant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.issues[0].message).toContain('Notes too long');
      }
    });

    it('should reject invalid created_at timestamp', () => {
      const invalidVariant = {
        ...validProductVariant,
        created_at: 'not-a-timestamp',
      };

      const result = validateEntity(ProductVariantSchema, invalidVariant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.issues[0].message).toContain('created_at must be a valid ISO 8601 datetime');
      }
    });

    it('should reject invalid updated_at timestamp', () => {
      const invalidVariant = {
        ...validProductVariant,
        updated_at: 'not-a-timestamp',
      };

      const result = validateEntity(ProductVariantSchema, invalidVariant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.issues[0].message).toContain('updated_at must be a valid ISO 8601 datetime');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle barcode with exactly 8 characters', () => {
      const variant = {
        ...validProductVariant,
        barcodeValue: '12345678',
      };

      const result = validateEntity(ProductVariantSchema, variant);
      expect(result.success).toBe(true);
    });

    it('should handle barcode with exactly 20 characters', () => {
      const variant = {
        ...validProductVariant,
        barcodeValue: '1'.repeat(20),
      };

      const result = validateEntity(ProductVariantSchema, variant);
      expect(result.success).toBe(true);
    });

    it('should handle packageSize with exactly 100 characters', () => {
      const variant = {
        ...validProductVariant,
        packageSize: 'a'.repeat(100),
      };

      const result = validateEntity(ProductVariantSchema, variant);
      expect(result.success).toBe(true);
    });

    it('should handle unit with exactly 20 characters', () => {
      const variant = {
        ...validProductVariant,
        unit: 'a'.repeat(20),
      };

      const result = validateEntity(ProductVariantSchema, variant);
      expect(result.success).toBe(true);
    });

    it('should handle notes with exactly 1000 characters', () => {
      const variant = {
        ...validProductVariant,
        notes: 'a'.repeat(1000),
      };

      const result = validateEntity(ProductVariantSchema, variant);
      expect(result.success).toBe(true);
    });
  });
});

describe('CreateProductVariantSchema', () => {
  const validCreateData = {
    inventoryItemId: '550e8400-e29b-41d4-a716-446655440001',
    packageSize: '500ml bottle',
    unit: 'ml',
    barcodeValue: '1234567890123',
    metadata: { brand: 'Generic', flavor: 'Original' },
    notes: 'Standard size bottle',
  };

  describe('valid data', () => {
    it('should validate complete create data', () => {
      const result = validateEntity(CreateProductVariantSchema, validCreateData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validCreateData);
      }
    });

    it('should validate minimal create data', () => {
      const minimalData = {
        inventoryItemId: '550e8400-e29b-41d4-a716-446655440001',
        packageSize: '1kg bag',
        unit: 'g',
      };

      const result = validateEntity(CreateProductVariantSchema, minimalData);
      expect(result.success).toBe(true);
    });
  });

  describe('extra fields handling', () => {
    it('should ignore extra fields like id, created_at, updated_at, deleted_at', () => {
      const dataWithExtraFields = {
        ...validCreateData,
        id: '550e8400-e29b-41d4-a716-446655440000',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        deleted_at: '2024-01-01T00:00:00.000Z',
      };

      const result = validateEntity(CreateProductVariantSchema, dataWithExtraFields);
      expect(result.success).toBe(true);
      if (result.success) {
        // Should only contain the fields that are part of the create schema
        expect(result.data).toEqual(validCreateData);
        expect(result.data).not.toHaveProperty('id');
        expect(result.data).not.toHaveProperty('created_at');
        expect(result.data).not.toHaveProperty('updated_at');
        expect(result.data).not.toHaveProperty('deleted_at');
      }
    });
  });
});

describe('validateEntityStrict', () => {
  it('should throw on validation failure', () => {
    const invalidData = {
      id: 'not-a-uuid',
      inventoryItemId: '550e8400-e29b-41d4-a716-446655440001',
      packageSize: '500ml bottle',
      unit: 'ml',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    expect(() => {
      validateEntityStrict(ProductVariantSchema, invalidData);
    }).toThrow();
  });

  it('should return data on validation success', () => {
    const validData = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      inventoryItemId: '550e8400-e29b-41d4-a716-446655440001',
      packageSize: '500ml bottle',
      unit: 'ml',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    const result = validateEntityStrict(ProductVariantSchema, validData);
    expect(result).toEqual(validData);
  });
});

describe('validatePartialEntity', () => {
  it('should validate partial data for updates', () => {
    const partialData = {
      packageSize: '1L bottle',
      barcodeValue: '9876543210987',
    };

    const result = validatePartialEntity(ProductVariantSchema, partialData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(partialData);
    }
  });

  it('should reject invalid partial data', () => {
    const invalidPartialData = {
      packageSize: '',
      barcodeValue: '123',
    };

    const result = validatePartialEntity(ProductVariantSchema, invalidPartialData);
    expect(result.success).toBe(false);
  });

  it('should allow empty object for partial validation', () => {
    const result = validatePartialEntity(ProductVariantSchema, {});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });
});
