/**
 * Unit tests for Zod validation schemas
 * Tests all entity schemas, validation utilities, and error handling
 */

import {
  SupplierSchema,
  InventoryItemSchema,
  OfferSchema,
  UnitConversionSchema,
  BundleSchema,
  ShippingPolicySchema,
  BundleItemSchema,
  BaseEntitySchema,
  CanonicalDimensionSchema,
  SourceTypeSchema,
  PriceAllocationMethodSchema,
  validateEntity,
  validateEntityStrict,
  validatePartialEntity,
} from '../schemas';

describe('Zod Validation Schemas', () => {
  // =============================================================================
  // ENUM SCHEMAS
  // =============================================================================

  describe('Enum Schemas', () => {
    test('CanonicalDimensionSchema accepts valid values', () => {
      expect(CanonicalDimensionSchema.safeParse('mass').success).toBe(true);
      expect(CanonicalDimensionSchema.safeParse('volume').success).toBe(true);
      expect(CanonicalDimensionSchema.safeParse('count').success).toBe(true);
      expect(CanonicalDimensionSchema.safeParse('length').success).toBe(true);
      expect(CanonicalDimensionSchema.safeParse('area').success).toBe(true);
    });

    test('CanonicalDimensionSchema rejects invalid values', () => {
      expect(CanonicalDimensionSchema.safeParse('invalid').success).toBe(false);
      expect(CanonicalDimensionSchema.safeParse('weight').success).toBe(false);
      expect(CanonicalDimensionSchema.safeParse('').success).toBe(false);
    });

    test('SourceTypeSchema accepts valid values', () => {
      expect(SourceTypeSchema.safeParse('manual').success).toBe(true);
      expect(SourceTypeSchema.safeParse('url').success).toBe(true);
      expect(SourceTypeSchema.safeParse('ocr').success).toBe(true);
      expect(SourceTypeSchema.safeParse('api').success).toBe(true);
    });

    test('SourceTypeSchema rejects invalid values', () => {
      expect(SourceTypeSchema.safeParse('automatic').success).toBe(false);
      expect(SourceTypeSchema.safeParse('scan').success).toBe(false);
    });

    test('PriceAllocationMethodSchema accepts valid values', () => {
      expect(PriceAllocationMethodSchema.safeParse('equal').success).toBe(true);
      expect(
        PriceAllocationMethodSchema.safeParse('by-canonical-amount').success
      ).toBe(true);
      expect(PriceAllocationMethodSchema.safeParse('manual').success).toBe(
        true
      );
    });

    test('PriceAllocationMethodSchema rejects invalid values', () => {
      expect(PriceAllocationMethodSchema.safeParse('weighted').success).toBe(
        false
      );
      expect(
        PriceAllocationMethodSchema.safeParse('proportional').success
      ).toBe(false);
    });
  });

  // =============================================================================
  // BASE ENTITY SCHEMA
  // =============================================================================

  describe('BaseEntitySchema', () => {
    const validBaseEntity = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      created_at: '2023-12-01T10:00:00.000Z',
      updated_at: '2023-12-01T10:00:00.000Z',
    };

    test('accepts valid base entity', () => {
      const result = BaseEntitySchema.safeParse(validBaseEntity);
      expect(result.success).toBe(true);
    });

    test('accepts base entity with deleted_at', () => {
      const entity = {
        ...validBaseEntity,
        deleted_at: '2023-12-01T11:00:00.000Z',
      };
      const result = BaseEntitySchema.safeParse(entity);
      expect(result.success).toBe(true);
    });

    test('rejects invalid UUID', () => {
      const entity = { ...validBaseEntity, id: 'not-a-uuid' };
      const result = BaseEntitySchema.safeParse(entity);
      expect(result.success).toBe(false);
    });

    test('rejects invalid datetime', () => {
      const entity = { ...validBaseEntity, created_at: 'not-a-date' };
      const result = BaseEntitySchema.safeParse(entity);
      expect(result.success).toBe(false);
    });

    test('requires mandatory fields', () => {
      const result = BaseEntitySchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // NESTED SCHEMA TESTS
  // =============================================================================

  describe('ShippingPolicySchema', () => {
    test('accepts valid shipping policy', () => {
      const policy = {
        freeShippingThreshold: 35.0,
        shippingBaseCost: 5.99,
        shippingPerItemCost: 0.5,
        pickupAvailable: true,
      };
      const result = ShippingPolicySchema.safeParse(policy);
      expect(result.success).toBe(true);
    });

    test('accepts empty shipping policy', () => {
      const result = ShippingPolicySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    test('rejects negative costs', () => {
      const policy = { freeShippingThreshold: -10 };
      const result = ShippingPolicySchema.safeParse(policy);
      expect(result.success).toBe(false);
    });
  });

  describe('BundleItemSchema', () => {
    test('accepts valid bundle item', () => {
      const item = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 2.5,
        unit: 'kg',
      };
      const result = BundleItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    test('rejects invalid UUID', () => {
      const item = {
        inventoryItemId: 'not-a-uuid',
        amount: 2.5,
        unit: 'kg',
      };
      const result = BundleItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });

    test('rejects negative amount', () => {
      const item = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        amount: -1,
        unit: 'kg',
      };
      const result = BundleItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });

    test('rejects empty unit', () => {
      const item = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 2.5,
        unit: '',
      };
      const result = BundleItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // SUPPLIER SCHEMA TESTS
  // =============================================================================

  describe('SupplierSchema', () => {
    const validSupplier = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      created_at: '2023-12-01T10:00:00.000Z',
      updated_at: '2023-12-01T10:00:00.000Z',
      name: 'Amazon.ca',
      countryCode: 'CA',
      regionCode: 'CA-NS',
      storeCode: 'amazon-ca',
      defaultCurrency: 'CAD',
      membershipRequired: false,
      membershipType: 'Prime',
      shippingPolicy: {
        freeShippingThreshold: 35.0,
        shippingBaseCost: 5.99,
        pickupAvailable: false,
      },
      urlPatterns: ['https://amazon.ca/*'],
      notes: 'Main Canadian Amazon site',
    };

    test('accepts valid supplier', () => {
      const result = SupplierSchema.safeParse(validSupplier);
      expect(result.success).toBe(true);
    });

    test('accepts minimal supplier', () => {
      const minimal = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T10:00:00.000Z',
        name: 'Test Supplier',
        countryCode: 'US',
        defaultCurrency: 'USD',
        membershipRequired: false,
      };
      const result = SupplierSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    test('rejects invalid country code', () => {
      const supplier = { ...validSupplier, countryCode: 'Canada' };
      const result = SupplierSchema.safeParse(supplier);
      expect(result.success).toBe(false);
    });

    test('rejects invalid region code', () => {
      const supplier = { ...validSupplier, regionCode: 'NS' };
      const result = SupplierSchema.safeParse(supplier);
      expect(result.success).toBe(false);
    });

    test('rejects invalid currency code', () => {
      const supplier = { ...validSupplier, defaultCurrency: 'Canadian' };
      const result = SupplierSchema.safeParse(supplier);
      expect(result.success).toBe(false);
    });

    test('rejects empty name', () => {
      const supplier = { ...validSupplier, name: '' };
      const result = SupplierSchema.safeParse(supplier);
      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // INVENTORY ITEM SCHEMA TESTS
  // =============================================================================

  describe('InventoryItemSchema', () => {
    const validItem = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      created_at: '2023-12-01T10:00:00.000Z',
      updated_at: '2023-12-01T10:00:00.000Z',
      name: 'Pool Chemical',
      category: 'Pool Supplies',
      canonicalDimension: 'mass' as const,
      canonicalUnit: 'g',
      shelfLifeSensitive: true,
      shelfLifeDays: 365,
      usageRatePerDay: 0.1,
      attributes: { concentration: 10, grade: 'pool' },
      equivalenceFactor: 1.0,
      notes: 'Store in cool, dry place',
    };

    test('accepts valid inventory item', () => {
      const result = InventoryItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    test('accepts minimal inventory item', () => {
      const minimal = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T10:00:00.000Z',
        name: 'Test Item',
        canonicalDimension: 'count' as const,
        canonicalUnit: 'unit',
        shelfLifeSensitive: false,
      };
      const result = InventoryItemSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    test('rejects invalid canonical dimension', () => {
      const item = { ...validItem, canonicalDimension: 'weight' };
      const result = InventoryItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });

    test('rejects empty name', () => {
      const item = { ...validItem, name: '' };
      const result = InventoryItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });

    test('rejects negative shelf life', () => {
      const item = { ...validItem, shelfLifeDays: -1 };
      const result = InventoryItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });

    test('rejects negative usage rate', () => {
      const item = { ...validItem, usageRatePerDay: -0.1 };
      const result = InventoryItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // OFFER SCHEMA TESTS
  // =============================================================================

  describe('OfferSchema', () => {
    const validOffer = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      created_at: '2023-12-01T10:00:00.000Z',
      updated_at: '2023-12-01T10:00:00.000Z',
      inventoryItemId: '123e4567-e89b-12d3-a456-426614174001',
      supplierId: '123e4567-e89b-12d3-a456-426614174002',
      supplierNameSnapshot: 'Amazon.ca',
      supplierUrl: 'https://amazon.ca/product/123',
      sourceType: 'url' as const,
      sourceUrl: 'https://amazon.ca/search',
      rawCapture: '{"price": "$15.99", "shipping": "FREE"}',
      observedAt: '2023-12-01T09:30:00.000Z',
      capturedAt: '2023-12-01T10:00:00.000Z',
      totalPrice: 15.99,
      currency: 'CAD',
      isTaxIncluded: true,
      taxRate: 0.15,
      shippingCost: 0,
      minOrderAmount: 25.0,
      freeShippingThresholdAtCapture: 35.0,
      shippingIncluded: true,
      amount: 500,
      amountUnit: 'g',
      amountCanonical: 500,
      pricePerCanonicalExclShipping: 0.032,
      pricePerCanonicalInclShipping: 0.032,
      effectivePricePerCanonical: 0.037,
      bundleId: '123e4567-e89b-12d3-a456-426614174003',
      qualityRating: 4,
      notes: 'Good value for money',
      photoUri: 'https://example.com/photo.jpg',
      computedByVersion: 'v1.0.0',
    };

    test('accepts valid offer', () => {
      const result = OfferSchema.safeParse(validOffer);
      expect(result.success).toBe(true);
    });

    test('accepts minimal offer', () => {
      const minimal = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2023-12-01T10:00:00.000Z',
        updated_at: '2023-12-01T10:00:00.000Z',
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174001',
        supplierId: '123e4567-e89b-12d3-a456-426614174002',
        sourceType: 'manual' as const,
        observedAt: '2023-12-01T09:30:00.000Z',
        capturedAt: '2023-12-01T10:00:00.000Z',
        totalPrice: 10.0,
        currency: 'USD',
        isTaxIncluded: false,
        amount: 1,
        amountUnit: 'unit',
        amountCanonical: 1,
        pricePerCanonicalExclShipping: 10.0,
        pricePerCanonicalInclShipping: 10.0,
        effectivePricePerCanonical: 10.0,
      };
      const result = OfferSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    test('rejects invalid inventory item UUID', () => {
      const offer = { ...validOffer, inventoryItemId: 'not-a-uuid' };
      const result = OfferSchema.safeParse(offer);
      expect(result.success).toBe(false);
    });

    test('rejects invalid supplier UUID', () => {
      const offer = { ...validOffer, supplierId: 'not-a-uuid' };
      const result = OfferSchema.safeParse(offer);
      expect(result.success).toBe(false);
    });

    test('rejects invalid source type', () => {
      const offer = { ...validOffer, sourceType: 'scan' };
      const result = OfferSchema.safeParse(offer);
      expect(result.success).toBe(false);
    });

    test('rejects invalid currency code', () => {
      const offer = { ...validOffer, currency: 'Dollar' };
      const result = OfferSchema.safeParse(offer);
      expect(result.success).toBe(false);
    });

    test('rejects negative total price', () => {
      const offer = { ...validOffer, totalPrice: -1 };
      const result = OfferSchema.safeParse(offer);
      expect(result.success).toBe(false);
    });

    test('rejects invalid tax rate', () => {
      const offer = { ...validOffer, taxRate: 1.5 };
      const result = OfferSchema.safeParse(offer);
      expect(result.success).toBe(false);
    });

    test('rejects invalid quality rating', () => {
      const offer = { ...validOffer, qualityRating: 6 };
      const result = OfferSchema.safeParse(offer);
      expect(result.success).toBe(false);
    });

    test('rejects zero amount', () => {
      const offer = { ...validOffer, amount: 0 };
      const result = OfferSchema.safeParse(offer);
      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // UNIT CONVERSION SCHEMA TESTS
  // =============================================================================

  describe('UnitConversionSchema', () => {
    const validConversion = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      created_at: '2023-12-01T10:00:00.000Z',
      updated_at: '2023-12-01T10:00:00.000Z',
      fromUnit: 'kg',
      toUnit: 'g',
      factor: 1000,
      dimension: 'mass' as const,
    };

    test('accepts valid unit conversion', () => {
      const result = UnitConversionSchema.safeParse(validConversion);
      expect(result.success).toBe(true);
    });

    test('rejects empty units', () => {
      const conversion = { ...validConversion, fromUnit: '' };
      const result = UnitConversionSchema.safeParse(conversion);
      expect(result.success).toBe(false);
    });

    test('rejects zero factor', () => {
      const conversion = { ...validConversion, factor: 0 };
      const result = UnitConversionSchema.safeParse(conversion);
      expect(result.success).toBe(false);
    });

    test('rejects negative factor', () => {
      const conversion = { ...validConversion, factor: -1000 };
      const result = UnitConversionSchema.safeParse(conversion);
      expect(result.success).toBe(false);
    });

    test('rejects invalid dimension', () => {
      const conversion = { ...validConversion, dimension: 'weight' };
      const result = UnitConversionSchema.safeParse(conversion);
      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // BUNDLE SCHEMA TESTS
  // =============================================================================

  describe('BundleSchema', () => {
    const validBundle = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      created_at: '2023-12-01T10:00:00.000Z',
      updated_at: '2023-12-01T10:00:00.000Z',
      supplierId: '123e4567-e89b-12d3-a456-426614174001',
      items: [
        {
          inventoryItemId: '123e4567-e89b-12d3-a456-426614174002',
          amount: 2,
          unit: 'kg',
        },
        {
          inventoryItemId: '123e4567-e89b-12d3-a456-426614174003',
          amount: 1,
          unit: 'unit',
        },
      ],
      priceAllocationMethod: 'equal' as const,
    };

    test('accepts valid bundle', () => {
      const result = BundleSchema.safeParse(validBundle);
      expect(result.success).toBe(true);
    });

    test('rejects empty items array', () => {
      const bundle = { ...validBundle, items: [] };
      const result = BundleSchema.safeParse(bundle);
      expect(result.success).toBe(false);
    });

    test('rejects invalid supplier UUID', () => {
      const bundle = { ...validBundle, supplierId: 'not-a-uuid' };
      const result = BundleSchema.safeParse(bundle);
      expect(result.success).toBe(false);
    });

    test('rejects invalid price allocation method', () => {
      const bundle = { ...validBundle, priceAllocationMethod: 'weighted' };
      const result = BundleSchema.safeParse(bundle);
      expect(result.success).toBe(false);
    });

    test('rejects invalid bundle item', () => {
      const bundle = {
        ...validBundle,
        items: [
          {
            inventoryItemId: 'not-a-uuid',
            amount: 2,
            unit: 'kg',
          },
        ],
      };
      const result = BundleSchema.safeParse(bundle);
      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // VALIDATION UTILITY TESTS
  // =============================================================================

  describe('Validation Utilities', () => {
    const validSupplier = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      created_at: '2023-12-01T10:00:00.000Z',
      updated_at: '2023-12-01T10:00:00.000Z',
      name: 'Test Supplier',
      countryCode: 'CA',
      defaultCurrency: 'CAD',
      membershipRequired: false,
    };

    describe('validateEntity', () => {
      test('returns success for valid data', () => {
        const result = validateEntity(SupplierSchema, validSupplier);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validSupplier);
        }
      });

      test('returns error for invalid data', () => {
        const invalidSupplier = { ...validSupplier, countryCode: 'Invalid' };
        const result = validateEntity(SupplierSchema, invalidSupplier);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.issues.length).toBeGreaterThan(0);
        }
      });
    });

    describe('validateEntityStrict', () => {
      test('returns validated data for valid input', () => {
        const result = validateEntityStrict(SupplierSchema, validSupplier);
        expect(result).toEqual(validSupplier);
      });

      test('throws error for invalid data', () => {
        const invalidSupplier = { ...validSupplier, countryCode: 'Invalid' };
        expect(() => {
          validateEntityStrict(SupplierSchema, invalidSupplier);
        }).toThrow();
      });
    });

    describe('validatePartialEntity', () => {
      test('accepts partial valid data', () => {
        const partial = { name: 'Updated Name' };
        const result = validatePartialEntity(SupplierSchema, partial);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(partial);
        }
      });

      test('rejects partial invalid data', () => {
        const partial = { countryCode: 'Invalid' };
        const result = validatePartialEntity(SupplierSchema, partial);
        expect(result.success).toBe(false);
      });

      test('accepts empty object', () => {
        const result = validatePartialEntity(SupplierSchema, {});
        expect(result.success).toBe(true);
      });
    });
  });
});
