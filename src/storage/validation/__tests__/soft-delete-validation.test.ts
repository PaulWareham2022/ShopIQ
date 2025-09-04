/**
 * Comprehensive tests for soft-delete field validation and enforcement
 * Focuses on edge cases and validation scenarios not covered by general schema tests
 */

import {
  BaseEntitySchema,
  SupplierSchema,
  InventoryItemSchema,
  OfferSchema,
  UnitConversionSchema,
  BundleSchema,
  validateEntity,
  validateEntityStrict,
  validatePartialEntity
} from '../schemas';

describe('Soft-Delete Validation', () => {
  
  // =============================================================================
  // BASE ENTITY SOFT-DELETE VALIDATION
  // =============================================================================
  
  describe('BaseEntitySchema soft-delete field validation', () => {
    const validBaseEntity = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      created_at: '2023-12-01T10:00:00.000Z',
      updated_at: '2023-12-01T10:00:00.000Z'
    };

    describe('deleted_at field acceptance', () => {
      test('accepts undefined deleted_at (not deleted)', () => {
        const entity = { ...validBaseEntity };
        const result = BaseEntitySchema.safeParse(entity);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.deleted_at).toBeUndefined();
        }
      });

      test('accepts null deleted_at (not deleted)', () => {
        const entity = { ...validBaseEntity, deleted_at: null };
        const result = BaseEntitySchema.safeParse(entity);
        expect(result.success).toBe(true);
      });

      test('accepts valid ISO 8601 deleted_at (soft deleted)', () => {
        const entity = { ...validBaseEntity, deleted_at: '2023-12-01T12:00:00.000Z' };
        const result = BaseEntitySchema.safeParse(entity);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.deleted_at).toBe('2023-12-01T12:00:00.000Z');
        }
      });

      test('accepts deleted_at with timezone info', () => {
        const entity = { ...validBaseEntity, deleted_at: '2023-12-01T12:00:00.000Z' };
        const result = BaseEntitySchema.safeParse(entity);
        expect(result.success).toBe(true);
      });

      test('accepts deleted_at with milliseconds', () => {
        const entity = { ...validBaseEntity, deleted_at: '2023-12-01T12:00:00.123Z' };
        const result = BaseEntitySchema.safeParse(entity);
        expect(result.success).toBe(true);
      });
    });

    describe('deleted_at field rejection', () => {
      test('rejects invalid datetime format', () => {
        const entity = { ...validBaseEntity, deleted_at: 'not-a-datetime' };
        const result = BaseEntitySchema.safeParse(entity);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('deleted_at must be a valid ISO 8601 datetime');
        }
      });

      test('rejects date-only format', () => {
        const entity = { ...validBaseEntity, deleted_at: '2023-12-01' };
        const result = BaseEntitySchema.safeParse(entity);
        expect(result.success).toBe(false);
      });

      test('rejects invalid date values', () => {
        const entity = { ...validBaseEntity, deleted_at: '2023-13-01T12:00:00Z' };
        const result = BaseEntitySchema.safeParse(entity);
        expect(result.success).toBe(false);
      });

      test('rejects numeric timestamps', () => {
        const entity = { ...validBaseEntity, deleted_at: 1701432000000 as any };
        const result = BaseEntitySchema.safeParse(entity);
        expect(result.success).toBe(false);
      });

      test('rejects empty string', () => {
        const entity = { ...validBaseEntity, deleted_at: '' };
        const result = BaseEntitySchema.safeParse(entity);
        expect(result.success).toBe(false);
      });
    });

    describe('temporal logic validation', () => {
      test('allows deleted_at to be after updated_at (valid soft delete)', () => {
        const entity = {
          ...validBaseEntity,
          updated_at: '2023-12-01T10:00:00.000Z',
          deleted_at: '2023-12-01T11:00:00.000Z'
        };
        const result = BaseEntitySchema.safeParse(entity);
        expect(result.success).toBe(true);
      });

      test('allows deleted_at to equal updated_at (simultaneous update and delete)', () => {
        const entity = {
          ...validBaseEntity,
          updated_at: '2023-12-01T10:00:00.000Z',
          deleted_at: '2023-12-01T10:00:00.000Z'
        };
        const result = BaseEntitySchema.safeParse(entity);
        expect(result.success).toBe(true);
      });

      // Note: Schema validation doesn't enforce temporal logic constraints
      // (deleted_at should be >= updated_at), but this would be handled at business logic level
      test('schema allows deleted_at before updated_at (business logic should catch this)', () => {
        const entity = {
          ...validBaseEntity,
          updated_at: '2023-12-01T10:00:00.000Z',
          deleted_at: '2023-12-01T09:00:00.000Z'
        };
        const result = BaseEntitySchema.safeParse(entity);
        // Schema validation passes - business logic would need to validate temporal consistency
        expect(result.success).toBe(true);
      });
    });
  });

  // =============================================================================
  // ENTITY-SPECIFIC SOFT-DELETE VALIDATION
  // =============================================================================

  describe('Entity-specific soft-delete validation', () => {
    describe('SupplierSchema with soft-delete', () => {
      const validSupplier = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T10:00:00.000Z',
        name: 'Test Supplier',
        countryCode: 'CA',
        defaultCurrency: 'CAD',
        membershipRequired: false
      };

      test('validates supplier with soft-delete timestamp', () => {
        const deletedSupplier = {
          ...validSupplier,
          deleted_at: '2023-12-01T15:30:00.000Z'
        };
        const result = SupplierSchema.safeParse(deletedSupplier);
        expect(result.success).toBe(true);
      });

      test('validates partial supplier update with deleted_at', () => {
        const partialUpdate = {
          name: 'Updated Supplier',
          deleted_at: '2023-12-01T15:30:00.000Z'
        };
        const result = validatePartialEntity(SupplierSchema, partialUpdate);
        expect(result.success).toBe(true);
      });
    });

    describe('InventoryItemSchema with soft-delete', () => {
      const validItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T10:00:00.000Z',
        name: 'Test Item',
        canonicalDimension: 'mass' as const,
        canonicalUnit: 'g',
        shelfLifeSensitive: false
      };

      test('validates inventory item with soft-delete timestamp', () => {
        const deletedItem = {
          ...validItem,
          deleted_at: '2023-12-01T16:45:00.000Z'
        };
        const result = InventoryItemSchema.safeParse(deletedItem);
        expect(result.success).toBe(true);
      });
    });

    describe('OfferSchema with soft-delete', () => {
      const validOffer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T10:00:00.000Z',
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174001',
        supplierId: '123e4567-e89b-12d3-a456-426614174002',
        sourceType: 'manual' as const,
        observedAt: '2023-12-01T09:30:00.000Z',
        capturedAt: '2023-12-01T10:00:00.000Z',
        totalPrice: 10.00,
        currency: 'CAD',
        isTaxIncluded: false,
        amount: 1,
        amountUnit: 'unit',
        amountCanonical: 1,
        pricePerCanonicalExclShipping: 10.00,
        pricePerCanonicalInclShipping: 10.00,
        effectivePricePerCanonical: 10.00
      };

      test('validates offer with soft-delete timestamp', () => {
        const deletedOffer = {
          ...validOffer,
          deleted_at: '2023-12-01T17:15:00.000Z'
        };
        const result = OfferSchema.safeParse(deletedOffer);
        expect(result.success).toBe(true);
      });
    });

    describe('UnitConversionSchema with soft-delete', () => {
      const validConversion = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T10:00:00.000Z',
        fromUnit: 'kg',
        toUnit: 'g',
        factor: 1000,
        dimension: 'mass' as const
      };

      test('validates unit conversion with soft-delete timestamp', () => {
        const deletedConversion = {
          ...validConversion,
          deleted_at: '2023-12-01T18:00:00.000Z'
        };
        const result = UnitConversionSchema.safeParse(deletedConversion);
        expect(result.success).toBe(true);
      });
    });

    describe('BundleSchema with soft-delete', () => {
      const validBundle = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T10:00:00.000Z',
        supplierId: '123e4567-e89b-12d3-a456-426614174001',
        items: [
          {
            inventoryItemId: '123e4567-e89b-12d3-a456-426614174002',
            amount: 2,
            unit: 'kg'
          }
        ],
        priceAllocationMethod: 'equal' as const
      };

      test('validates bundle with soft-delete timestamp', () => {
        const deletedBundle = {
          ...validBundle,
          deleted_at: '2023-12-01T19:30:00.000Z'
        };
        const result = BundleSchema.safeParse(deletedBundle);
        expect(result.success).toBe(true);
      });
    });
  });

  // =============================================================================
  // VALIDATION UTILITY TESTS WITH SOFT-DELETE
  // =============================================================================

  describe('Validation utilities with soft-delete', () => {
    const validSupplier = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      created_at: '2023-12-01T10:00:00.000Z',
      updated_at: '2023-12-01T10:00:00.000Z',
      name: 'Test Supplier',
      countryCode: 'CA',
      defaultCurrency: 'CAD',
      membershipRequired: false,
      deleted_at: '2023-12-01T12:00:00.000Z'
    };

    describe('validateEntity with soft-delete', () => {
      test('returns success for valid entity with deleted_at', () => {
        const result = validateEntity(SupplierSchema, validSupplier);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.deleted_at).toBe('2023-12-01T12:00:00.000Z');
        }
      });

      test('returns error for invalid deleted_at format', () => {
        const invalidSupplier = { ...validSupplier, deleted_at: 'invalid-date' };
        const result = validateEntity(SupplierSchema, invalidSupplier);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.issues).toHaveLength(1);
          expect(result.errors.issues[0].path).toEqual(['deleted_at']);
        }
      });
    });

    describe('validateEntityStrict with soft-delete', () => {
      test('returns validated entity with deleted_at', () => {
        const result = validateEntityStrict(SupplierSchema, validSupplier);
        expect(result.deleted_at).toBe('2023-12-01T12:00:00.000Z');
      });

      test('throws error for invalid deleted_at', () => {
        const invalidSupplier = { ...validSupplier, deleted_at: 'invalid' };
        expect(() => {
          validateEntityStrict(SupplierSchema, invalidSupplier);
        }).toThrow();
      });
    });

    describe('validatePartialEntity with soft-delete', () => {
      test('validates partial entity with only deleted_at', () => {
        const partial = { deleted_at: '2023-12-01T12:00:00.000Z' };
        const result = validatePartialEntity(SupplierSchema, partial);
        expect(result.success).toBe(true);
        if (result.success) {
          expect((result.data as any).deleted_at).toBe('2023-12-01T12:00:00.000Z');
        }
      });

      test('validates partial entity removing deleted_at (restore)', () => {
        const partial = { deleted_at: undefined };
        const result = validatePartialEntity(SupplierSchema, partial);
        expect(result.success).toBe(true);
        if (result.success) {
          expect((result.data as any).deleted_at).toBeUndefined();
        }
      });

      test('rejects partial entity with invalid deleted_at', () => {
        const partial = { deleted_at: 'not-a-date' };
        const result = validatePartialEntity(SupplierSchema, partial);
        expect(result.success).toBe(false);
      });
    });
  });

  // =============================================================================
  // EDGE CASES AND BOUNDARY CONDITIONS
  // =============================================================================

  describe('Edge cases and boundary conditions', () => {
    const baseEntity = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      created_at: '2023-12-01T10:00:00.000Z',
      updated_at: '2023-12-01T10:00:00.000Z'
    };

    test('handles very old dates in deleted_at', () => {
      const entity = { ...baseEntity, deleted_at: '1970-01-01T00:00:00.000Z' };
      const result = BaseEntitySchema.safeParse(entity);
      expect(result.success).toBe(true);
    });

    test('handles future dates in deleted_at', () => {
      const entity = { ...baseEntity, deleted_at: '2099-12-31T23:59:59.999Z' };
      const result = BaseEntitySchema.safeParse(entity);
      expect(result.success).toBe(true);
    });

    test('handles maximum precision timestamps', () => {
      const entity = { ...baseEntity, deleted_at: '2023-12-01T12:34:56.789123Z' };
      const result = BaseEntitySchema.safeParse(entity);
      expect(result.success).toBe(true);
    });

    test('handles different timezone formats', () => {
      const timezoneFormats = [
        '2023-12-01T12:00:00.000Z',       // UTC with milliseconds
        '2023-12-01T12:00:00Z',           // UTC
      ];

      timezoneFormats.forEach(timestamp => {
        const entity = { ...baseEntity, deleted_at: timestamp };
        const result = BaseEntitySchema.safeParse(entity);
        expect(result.success).toBe(true);
      });
    });

    test('rejects common invalid datetime formats', () => {
      const invalidFormats = [
        '2023/12/01 12:00:00',            // Wrong separators
        '2023-12-01 12:00:00',            // Missing T separator
        '2023-12-01T12:00:00',            // Missing timezone
        '2023-12-01T25:00:00.000Z',       // Invalid hour
        '2023-12-01T12:60:00.000Z',       // Invalid minute
        '2023-12-01T12:00:60.000Z',       // Invalid second
        '2023-00-01T12:00:00.000Z',       // Invalid month
        '2023-12-00T12:00:00.000Z',       // Invalid day
        'Dec 1, 2023 12:00 PM',           // Natural language format
        '1701432000',                     // Unix timestamp (string)
      ];

      invalidFormats.forEach(timestamp => {
        const entity = { ...baseEntity, deleted_at: timestamp };
        const result = BaseEntitySchema.safeParse(entity);
        expect(result.success).toBe(false);
      });
    });
  });

  // =============================================================================
  // INTEGRATION SCENARIOS
  // =============================================================================

  describe('Integration scenarios', () => {
    test('validates complete soft-delete lifecycle', () => {
      const supplier = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T10:00:00.000Z',
        name: 'Test Supplier',
        countryCode: 'CA',
        defaultCurrency: 'CAD',
        membershipRequired: false
      };

      // 1. Initial creation (no deleted_at)
      const created = SupplierSchema.safeParse(supplier);
      expect(created.success).toBe(true);

      // 2. Soft delete (add deleted_at)
      const deleted = SupplierSchema.safeParse({
        ...supplier,
        deleted_at: '2023-12-01T12:00:00.000Z',
        updated_at: '2023-12-01T12:00:00.000Z'
      });
      expect(deleted.success).toBe(true);

      // 3. Restore (remove deleted_at)
      const restored = SupplierSchema.safeParse({
        ...supplier,
        updated_at: '2023-12-01T13:00:00.000Z'
        // deleted_at is undefined (not deleted)
      });
      expect(restored.success).toBe(true);
    });

    test('validates batch operations with mixed soft-delete states', () => {
      const suppliers = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          created_at: '2023-12-01T10:00:00.000Z',
          updated_at: '2023-12-01T10:00:00.000Z',
          name: 'Active Supplier',
          countryCode: 'CA',
          defaultCurrency: 'CAD',
          membershipRequired: false
          // No deleted_at - active
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          created_at: '2023-12-01T10:00:00.000Z',
          updated_at: '2023-12-01T12:00:00.000Z',
          name: 'Deleted Supplier',
          countryCode: 'US',
          defaultCurrency: 'USD',
          membershipRequired: true,
          deleted_at: '2023-12-01T12:00:00.000Z' // Soft deleted
        }
      ];

      suppliers.forEach(supplier => {
        const result = SupplierSchema.safeParse(supplier);
        expect(result.success).toBe(true);
      });
    });
  });
});
