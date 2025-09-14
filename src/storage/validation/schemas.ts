/**
 * Zod validation schemas for storage entities
 * These schemas mirror the TypeScript interfaces and provide runtime validation
 */

import { z } from 'zod';
import {
  validateUrlPatterns,
  ISO_COUNTRY_CODES,
  ISO_CURRENCY_CODES,
} from '../utils/iso-validation';

// =============================================================================
// ENUM AND COMMON TYPE SCHEMAS
// =============================================================================

/**
 * Canonical dimension types for unit conversion validation
 */
export const CanonicalDimensionSchema = z.enum([
  'mass',
  'volume',
  'count',
  'length',
  'area',
]);

/**
 * Source types for offer provenance tracking
 */
export const SourceTypeSchema = z.enum(['manual', 'url', 'ocr', 'api']);

/**
 * Price allocation methods for bundle pricing
 */
export const PriceAllocationMethodSchema = z.enum([
  'equal',
  'by-canonical-amount',
  'manual',
]);

/**
 * Base entity schema - all entities must have these fields
 */
export const BaseEntitySchema = z.object({
  /** Unique identifier (UUIDv4) */
  id: z.string().uuid('ID must be a valid UUID'),
  /** ISO 8601 timestamp when entity was created */
  created_at: z
    .string()
    .datetime('created_at must be a valid ISO 8601 datetime'),
  /** ISO 8601 timestamp when entity was last updated */
  updated_at: z
    .string()
    .datetime('updated_at must be a valid ISO 8601 datetime'),
  /** ISO 8601 timestamp when entity was soft-deleted (null if not deleted) */
  deleted_at: z
    .string()
    .datetime('deleted_at must be a valid ISO 8601 datetime')
    .nullable()
    .optional(),
});

// =============================================================================
// NESTED INTERFACE SCHEMAS
// =============================================================================

/**
 * Shipping policy structure for suppliers
 */
export const ShippingPolicySchema = z.object({
  /** Minimum order total to waive shipping (e.g., 35.00) */
  freeShippingThreshold: z
    .number()
    .min(0, 'Free shipping threshold must be non-negative')
    .optional(),
  /** Base shipping when threshold not met (e.g., 5.99) */
  shippingBaseCost: z
    .number()
    .min(0, 'Shipping base cost must be non-negative')
    .optional(),
  /** Optional per-item adder where applicable */
  shippingPerItemCost: z
    .number()
    .min(0, 'Shipping per-item cost must be non-negative')
    .optional(),
  /** Whether in-store/locker pickup can zero shipping */
  pickupAvailable: z.boolean().optional(),
});

/**
 * Bundle item structure
 */
export const BundleItemSchema = z.object({
  /** Foreign key to inventory item */
  inventoryItemId: z.string().uuid('Inventory item ID must be a valid UUID'),
  /** Quantity of the item in the bundle */
  amount: z.number().positive('Amount must be positive'),
  /** Unit for the amount */
  unit: z.string().min(1, 'Unit cannot be empty'),
});

// =============================================================================
// MAIN ENTITY SCHEMAS
// =============================================================================

/**
 * Supplier entity validation schema
 */
export const SupplierSchema = BaseEntitySchema.extend({
  /** Canonical supplier/store name used for display and dedupe */
  name: z
    .string()
    .min(1, 'Supplier name cannot be empty')
    .max(200, 'Supplier name too long'),

  /** ISO 3166-1 alpha-2 country code */
  countryCode: z
    .string()
    .length(2, 'Country code must be 2 characters')
    .regex(/^[A-Z]{2}$/, 'Country code must be uppercase')
    .refine(code => ISO_COUNTRY_CODES.has(code.toUpperCase()), {
      message: 'Invalid ISO 3166-1 country code',
    }),

  /** ISO 3166-2 region code */
  regionCode: z
    .string()
    .regex(
      /^[A-Z]{2}-[A-Z0-9]{1,3}$/,
      'Region code must follow ISO 3166-2 format'
    )
    .optional(),

  /** Internal short code for multiple outlets */
  storeCode: z.string().max(50, 'Store code too long').optional(),

  /** ISO 4217 currency code */
  defaultCurrency: z
    .string()
    .length(3, 'Currency code must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency code must be uppercase')
    .refine(code => ISO_CURRENCY_CODES.has(code.toUpperCase()), {
      message: 'Invalid ISO 4217 currency code',
    }),

  /** Indicates membership affects access/pricing */
  membershipRequired: z.boolean(),

  /** Free text membership type */
  membershipType: z.string().max(100, 'Membership type too long').optional(),

  /** JSON object for shipping economics */
  shippingPolicy: ShippingPolicySchema.optional(),

  /** Array of hostname/path hints */
  urlPatterns: z
    .array(z.string().min(1, 'URL pattern cannot be empty'))
    .refine(
      patterns => {
        const result = validateUrlPatterns(patterns);
        return result.isValid;
      },
      { message: 'Invalid URL pattern' }
    )
    .optional(),

  /** Free text for operational notes */
  notes: z.string().max(1000, 'Notes too long').optional(),

  /** Personal quality rating 1-5 for supplier reliability/quality */
  rating: z
    .number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be >= 1')
    .max(5, 'Rating must be <= 5')
    .optional(),
});

/**
 * Inventory item entity validation schema
 */
export const InventoryItemSchema = BaseEntitySchema.extend({
  /** Human-friendly item name */
  name: z
    .string()
    .min(1, 'Item name cannot be empty')
    .max(200, 'Item name too long'),

  /** Optional grouping category */
  category: z.string().max(100, 'Category too long').optional(),

  /** Canonical dimension for unit normalization */
  canonicalDimension: CanonicalDimensionSchema,

  /** The canonical unit for normalization */
  canonicalUnit: z
    .string()
    .min(1, 'Canonical unit cannot be empty')
    .max(20, 'Canonical unit too long'),

  /** Whether item shows expiry-risk warnings */
  shelfLifeSensitive: z.boolean(),

  /** Typical shelf life in days */
  shelfLifeDays: z
    .number()
    .int('Shelf life must be an integer')
    .min(1, 'Shelf life must be positive')
    .optional(),

  /** Usage rate in canonical units per day */
  usageRatePerDay: z
    .number()
    .min(0, 'Usage rate must be non-negative')
    .optional(),

  /** JSON map for equivalence attributes */
  attributes: z.record(z.string(), z.any()).optional(),

  /** Multiplier for adjusted comparability */
  equivalenceFactor: z
    .number()
    .min(0, 'Equivalence factor must be non-negative')
    .optional(),

  /** Free text notes */
  notes: z.string().max(1000, 'Notes too long').optional(),
});

/**
 * Supplier create schema
 * Used when creating a brand new supplier where id/created_at/updated_at are generated by repository
 */
export const CreateSupplierSchema = SupplierSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
});

/**
 * Inventory item create schema
 * Used when creating a brand new item where id/created_at/updated_at are generated by repository
 */
export const CreateInventoryItemSchema = InventoryItemSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
});

/**
 * Offer entity validation schema (most complex entity)
 */
export const OfferSchema = BaseEntitySchema.extend({
  /** Foreign key to inventory item */
  inventoryItemId: z.string().uuid('Inventory item ID must be a valid UUID'),

  /** Foreign key to supplier */
  supplierId: z.string().uuid('Supplier ID must be a valid UUID'),

  /** Denormalized supplier name at capture time */
  supplierNameSnapshot: z
    .string()
    .max(200, 'Supplier name snapshot too long')
    .optional(),

  /** Product/offer URL for revisit */
  supplierUrl: z.string().url('Supplier URL must be valid').optional(),

  /** Provenance for data trust */
  sourceType: SourceTypeSchema,

  /** Source URL if different from supplier URL */
  sourceUrl: z.string().url('Source URL must be valid').optional(),

  /** Raw parsed values for audit */
  rawCapture: z.string().optional(),

  /** When the price was observed */
  observedAt: z
    .string()
    .datetime('observedAt must be a valid ISO 8601 datetime'),

  /** When the offer was captured */
  capturedAt: z
    .string()
    .datetime('capturedAt must be a valid ISO 8601 datetime'),

  /** Total price at point of sale */
  totalPrice: z.number().min(0, 'Total price must be non-negative'),

  /** ISO 4217 currency code */
  currency: z
    .string()
    .length(3, 'Currency code must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency code must be uppercase'),

  /** Whether price includes sales tax */
  isTaxIncluded: z.boolean(),

  /** Applied tax rate if known */
  taxRate: z
    .number()
    .min(0, 'Tax rate must be non-negative')
    .max(1, 'Tax rate must be <= 1')
    .optional(),

  /** Shipping cost for this offer */
  shippingCost: z
    .number()
    .min(0, 'Shipping cost must be non-negative')
    .optional(),

  /** Minimum order amount */
  minOrderAmount: z
    .number()
    .min(0, 'Minimum order amount must be non-negative')
    .optional(),

  /** Supplier threshold at capture time */
  freeShippingThresholdAtCapture: z
    .number()
    .min(0, 'Free shipping threshold must be non-negative')
    .optional(),

  /** Whether shipping has been waived */
  shippingIncluded: z.boolean().optional(),

  /** Quantity purchased */
  amount: z.number().positive('Amount must be positive'),

  /** Unit as displayed on label */
  amountUnit: z
    .string()
    .min(1, 'Amount unit cannot be empty')
    .max(20, 'Amount unit too long'),

  /** Quantity in canonical units */
  amountCanonical: z.number().positive('Canonical amount must be positive'),

  /** Computed pre-tax price per canonical unit */
  pricePerCanonicalExclShipping: z
    .number()
    .min(0, 'Price per canonical excl shipping must be non-negative'),

  /** Computed price per canonical unit including shipping */
  pricePerCanonicalInclShipping: z
    .number()
    .min(0, 'Price per canonical incl shipping must be non-negative'),

  /** Final normalized comparator price */
  effectivePricePerCanonical: z
    .number()
    .min(0, 'Effective price per canonical must be non-negative'),

  /** Bundle ID if part of multi-item bundle */
  bundleId: z.string().uuid('Bundle ID must be a valid UUID').optional(),

  /** Personal quality rating 1-5 */
  qualityRating: z
    .number()
    .int('Quality rating must be an integer')
    .min(1, 'Quality rating must be >= 1')
    .max(5, 'Quality rating must be <= 5')
    .optional(),

  /** Free text notes */
  notes: z.string().max(1000, 'Notes too long').optional(),

  /** Optional image reference */
  photoUri: z.string().url('Photo URI must be valid').optional(),

  /** Normalization algorithm version */
  computedByVersion: z
    .string()
    .max(50, 'Computed by version too long')
    .optional(),
});

/**
 * Unit conversion entity validation schema
 */
export const UnitConversionSchema = BaseEntitySchema.extend({
  /** Unit symbol being converted from */
  fromUnit: z
    .string()
    .min(1, 'From unit cannot be empty')
    .max(20, 'From unit too long'),

  /** Canonical unit symbol being converted to */
  toUnit: z
    .string()
    .min(1, 'To unit cannot be empty')
    .max(20, 'To unit too long'),

  /** Conversion factor multiplier */
  factor: z.number().positive('Conversion factor must be positive'),

  /** Dimension type for validation */
  dimension: CanonicalDimensionSchema,
});

/**
 * Bundle entity validation schema
 */
export const BundleSchema = BaseEntitySchema.extend({
  /** Foreign key to supplier */
  supplierId: z.string().uuid('Supplier ID must be a valid UUID'),

  /** Array of bundle items */
  items: z
    .array(BundleItemSchema)
    .min(1, 'Bundle must contain at least one item'),

  /** How to allocate bundle price */
  priceAllocationMethod: PriceAllocationMethodSchema,
});

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validates an entity against its schema and returns typed result
 */
export function validateEntity<T>(
  schema: z.ZodSchema<T>,
  data: unknown
):
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      errors: z.ZodError;
    } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Validates an entity and throws on validation failure
 */
export function validateEntityStrict<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  return schema.parse(data);
}

/**
 * Validates partial entity data (for updates)
 */
export function validatePartialEntity<T>(
  schema: z.ZodObject<any>,
  data: unknown
):
  | {
      success: true;
      data: Partial<T>;
    }
  | {
      success: false;
      errors: z.ZodError;
    } {
  const partialSchema = schema.partial();
  const result = partialSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data as Partial<T> };
  } else {
    return { success: false, errors: result.error };
  }
}

// =============================================================================
// FORM INPUT SCHEMAS
// =============================================================================

/**
 * Offer form input validation schema
 * Used for validating user input in the OfferForm component before submission
 */
export const OfferFormInputSchema = z.object({
  // Required fields
  inventoryItemId: z
    .string()
    .min(1, 'Please select an inventory item')
    .uuid('Invalid inventory item selection'),

  supplierId: z
    .string()
    .min(1, 'Please select a supplier')
    .uuid('Invalid supplier selection'),

  totalPrice: z
    .string()
    .min(1, 'Total price is required')
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Total price must be a positive number',
    }),

  currency: z
    .string()
    .min(1, 'Currency is required')
    .length(3, 'Currency must be a 3-letter code (e.g., CAD, USD)')
    .regex(/^[A-Z]{3}$/, 'Currency must be uppercase letters')
    .refine(code => ISO_CURRENCY_CODES.has(code), {
      message: 'Invalid currency code',
    })
    .optional(),

  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Amount must be a positive number',
    }),

  amountUnit: z
    .string()
    .min(1, 'Amount unit is required')
    .max(20, 'Amount unit too long')
    .optional(),

  // Optional fields with validation
  supplierNameSnapshot: z
    .string()
    .max(200, 'Supplier name too long')
    .optional(),

  supplierUrl: z
    .string()
    .refine(val => !val || z.string().url().safeParse(val).success, {
      message: 'Supplier URL must be valid',
    })
    .optional(),

  sourceType: SourceTypeSchema.default('manual'),

  sourceUrl: z
    .string()
    .refine(val => !val || z.string().url().safeParse(val).success, {
      message: 'Source URL must be valid',
    })
    .optional(),

  observedAt: z
    .string()
    .datetime('Observed date must be a valid ISO 8601 datetime'),

  // Default UI assumption: tax is not included in price for now
  isTaxIncluded: z.boolean().default(false),

  // Tax rate not collected in UI; keep validation but allow empty
  taxRate: z.string().optional(),

  shippingCost: z
    .string()
    .refine(val => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: 'Shipping cost must be a non-negative number',
    })
    .optional(),

  shippingIncluded: z.boolean().default(false),

  qualityRating: z
    .string()
    .refine(
      val =>
        !val || (!isNaN(Number(val)) && Number(val) >= 1 && Number(val) <= 5),
      {
        message: 'Quality rating must be between 1 and 5',
      }
    )
    .optional(),

  notes: z.string().max(1000, 'Notes too long').optional(),

  photoUri: z
    .string()
    .refine(val => !val || z.string().url().safeParse(val).success, {
      message: 'Photo URI must be valid',
    })
    .optional(),
});

// =============================================================================
// EXPORTS
// =============================================================================

export type {
  CanonicalDimension,
  SourceType,
  PriceAllocationMethod,
} from '../types/index';

export type ValidatedSupplier = z.infer<typeof SupplierSchema>;
export type ValidatedNewSupplier = z.infer<typeof CreateSupplierSchema>;
export type ValidatedInventoryItem = z.infer<typeof InventoryItemSchema>;
export type ValidatedNewInventoryItem = z.infer<
  typeof CreateInventoryItemSchema
>;
export type ValidatedOffer = z.infer<typeof OfferSchema>;
export type ValidatedUnitConversion = z.infer<typeof UnitConversionSchema>;
export type ValidatedBundle = z.infer<typeof BundleSchema>;
export type ValidatedShippingPolicy = z.infer<typeof ShippingPolicySchema>;
export type ValidatedBundleItem = z.infer<typeof BundleItemSchema>;
export type ValidatedOfferFormInput = z.infer<typeof OfferFormInputSchema>;

// Export all schemas for easy access
export const ValidationSchemas = {
  BaseEntity: BaseEntitySchema,
  Supplier: SupplierSchema,
  InventoryItem: InventoryItemSchema,
  Offer: OfferSchema,
  UnitConversion: UnitConversionSchema,
  Bundle: BundleSchema,
  ShippingPolicy: ShippingPolicySchema,
  BundleItem: BundleItemSchema,
  CanonicalDimension: CanonicalDimensionSchema,
  SourceType: SourceTypeSchema,
  PriceAllocationMethod: PriceAllocationMethodSchema,
  OfferFormInput: OfferFormInputSchema,
} as const;
