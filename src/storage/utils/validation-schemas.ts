/**
 * Zod validation schemas for unit conversion utilities
 * These schemas validate conversion requests and provide type safety
 */

import { z } from 'zod';
import { CanonicalDimensionSchema } from '../validation/schemas';

/**
 * Schema for validating unit conversion requests
 */
export const ConversionRequestSchema = z.object({
  /** Amount to convert (must be positive finite number) */
  amount: z.number().positive('Amount must be positive').refine(val => isFinite(val), 'Amount must be finite'),
  
  /** Source unit (non-empty string) */
  unit: z.string().min(1, 'Unit cannot be empty').max(20, 'Unit name too long'),
  
  /** Expected canonical dimension */
  dimension: CanonicalDimensionSchema,
  
  /** Optional identifier for tracking */
  id: z.string().optional(),
});

/**
 * Schema for batch conversion requests
 */
export const BatchConversionRequestSchema = z.object({
  /** Array of conversion requests */
  conversions: z.array(ConversionRequestSchema).min(1, 'At least one conversion required'),
});

/**
 * Schema for price normalization requests
 */
export const PriceNormalizationSchema = z.object({
  /** Total price of the offer */
  totalPrice: z.number().nonnegative('Total price cannot be negative').refine(val => isFinite(val), 'Total price must be finite'),
  
  /** Amount being purchased */
  amount: z.number().positive('Amount must be positive').refine(val => isFinite(val), 'Amount must be finite'),
  
  /** Unit of the amount */
  unit: z.string().min(1, 'Unit cannot be empty').max(20, 'Unit name too long'),
  
  /** Expected canonical dimension */
  dimension: CanonicalDimensionSchema,
});

/**
 * Schema for offer input validation with unit conversion
 */
export const OfferInputSchema = z.object({
  /** Foreign key to inventory item */
  inventory_item_id: z.string().uuid('Inventory item ID must be valid UUID'),
  
  /** Foreign key to supplier */
  supplier_id: z.string().uuid('Supplier ID must be valid UUID'),
  
  /** Source type */
  source_type: z.enum(['manual', 'url', 'ocr', 'api']),
  
  /** When the price was observed */
  observed_at: z.string().datetime('Observed time must be valid ISO 8601 datetime'),
  
  /** Total price */
  total_price: z.number().positive('Total price must be positive').refine(val => isFinite(val), 'Total price must be finite'),
  
  /** Currency code */
  currency: z.string().length(3, 'Currency must be 3-letter ISO code'),
  
  /** Amount being purchased */
  amount: z.number().positive('Amount must be positive').refine(val => isFinite(val), 'Amount must be finite'),
  
  /** Unit of the amount */
  amount_unit: z.string().min(1, 'Amount unit cannot be empty').max(20, 'Amount unit name too long'),
  
  /** Optional fields */
  supplier_name_snapshot: z.string().optional(),
  supplier_url: z.string().url().optional(),
  source_url: z.string().url().optional(),
  raw_capture: z.string().optional(),
  is_tax_included: z.boolean().optional(),
  tax_rate: z.number().min(0).max(1).optional(),
  shipping_cost: z.number().nonnegative().optional(),
  min_order_amount: z.number().nonnegative().optional(),
  free_shipping_threshold_at_capture: z.number().nonnegative().optional(),
  shipping_included: z.boolean().optional(),
  bundle_id: z.string().uuid().optional(),
  quality_rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
  photo_uri: z.string().optional(),
});

/**
 * Validation functions
 */

/**
 * Validate a single conversion request
 * @param data Raw conversion request data
 * @returns Validated conversion request
 */
export function validateConversionRequest(data: unknown) {
  return ConversionRequestSchema.parse(data);
}

/**
 * Validate a batch of conversion requests
 * @param data Raw batch conversion data
 * @returns Validated batch conversion request
 */
export function validateBatchConversionRequest(data: unknown) {
  return BatchConversionRequestSchema.parse(data);
}

/**
 * Validate price normalization request
 * @param data Raw price normalization data
 * @returns Validated price normalization request
 */
export function validatePriceNormalization(data: unknown) {
  return PriceNormalizationSchema.parse(data);
}

/**
 * Validate offer input with unit conversion requirements
 * @param data Raw offer input data
 * @returns Validated offer input
 */
export function validateOfferInput(data: unknown) {
  return OfferInputSchema.parse(data);
}

/**
 * Safe validation that returns success/error instead of throwing
 * @param schema Zod schema to use for validation
 * @param data Data to validate
 * @returns Validation result with success flag and data/error
 */
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): 
  { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

// Type exports
export type ConversionRequest = z.infer<typeof ConversionRequestSchema>;
export type BatchConversionRequest = z.infer<typeof BatchConversionRequestSchema>;
export type PriceNormalization = z.infer<typeof PriceNormalizationSchema>;
export type ValidatedOfferInput = z.infer<typeof OfferInputSchema>;
