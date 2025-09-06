/**
 * Supplier Validation Integration Tests
 * Tests the integration between validation schemas and repository operations
 */

import { SupplierSchema, CreateSupplierSchema } from '../schemas';
import {
  validateCountryCode,
  validateRegionCode,
  validateCurrencyCode,
  validateUrlPatterns,
  validateShippingPolicy,
} from '../../utils/iso-validation';

describe('Supplier Validation Integration', () => {
  describe('SupplierSchema validation', () => {
    it('should validate a complete valid supplier', () => {
      const validSupplier = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Amazon Canada',
        countryCode: 'CA',
        regionCode: 'CA-ON',
        storeCode: 'amazon-ca',
        defaultCurrency: 'CAD',
        membershipRequired: false,
        membershipType: 'Prime',
        shippingPolicy: {
          freeShippingThreshold: 35.0,
          shippingBaseCost: 5.99,
          shippingPerItemCost: 1.5,
          pickupAvailable: true,
        },
        urlPatterns: ['https://amazon.ca', '*.amazon.ca'],
        notes: 'Canadian Amazon store',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = SupplierSchema.safeParse(validSupplier);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validSupplier);
      }
    });

    it('should validate minimal required fields', () => {
      const minimalSupplier = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Basic Store',
        countryCode: 'US',
        defaultCurrency: 'USD',
        membershipRequired: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = SupplierSchema.safeParse(minimalSupplier);
      expect(result.success).toBe(true);
    });

    it('should reject invalid country codes', () => {
      const invalidSupplier = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Invalid Store',
        countryCode: 'INVALID',
        defaultCurrency: 'USD',
        membershipRequired: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = SupplierSchema.safeParse(invalidSupplier);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Invalid ISO 3166-1 country code'
        );
      }
    });

    it('should reject invalid currency codes', () => {
      const invalidSupplier = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Invalid Store',
        countryCode: 'CA',
        defaultCurrency: 'INVALID',
        membershipRequired: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = SupplierSchema.safeParse(invalidSupplier);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Invalid ISO 4217 currency code'
        );
      }
    });

    it('should reject invalid region codes', () => {
      const invalidSupplier = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Invalid Store',
        countryCode: 'CA',
        regionCode: 'INVALID',
        defaultCurrency: 'CAD',
        membershipRequired: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = SupplierSchema.safeParse(invalidSupplier);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Invalid ISO 3166-2 region code'
        );
      }
    });

    it('should reject invalid URL patterns', () => {
      const invalidSupplier = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Invalid Store',
        countryCode: 'CA',
        defaultCurrency: 'CAD',
        membershipRequired: false,
        urlPatterns: ['not-a-valid-url-pattern'],
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = SupplierSchema.safeParse(invalidSupplier);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid URL pattern');
      }
    });

    it('should reject invalid shipping policy values', () => {
      const invalidSupplier = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Invalid Store',
        countryCode: 'CA',
        defaultCurrency: 'CAD',
        membershipRequired: false,
        shippingPolicy: {
          freeShippingThreshold: -10, // Invalid negative value
          shippingBaseCost: 5.99,
        },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const result = SupplierSchema.safeParse(invalidSupplier);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'must be non-negative'
        );
      }
    });
  });

  describe('CreateSupplierSchema validation', () => {
    it('should validate supplier creation data without timestamps', () => {
      const createData = {
        name: 'New Supplier',
        countryCode: 'CA',
        regionCode: 'CA-BC',
        defaultCurrency: 'CAD',
        membershipRequired: true,
        membershipType: 'Premium',
        shippingPolicy: {
          freeShippingThreshold: 50.0,
          pickupAvailable: true,
        },
        urlPatterns: ['https://newstore.com'],
        notes: 'New store opening',
      };

      const result = CreateSupplierSchema.safeParse(createData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(createData.name);
        expect(result.data.countryCode).toBe(createData.countryCode);
        expect(result.data.membershipRequired).toBe(true);
      }
    });

    it('should reject creation data with invalid fields', () => {
      const invalidCreateData = {
        name: '', // Empty name should be invalid
        countryCode: 'CA',
        defaultCurrency: 'CAD',
        membershipRequired: false,
      };

      const result = CreateSupplierSchema.safeParse(invalidCreateData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'String must contain at least 1 character'
        );
      }
    });
  });

  describe('ISO Validation Utilities Integration', () => {
    describe('validateCountryCode', () => {
      it('should validate common country codes', () => {
        const validCodes = ['CA', 'US', 'GB', 'DE', 'FR', 'JP', 'AU'];

        validCodes.forEach(code => {
          const result = validateCountryCode(code);
          expect(result.isValid).toBe(true);
        });
      });

      it('should reject invalid country codes', () => {
        const invalidCodes = ['XX', 'ZZ', 'ca', 'us', 'CANADA', ''];

        invalidCodes.forEach(code => {
          const result = validateCountryCode(code);
          expect(result.isValid).toBe(false);
        });
      });
    });

    describe('validateRegionCode', () => {
      it('should validate region codes with correct country matching', () => {
        const validRegions = [
          { country: 'CA', region: 'CA-ON' },
          { country: 'CA', region: 'CA-BC' },
          { country: 'US', region: 'US-CA' },
          { country: 'US', region: 'US-NY' },
        ];

        validRegions.forEach(({ country, region }) => {
          const result = validateRegionCode(region, country);
          expect(result.isValid).toBe(true);
        });
      });

      it('should reject mismatched country-region pairs', () => {
        const invalidPairs = [
          { country: 'CA', region: 'US-CA' },
          { country: 'US', region: 'CA-ON' },
          { country: 'GB', region: 'CA-BC' },
        ];

        invalidPairs.forEach(({ country, region }) => {
          const result = validateRegionCode(region, country);
          expect(result.isValid).toBe(false);
        });
      });

      it('should reject malformed region codes', () => {
        const invalidRegions = ['INVALID', 'CA', 'CA-', 'CA-INVALID-FORMAT'];

        invalidRegions.forEach(region => {
          const result = validateRegionCode(region, 'CA');
          expect(result.isValid).toBe(false);
        });
      });
    });

    describe('validateCurrencyCode', () => {
      it('should validate common currency codes', () => {
        const validCurrencies = [
          'USD',
          'CAD',
          'EUR',
          'GBP',
          'JPY',
          'AUD',
          'CHF',
        ];

        validCurrencies.forEach(currency => {
          const result = validateCurrencyCode(currency);
          expect(result.isValid).toBe(true);
        });
      });

      it('should reject invalid currency codes', () => {
        const invalidCurrencies = ['XXX', 'usd', 'DOLLAR', '', 'US'];

        invalidCurrencies.forEach(currency => {
          const result = validateCurrencyCode(currency);
          expect(result.isValid).toBe(false);
        });
      });
    });

    describe('validateUrlPatterns', () => {
      it('should validate various URL pattern formats', () => {
        const validPatterns = [
          ['https://example.com'],
          ['http://example.com'],
          ['https://www.example.com'],
          ['*.example.com'],
          ['example.com'],
          ['subdomain.example.com'],
          ['https://example.com/path'],
          ['https://example.com/path/*'],
          ['https://example.com', '*.example.com'], // Multiple patterns
        ];

        validPatterns.forEach(patterns => {
          const result = validateUrlPatterns(patterns);
          expect(result.isValid).toBe(true);
        });
      });

      it('should reject invalid URL patterns', () => {
        const invalidPatterns = [
          ['not-a-url'],
          ['ftp://example.com'], // Unsupported protocol
          ['https://'],
          ['https://.'],
          ['*.*.example.com'], // Multiple wildcards
          ['example'],
          [''],
        ];

        invalidPatterns.forEach(patterns => {
          const result = validateUrlPatterns(patterns);
          expect(result.isValid).toBe(false);
        });
      });
    });

    describe('validateShippingPolicy', () => {
      it('should validate complete shipping policies', () => {
        const validPolicies = [
          {
            freeShippingThreshold: 35.0,
            shippingBaseCost: 5.99,
            shippingPerItemCost: 1.5,
            pickupAvailable: true,
          },
          {
            freeShippingThreshold: 0, // Free shipping always
            pickupAvailable: false,
          },
          {
            shippingBaseCost: 10.0,
          },
          {}, // Empty policy should be valid
        ];

        validPolicies.forEach(policy => {
          const result = validateShippingPolicy(policy);
          expect(result.isValid).toBe(true);
        });
      });

      it('should reject invalid shipping policies', () => {
        const invalidPolicies = [
          { freeShippingThreshold: -10 }, // Negative threshold
          { shippingBaseCost: -5 }, // Negative cost
          { shippingPerItemCost: -1 }, // Negative per-item cost
          { pickupAvailable: 'yes' as any }, // Wrong type
          { invalidField: 'value' } as any, // Unknown field
        ];

        invalidPolicies.forEach(policy => {
          const result = validateShippingPolicy(policy);
          expect(result.isValid).toBe(false);
        });
      });
    });
  });

  describe('End-to-End Validation Scenarios', () => {
    it('should validate a real-world Amazon supplier', () => {
      const amazonSupplier = {
        name: 'Amazon.ca',
        countryCode: 'CA',
        regionCode: 'CA-ON',
        storeCode: 'amazon-ca-main',
        defaultCurrency: 'CAD',
        membershipRequired: false,
        membershipType: 'Prime',
        shippingPolicy: {
          freeShippingThreshold: 35.0,
          shippingBaseCost: 5.99,
          pickupAvailable: false,
        },
        urlPatterns: [
          'https://amazon.ca',
          'https://www.amazon.ca',
          '*.amazon.ca',
        ],
        notes: 'Canadian Amazon with Prime membership benefits',
      };

      const result = CreateSupplierSchema.safeParse(amazonSupplier);
      expect(result.success).toBe(true);
    });

    it('should validate a real-world Costco supplier', () => {
      const costcoSupplier = {
        name: 'Costco Wholesale Halifax',
        countryCode: 'CA',
        regionCode: 'CA-NS',
        storeCode: 'costco-halifax',
        defaultCurrency: 'CAD',
        membershipRequired: true,
        membershipType: 'Gold Star',
        shippingPolicy: {
          freeShippingThreshold: 75.0,
          shippingBaseCost: 9.99,
          pickupAvailable: true,
        },
        urlPatterns: ['https://costco.ca', 'https://www.costco.ca'],
        notes: 'Membership required for shopping',
      };

      const result = CreateSupplierSchema.safeParse(costcoSupplier);
      expect(result.success).toBe(true);
    });

    it('should validate a minimal local supplier', () => {
      const localSupplier = {
        name: 'Local Hardware Store',
        countryCode: 'CA',
        defaultCurrency: 'CAD',
        membershipRequired: false,
        notes: 'Small local business, cash only',
      };

      const result = CreateSupplierSchema.safeParse(localSupplier);
      expect(result.success).toBe(true);
    });

    it('should reject a supplier with multiple validation errors', () => {
      const invalidSupplier = {
        name: '', // Empty name
        countryCode: 'INVALID', // Invalid country
        defaultCurrency: 'FAKE', // Invalid currency
        membershipRequired: 'yes', // Wrong type
        shippingPolicy: {
          freeShippingThreshold: -10, // Negative value
        },
        urlPatterns: ['not-a-url'], // Invalid URL
      };

      const result = CreateSupplierSchema.safeParse(invalidSupplier);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Should have multiple validation errors
        expect(result.error.issues.length).toBeGreaterThan(1);
      }
    });
  });
});
