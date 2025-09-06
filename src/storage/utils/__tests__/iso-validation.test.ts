/**
 * Unit tests for ISO validation utilities
 */

import {
  validateCountryCode,
  validateRegionCode,
  validateCurrencyCode,
  validateUrlPatterns,
  validateShippingPolicy,
  validateSupplierFields,
  getCountryName,
  getCurrencyName,
  ISO_COUNTRY_CODES,
  ISO_CURRENCY_CODES,
} from '../iso-validation';

describe('ISO Validation Utilities', () => {
  describe('validateCountryCode', () => {
    it('should validate correct country codes', () => {
      expect(validateCountryCode('CA')).toEqual({ isValid: true });
      expect(validateCountryCode('US')).toEqual({ isValid: true });
      expect(validateCountryCode('GB')).toEqual({ isValid: true });
      expect(validateCountryCode('ca')).toEqual({ isValid: true }); // Should work with lowercase
    });

    it('should reject invalid country codes', () => {
      const result = validateCountryCode('XX');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not a valid ISO 3166-1 country code');
    });

    it('should reject empty or malformed codes', () => {
      expect(validateCountryCode('').isValid).toBe(false);
      expect(validateCountryCode('C').isValid).toBe(false);
      expect(validateCountryCode('CAN').isValid).toBe(false);
      expect(validateCountryCode('C1').isValid).toBe(false);
    });
  });

  describe('validateRegionCode', () => {
    it('should validate correct region codes', () => {
      expect(validateRegionCode('CA-NS')).toEqual({ isValid: true });
      expect(validateRegionCode('US-CA')).toEqual({ isValid: true });
      expect(validateRegionCode('GB-ENG')).toEqual({ isValid: true });
    });

    it('should validate region codes match country', () => {
      const result = validateRegionCode('US-CA', 'CA');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('does not match supplier country');
    });

    it('should allow empty region codes', () => {
      expect(validateRegionCode('')).toEqual({ isValid: true });
      expect(validateRegionCode(undefined as any)).toEqual({ isValid: true });
    });

    it('should reject malformed region codes', () => {
      expect(validateRegionCode('CANS').isValid).toBe(false);
      expect(validateRegionCode('CA-').isValid).toBe(false);
      expect(validateRegionCode('CA-NSNS').isValid).toBe(false);
    });
  });

  describe('validateCurrencyCode', () => {
    it('should validate correct currency codes', () => {
      expect(validateCurrencyCode('CAD')).toEqual({ isValid: true });
      expect(validateCurrencyCode('USD')).toEqual({ isValid: true });
      expect(validateCurrencyCode('EUR')).toEqual({ isValid: true });
    });

    it('should reject invalid currency codes', () => {
      const result = validateCurrencyCode('ZZZ'); // ZZZ is not a valid currency code
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not a valid ISO 4217 currency code');
    });

    it('should reject empty or malformed codes', () => {
      expect(validateCurrencyCode('').isValid).toBe(false);
      expect(validateCurrencyCode('CA').isValid).toBe(false);
      expect(validateCurrencyCode('CADD').isValid).toBe(false);
      expect(validateCurrencyCode('C1D').isValid).toBe(false);
    });
  });

  describe('validateUrlPatterns', () => {
    it('should validate correct URL patterns', () => {
      expect(validateUrlPatterns(['https://example.com'])).toEqual({
        isValid: true,
      });
      expect(validateUrlPatterns(['example.com', 'shop.example.com'])).toEqual({
        isValid: true,
      });
      expect(validateUrlPatterns(['*.example.com'])).toEqual({ isValid: true });
    });

    it('should allow empty patterns', () => {
      expect(validateUrlPatterns([])).toEqual({ isValid: true });
      expect(validateUrlPatterns(undefined as any)).toEqual({ isValid: true });
    });

    it('should reject invalid patterns', () => {
      const result = validateUrlPatterns(['invalid pattern with spaces']);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not a valid URL pattern');
    });
  });

  describe('validateShippingPolicy', () => {
    it('should validate correct shipping policies', () => {
      expect(
        validateShippingPolicy({
          freeShippingThreshold: 35.0,
          shippingBaseCost: 5.99,
          shippingPerItemCost: 1.5,
          pickupAvailable: true,
        })
      ).toEqual({ isValid: true });
    });

    it('should allow empty policies', () => {
      expect(validateShippingPolicy(undefined as any)).toEqual({
        isValid: true,
      });
      expect(validateShippingPolicy({})).toEqual({ isValid: true });
    });

    it('should reject negative values', () => {
      expect(
        validateShippingPolicy({ freeShippingThreshold: -1 }).isValid
      ).toBe(false);
      expect(validateShippingPolicy({ shippingBaseCost: -1 }).isValid).toBe(
        false
      );
      expect(validateShippingPolicy({ shippingPerItemCost: -1 }).isValid).toBe(
        false
      );
    });
  });

  describe('validateSupplierFields', () => {
    const validSupplier = {
      name: 'Test Supplier',
      countryCode: 'CA',
      regionCode: 'CA-NS',
      defaultCurrency: 'CAD',
      urlPatterns: ['https://example.com'],
      shippingPolicy: {
        freeShippingThreshold: 35.0,
        shippingBaseCost: 5.99,
      },
    };

    it('should validate correct supplier data', () => {
      const results = validateSupplierFields(validSupplier);
      const invalidResults = results.filter(r => !r.isValid);
      expect(invalidResults).toHaveLength(0);
    });

    it('should catch multiple validation errors', () => {
      const invalidSupplier = {
        name: '',
        countryCode: 'XX',
        regionCode: 'INVALID',
        defaultCurrency: 'XXX',
        urlPatterns: ['not-a-url'],
        shippingPolicy: {
          freeShippingThreshold: -1,
        },
      };

      const results = validateSupplierFields(invalidSupplier);
      const invalidResults = results.filter(r => !r.isValid);
      expect(invalidResults.length).toBeGreaterThan(0);
    });
  });

  describe('getCountryName', () => {
    it('should return country names for known codes', () => {
      expect(getCountryName('CA')).toBe('Canada');
      expect(getCountryName('US')).toBe('United States');
      expect(getCountryName('GB')).toBe('United Kingdom');
    });

    it('should return the code for unknown countries', () => {
      expect(getCountryName('ZZ')).toBe('ZZ');
    });
  });

  describe('getCurrencyName', () => {
    it('should return currency names for known codes', () => {
      expect(getCurrencyName('CAD')).toBe('Canadian Dollar');
      expect(getCurrencyName('USD')).toBe('US Dollar');
      expect(getCurrencyName('EUR')).toBe('Euro');
    });

    it('should return the code for unknown currencies', () => {
      expect(getCurrencyName('ZZZ')).toBe('ZZZ');
    });
  });

  describe('ISO code sets', () => {
    it('should contain expected country codes', () => {
      expect(ISO_COUNTRY_CODES.has('CA')).toBe(true);
      expect(ISO_COUNTRY_CODES.has('US')).toBe(true);
      expect(ISO_COUNTRY_CODES.has('GB')).toBe(true);
      expect(ISO_COUNTRY_CODES.has('XX')).toBe(false);
    });

    it('should contain expected currency codes', () => {
      expect(ISO_CURRENCY_CODES.has('CAD')).toBe(true);
      expect(ISO_CURRENCY_CODES.has('USD')).toBe(true);
      expect(ISO_CURRENCY_CODES.has('EUR')).toBe(true);
      expect(ISO_CURRENCY_CODES.has('ZZZ')).toBe(false); // ZZZ is not a valid currency
    });
  });
});
