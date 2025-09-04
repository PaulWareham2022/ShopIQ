/**
 * Tests for unit conversion validation schemas
 */

import {
  validateConversionRequest,
  validateBatchConversionRequest,
  validatePriceNormalization,
  validateOfferInput,
  safeValidate,
  ConversionRequestSchema,
  BatchConversionRequestSchema,
  PriceNormalizationSchema,
  OfferInputSchema,
} from '../validation-schemas';

describe('Unit Conversion Validation Schemas', () => {
  describe('ConversionRequestSchema', () => {
    it('should validate valid conversion request', () => {
      const validRequest = {
        amount: 2.5,
        unit: 'kg',
        dimension: 'mass' as const,
        id: 'test-123'
      };

      const result = validateConversionRequest(validRequest);
      expect(result).toEqual(validRequest);
    });

    it('should validate request without optional id', () => {
      const validRequest = {
        amount: 1000,
        unit: 'ml',
        dimension: 'volume' as const
      };

      const result = validateConversionRequest(validRequest);
      expect(result).toEqual(validRequest);
    });

    it('should reject negative amount', () => {
      const invalidRequest = {
        amount: -1,
        unit: 'kg',
        dimension: 'mass' as const
      };

      expect(() => validateConversionRequest(invalidRequest))
        .toThrow('Amount must be positive');
    });

    it('should reject zero amount', () => {
      const invalidRequest = {
        amount: 0,
        unit: 'kg',
        dimension: 'mass' as const
      };

      expect(() => validateConversionRequest(invalidRequest))
        .toThrow('Amount must be positive');
    });

    it('should reject infinite amount', () => {
      const invalidRequest = {
        amount: Infinity,
        unit: 'kg',
        dimension: 'mass' as const
      };

      expect(() => validateConversionRequest(invalidRequest))
        .toThrow(); // Zod treats Infinity as invalid number type
    });

    it('should reject empty unit', () => {
      const invalidRequest = {
        amount: 1,
        unit: '',
        dimension: 'mass' as const
      };

      expect(() => validateConversionRequest(invalidRequest))
        .toThrow('Unit cannot be empty');
    });

    it('should reject too long unit name', () => {
      const invalidRequest = {
        amount: 1,
        unit: 'very-long-unit-name-that-exceeds-limit',
        dimension: 'mass' as const
      };

      expect(() => validateConversionRequest(invalidRequest))
        .toThrow('Unit name too long');
    });

    it('should reject invalid dimension', () => {
      const invalidRequest = {
        amount: 1,
        unit: 'kg',
        dimension: 'invalid-dimension'
      };

      expect(() => validateConversionRequest(invalidRequest))
        .toThrow();
    });
  });

  describe('BatchConversionRequestSchema', () => {
    it('should validate valid batch request', () => {
      const validBatch = {
        conversions: [
          { amount: 1, unit: 'kg', dimension: 'mass' as const, id: '1' },
          { amount: 500, unit: 'ml', dimension: 'volume' as const, id: '2' }
        ]
      };

      const result = validateBatchConversionRequest(validBatch);
      expect(result).toEqual(validBatch);
    });

    it('should reject empty conversions array', () => {
      const invalidBatch = {
        conversions: []
      };

      expect(() => validateBatchConversionRequest(invalidBatch))
        .toThrow('At least one conversion required');
    });

    it('should reject batch with invalid conversion', () => {
      const invalidBatch = {
        conversions: [
          { amount: -1, unit: 'kg', dimension: 'mass' as const }
        ]
      };

      expect(() => validateBatchConversionRequest(invalidBatch))
        .toThrow('Amount must be positive');
    });
  });

  describe('PriceNormalizationSchema', () => {
    it('should validate valid price normalization', () => {
      const validPrice = {
        totalPrice: 19.99,
        amount: 2,
        unit: 'kg',
        dimension: 'mass' as const
      };

      const result = validatePriceNormalization(validPrice);
      expect(result).toEqual(validPrice);
    });

    it('should allow zero price', () => {
      const validPrice = {
        totalPrice: 0,
        amount: 1,
        unit: 'unit',
        dimension: 'count' as const
      };

      const result = validatePriceNormalization(validPrice);
      expect(result).toEqual(validPrice);
    });

    it('should reject negative price', () => {
      const invalidPrice = {
        totalPrice: -10,
        amount: 1,
        unit: 'kg',
        dimension: 'mass' as const
      };

      expect(() => validatePriceNormalization(invalidPrice))
        .toThrow('Total price cannot be negative');
    });

    it('should reject zero amount', () => {
      const invalidPrice = {
        totalPrice: 19.99,
        amount: 0,
        unit: 'kg',
        dimension: 'mass' as const
      };

      expect(() => validatePriceNormalization(invalidPrice))
        .toThrow('Amount must be positive');
    });
  });

  describe('OfferInputSchema', () => {
    const validOffer = {
      inventory_item_id: '123e4567-e89b-12d3-a456-426614174000',
      supplier_id: '123e4567-e89b-12d3-a456-426614174001',
      source_type: 'manual' as const,
      observed_at: '2024-01-15T10:00:00.000Z',
      total_price: 19.99,
      currency: 'CAD',
      amount: 2,
      amount_unit: 'kg'
    };

    it('should validate valid offer input', () => {
      const result = validateOfferInput(validOffer);
      expect(result).toEqual(validOffer);
    });

    it('should validate offer with all optional fields', () => {
      const fullOffer = {
        ...validOffer,
        supplier_name_snapshot: 'Test Supplier',
        supplier_url: 'https://example.com/supplier',
        source_url: 'https://example.com/product',
        raw_capture: '{"original": "data"}',
        is_tax_included: true,
        tax_rate: 0.15,
        shipping_cost: 5.99,
        min_order_amount: 25,
        free_shipping_threshold_at_capture: 50,
        shipping_included: false,
        bundle_id: '123e4567-e89b-12d3-a456-426614174002',
        quality_rating: 4,
        notes: 'Test notes',
        photo_uri: 'file://photo.jpg'
      };

      const result = validateOfferInput(fullOffer);
      expect(result).toEqual(fullOffer);
    });

    it('should reject invalid inventory item UUID', () => {
      const invalidOffer = {
        ...validOffer,
        inventory_item_id: 'invalid-uuid'
      };

      expect(() => validateOfferInput(invalidOffer))
        .toThrow('Inventory item ID must be valid UUID');
    });

    it('should reject invalid supplier UUID', () => {
      const invalidOffer = {
        ...validOffer,
        supplier_id: 'invalid-uuid'
      };

      expect(() => validateOfferInput(invalidOffer))
        .toThrow('Supplier ID must be valid UUID');
    });

    it('should reject invalid source type', () => {
      const invalidOffer = {
        ...validOffer,
        source_type: 'invalid-source'
      };

      expect(() => validateOfferInput(invalidOffer))
        .toThrow();
    });

    it('should reject invalid datetime', () => {
      const invalidOffer = {
        ...validOffer,
        observed_at: 'not-a-datetime'
      };

      expect(() => validateOfferInput(invalidOffer))
        .toThrow('Observed time must be valid ISO 8601 datetime');
    });

    it('should reject zero or negative price', () => {
      const invalidOffer = {
        ...validOffer,
        total_price: 0
      };

      expect(() => validateOfferInput(invalidOffer))
        .toThrow('Total price must be positive');
    });

    it('should reject invalid currency code', () => {
      const invalidOffer = {
        ...validOffer,
        currency: 'USD1' // Too long
      };

      expect(() => validateOfferInput(invalidOffer))
        .toThrow('Currency must be 3-letter ISO code');
    });

    it('should reject invalid quality rating', () => {
      const invalidOffer = {
        ...validOffer,
        quality_rating: 6 // Out of range
      };

      expect(() => validateOfferInput(invalidOffer))
        .toThrow();
    });

    it('should reject negative tax rate', () => {
      const invalidOffer = {
        ...validOffer,
        tax_rate: -0.1
      };

      expect(() => validateOfferInput(invalidOffer))
        .toThrow();
    });

    it('should reject tax rate above 100%', () => {
      const invalidOffer = {
        ...validOffer,
        tax_rate: 1.5 // 150%
      };

      expect(() => validateOfferInput(invalidOffer))
        .toThrow();
    });
  });

  describe('safeValidate', () => {
    it('should return success for valid data', () => {
      const validData = {
        amount: 1,
        unit: 'kg',
        dimension: 'mass' as const
      };

      const result = safeValidate(ConversionRequestSchema, validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should return error for invalid data', () => {
      const invalidData = {
        amount: -1,
        unit: 'kg',
        dimension: 'mass' as const
      };

      const result = safeValidate(ConversionRequestSchema, invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.issues[0].message).toContain('Amount must be positive');
      }
    });
  });
});
