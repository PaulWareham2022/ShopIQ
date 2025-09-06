/**
 * Price Calculation Utilities
 *
 * Comprehensive price calculation functions for the comparison engine.
 * Handles price-per-canonical-unit calculations with support for shipping,
 * tax, and various edge cases.
 */

import { Offer, InventoryItem, CanonicalDimension } from '../types';
import { validateAndConvert } from '../utils/canonical-units';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

/**
 * Options for price calculations
 */
export interface PriceCalculationOptions {
  /** Include shipping costs in the calculation */
  includeShipping?: boolean;
  /** Include tax in the calculation */
  includeTax?: boolean;
  /** Use the effective price (pre-calculated) instead of computing from components */
  useEffectivePrice?: boolean;
  /** Apply equivalence factors from inventory item */
  applyEquivalenceFactors?: boolean;
  /** Currency conversion rate (multiply by this rate) */
  currencyRate?: number;
  /** Minimum confidence threshold for calculations */
  minConfidence?: number;
}

/**
 * Result of a price calculation
 */
export interface PriceCalculationResult {
  /** The calculated price per canonical unit */
  pricePerCanonical: number;
  /** Whether the calculation was successful */
  success: boolean;
  /** Error message if calculation failed */
  errorMessage?: string;
  /** Confidence level in the calculation (0-1) */
  confidence: number;
  /** Breakdown of the calculation components */
  breakdown: {
    basePrice: number;
    shippingCost: number;
    taxCost: number;
    totalCost: number;
    canonicalAmount: number;
    pricePerCanonical: number;
  };
  /** Flags indicating special conditions */
  flags: string[];
}

/**
 * Validation result for price calculation inputs
 */
export interface PriceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate inputs for price calculation
 */
export function validatePriceCalculationInputs(
  offer: Offer,
  inventoryItem: InventoryItem,
  options: PriceCalculationOptions = {}
): PriceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate offer
  if (!offer) {
    errors.push('Offer is required');
    return { isValid: false, errors, warnings };
  }

  if (!Number.isFinite(offer.totalPrice) || offer.totalPrice <= 0) {
    errors.push('Offer total price must be a positive finite number');
  }

  if (!Number.isFinite(offer.amount) || offer.amount <= 0) {
    errors.push('Offer amount must be a positive finite number');
  }

  if (!offer.amountUnit || offer.amountUnit.trim() === '') {
    errors.push('Offer amount unit is required');
  }

  // Validate inventory item
  if (!inventoryItem) {
    errors.push('Inventory item is required');
    return { isValid: false, errors, warnings };
  }

  if (!inventoryItem.canonicalDimension) {
    errors.push('Inventory item canonical dimension is required');
  }

  // Validate unit conversion
  if (offer.amountUnit && inventoryItem.canonicalDimension) {
    const validation = validateAndConvert(
      offer.amount,
      offer.amountUnit,
      inventoryItem.canonicalDimension
    );

    if (!validation.isValid) {
      errors.push(`Unit conversion failed: ${validation.errorMessage}`);
    }
  }

  // Validate shipping data
  if (options.includeShipping && offer.shippingCost !== undefined) {
    if (!Number.isFinite(offer.shippingCost) || offer.shippingCost < 0) {
      warnings.push('Shipping cost is not a valid positive number');
    }
  }

  // Validate tax data
  if (options.includeTax && offer.taxRate !== undefined) {
    if (!Number.isFinite(offer.taxRate) || offer.taxRate < 0) {
      warnings.push('Tax rate is not a valid positive number');
    }
  }

  // Validate currency rate
  if (options.currencyRate !== undefined) {
    if (!Number.isFinite(options.currencyRate) || options.currencyRate <= 0) {
      errors.push('Currency rate must be a positive finite number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// CORE CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate price per canonical unit excluding shipping and tax
 */
export function calculatePricePerCanonicalExcluding(
  offer: Offer,
  inventoryItem: InventoryItem,
  options: PriceCalculationOptions = {}
): PriceCalculationResult {
  // Validate inputs
  const validation = validatePriceCalculationInputs(offer, inventoryItem, options);
  if (!validation.isValid) {
    return {
      pricePerCanonical: 0,
      success: false,
      errorMessage: validation.errors.join('; '),
      confidence: 0,
      breakdown: {
        basePrice: 0,
        shippingCost: 0,
        taxCost: 0,
        totalCost: 0,
        canonicalAmount: 0,
        pricePerCanonical: 0,
      },
      flags: ['validation-failed'],
    };
  }

  try {
    // Convert amount to canonical unit
    const unitValidation = validateAndConvert(
      offer.amount,
      offer.amountUnit,
      inventoryItem.canonicalDimension
    );

    if (!unitValidation.isValid || !unitValidation.canonicalAmount) {
      return {
        pricePerCanonical: 0,
        success: false,
        errorMessage: `Unit conversion failed: ${unitValidation.errorMessage}`,
        confidence: 0,
        breakdown: {
          basePrice: 0,
          shippingCost: 0,
          taxCost: 0,
          totalCost: 0,
          canonicalAmount: 0,
          pricePerCanonical: 0,
        },
        flags: ['conversion-failed'],
      };
    }

    const canonicalAmount = unitValidation.canonicalAmount;
    const basePrice = offer.totalPrice;
    const shippingCost = 0; // Excluding shipping
    const taxCost = 0; // Excluding tax
    const totalCost = basePrice;
    const pricePerCanonical = totalCost / canonicalAmount;

    // Apply currency conversion if specified
    let finalPrice = pricePerCanonical;
    if (options.currencyRate && options.currencyRate !== 1.0) {
      finalPrice = pricePerCanonical * options.currencyRate;
    }

    // Apply equivalence factors if enabled
    if (options.applyEquivalenceFactors !== false && inventoryItem.equivalenceFactor) {
      finalPrice = finalPrice * inventoryItem.equivalenceFactor;
    }

    // Calculate confidence based on data completeness
    let confidence = 1.0;
    const flags: string[] = [];

    if (!offer.shippingIncluded) {
      flags.push('shipping-excluded');
    }
    if (!offer.isTaxIncluded) {
      flags.push('tax-excluded');
    }
    if (offer.qualityRating && offer.qualityRating >= 4) {
      flags.push('high-quality');
    }

    // Reduce confidence for missing data
    if (offer.shippingCost === undefined) {
      confidence -= 0.1;
    }
    if (offer.taxRate === undefined) {
      confidence -= 0.1;
    }

    return {
      pricePerCanonical: finalPrice,
      success: true,
      confidence: Math.max(0, confidence),
      breakdown: {
        basePrice,
        shippingCost,
        taxCost,
        totalCost,
        canonicalAmount,
        pricePerCanonical: finalPrice,
      },
      flags,
    };
  } catch (error) {
    return {
      pricePerCanonical: 0,
      success: false,
      errorMessage: `Calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      confidence: 0,
      breakdown: {
        basePrice: 0,
        shippingCost: 0,
        taxCost: 0,
        totalCost: 0,
        canonicalAmount: 0,
        pricePerCanonical: 0,
      },
      flags: ['calculation-error'],
    };
  }
}

/**
 * Calculate price per canonical unit including shipping and tax
 */
export function calculatePricePerCanonicalIncluding(
  offer: Offer,
  inventoryItem: InventoryItem,
  options: PriceCalculationOptions = {}
): PriceCalculationResult {
  // Validate inputs
  const validation = validatePriceCalculationInputs(offer, inventoryItem, options);
  if (!validation.isValid) {
    return {
      pricePerCanonical: 0,
      success: false,
      errorMessage: validation.errors.join('; '),
      confidence: 0,
      breakdown: {
        basePrice: 0,
        shippingCost: 0,
        taxCost: 0,
        totalCost: 0,
        canonicalAmount: 0,
        pricePerCanonical: 0,
      },
      flags: ['validation-failed'],
    };
  }

  try {
    // Convert amount to canonical unit
    const unitValidation = validateAndConvert(
      offer.amount,
      offer.amountUnit,
      inventoryItem.canonicalDimension
    );

    if (!unitValidation.isValid || !unitValidation.canonicalAmount) {
      return {
        pricePerCanonical: 0,
        success: false,
        errorMessage: `Unit conversion failed: ${unitValidation.errorMessage}`,
        confidence: 0,
        breakdown: {
          basePrice: 0,
          shippingCost: 0,
          taxCost: 0,
          totalCost: 0,
          canonicalAmount: 0,
          pricePerCanonical: 0,
        },
        flags: ['conversion-failed'],
      };
    }

    const canonicalAmount = unitValidation.canonicalAmount;
    const basePrice = offer.totalPrice;

    // Calculate shipping cost
    let shippingCost = 0;
    if (options.includeShipping !== false) {
      if (offer.shippingIncluded) {
        shippingCost = 0; // Already included in total price
      } else if (offer.shippingCost !== undefined) {
        shippingCost = offer.shippingCost;
      }
    }

    // Calculate tax cost
    let taxCost = 0;
    if (options.includeTax !== false) {
      if (offer.isTaxIncluded) {
        taxCost = 0; // Already included in total price
      } else if (offer.taxRate !== undefined) {
        taxCost = basePrice * offer.taxRate;
      }
    }

    const totalCost = basePrice + shippingCost + taxCost;
    const pricePerCanonical = totalCost / canonicalAmount;

    // Apply currency conversion if specified
    let finalPrice = pricePerCanonical;
    if (options.currencyRate && options.currencyRate !== 1.0) {
      finalPrice = pricePerCanonical * options.currencyRate;
    }

    // Apply equivalence factors if enabled
    if (options.applyEquivalenceFactors !== false && inventoryItem.equivalenceFactor) {
      finalPrice = finalPrice * inventoryItem.equivalenceFactor;
    }

    // Calculate confidence based on data completeness
    let confidence = 1.0;
    const flags: string[] = [];

    if (offer.shippingIncluded) {
      flags.push('shipping-included');
    }
    if (offer.isTaxIncluded) {
      flags.push('tax-included');
    }
    if (offer.qualityRating && offer.qualityRating >= 4) {
      flags.push('high-quality');
    }

    // Reduce confidence for missing data
    if (offer.shippingCost === undefined && !offer.shippingIncluded) {
      confidence -= 0.2;
      flags.push('shipping-unknown');
    }
    if (offer.taxRate === undefined && !offer.isTaxIncluded) {
      confidence -= 0.2;
      flags.push('tax-unknown');
    }

    return {
      pricePerCanonical: finalPrice,
      success: true,
      confidence: Math.max(0, confidence),
      breakdown: {
        basePrice,
        shippingCost,
        taxCost,
        totalCost,
        canonicalAmount,
        pricePerCanonical: finalPrice,
      },
      flags,
    };
  } catch (error) {
    return {
      pricePerCanonical: 0,
      success: false,
      errorMessage: `Calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      confidence: 0,
      breakdown: {
        basePrice: 0,
        shippingCost: 0,
        taxCost: 0,
        totalCost: 0,
        canonicalAmount: 0,
        pricePerCanonical: 0,
      },
      flags: ['calculation-error'],
    };
  }
}

/**
 * Calculate price per canonical unit using the effective price
 */
export function calculatePricePerCanonicalEffective(
  offer: Offer,
  inventoryItem: InventoryItem,
  options: PriceCalculationOptions = {}
): PriceCalculationResult {
  // Validate inputs
  const validation = validatePriceCalculationInputs(offer, inventoryItem, options);
  if (!validation.isValid) {
    return {
      pricePerCanonical: 0,
      success: false,
      errorMessage: validation.errors.join('; '),
      confidence: 0,
      breakdown: {
        basePrice: 0,
        shippingCost: 0,
        taxCost: 0,
        totalCost: 0,
        canonicalAmount: 0,
        pricePerCanonical: 0,
      },
      flags: ['validation-failed'],
    };
  }

  try {
    // Use the pre-calculated effective price if available
    if (offer.effectivePricePerCanonical !== undefined && options.useEffectivePrice !== false) {
      let finalPrice = offer.effectivePricePerCanonical;

      // Apply currency conversion if specified
      if (options.currencyRate && options.currencyRate !== 1.0) {
        finalPrice = finalPrice * options.currencyRate;
      }

      // Apply equivalence factors if enabled
      if (options.applyEquivalenceFactors !== false && inventoryItem.equivalenceFactor) {
        finalPrice = finalPrice * inventoryItem.equivalenceFactor;
      }

      const flags: string[] = [];
      if (offer.shippingIncluded) flags.push('shipping-included');
      if (offer.isTaxIncluded) flags.push('tax-included');
      if (offer.qualityRating && offer.qualityRating >= 4) flags.push('high-quality');
      flags.push('effective-price');

      return {
        pricePerCanonical: finalPrice,
        success: true,
        confidence: 0.9, // High confidence for pre-calculated values
        breakdown: {
          basePrice: offer.totalPrice,
          shippingCost: offer.shippingCost || 0,
          taxCost: offer.isTaxIncluded ? 0 : (offer.totalPrice * (offer.taxRate || 0)),
          totalCost: offer.totalPrice + (offer.shippingCost || 0),
          canonicalAmount: offer.amountCanonical,
          pricePerCanonical: finalPrice,
        },
        flags,
      };
    }

    // Fall back to including calculation if effective price not available
    return calculatePricePerCanonicalIncluding(offer, inventoryItem, options);
  } catch (error) {
    return {
      pricePerCanonical: 0,
      success: false,
      errorMessage: `Calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      confidence: 0,
      breakdown: {
        basePrice: 0,
        shippingCost: 0,
        taxCost: 0,
        totalCost: 0,
        canonicalAmount: 0,
        pricePerCanonical: 0,
      },
      flags: ['calculation-error'],
    };
  }
}

// =============================================================================
// MAIN CALCULATION FUNCTION
// =============================================================================

/**
 * Calculate price per canonical unit based on options
 * This is the main function that should be used by the comparison engine
 */
export function calculatePricePerCanonical(
  offer: Offer,
  inventoryItem: InventoryItem,
  options: PriceCalculationOptions = {}
): PriceCalculationResult {
  // Set default options
  const defaultOptions: PriceCalculationOptions = {
    includeShipping: true,
    includeTax: true,
    useEffectivePrice: true,
    applyEquivalenceFactors: true,
    currencyRate: 1.0,
    minConfidence: 0.5,
  };

  const finalOptions = { ...defaultOptions, ...options };

  // Choose calculation method based on options
  if (finalOptions.useEffectivePrice && offer.effectivePricePerCanonical !== undefined) {
    return calculatePricePerCanonicalEffective(offer, inventoryItem, finalOptions);
  } else if (finalOptions.includeShipping || finalOptions.includeTax) {
    return calculatePricePerCanonicalIncluding(offer, inventoryItem, finalOptions);
  } else {
    return calculatePricePerCanonicalExcluding(offer, inventoryItem, finalOptions);
  }
}

// =============================================================================
// BATCH CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate prices for multiple offers
 */
export function calculatePricesForOffers(
  offers: Offer[],
  inventoryItem: InventoryItem,
  options: PriceCalculationOptions = {}
): Map<string, PriceCalculationResult> {
  const results = new Map<string, PriceCalculationResult>();

  offers.forEach(offer => {
    const result = calculatePricePerCanonical(offer, inventoryItem, options);
    results.set(offer.id, result);
  });

  return results;
}

/**
 * Filter offers by calculation success and confidence
 */
export function filterOffersByCalculation(
  offers: Offer[],
  inventoryItem: InventoryItem,
  options: PriceCalculationOptions = {}
): {
  validOffers: Offer[];
  invalidOffers: { offer: Offer; result: PriceCalculationResult }[];
} {
  const validOffers: Offer[] = [];
  const invalidOffers: { offer: Offer; result: PriceCalculationResult }[] = [];

  offers.forEach(offer => {
    const result = calculatePricePerCanonical(offer, inventoryItem, options);
    
    if (result.success && result.confidence >= (options.minConfidence || 0.5)) {
      validOffers.push(offer);
    } else {
      invalidOffers.push({ offer, result });
    }
  });

  return { validOffers, invalidOffers };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Compare two price calculation results
 */
export function comparePriceResults(
  result1: PriceCalculationResult,
  result2: PriceCalculationResult
): {
  better: PriceCalculationResult;
  worse: PriceCalculationResult;
  difference: number;
  percentageDifference: number;
} {
  const better = result1.pricePerCanonical < result2.pricePerCanonical ? result1 : result2;
  const worse = result1.pricePerCanonical < result2.pricePerCanonical ? result2 : result1;
  const difference = Math.abs(result1.pricePerCanonical - result2.pricePerCanonical);
  const percentageDifference = (difference / Math.min(result1.pricePerCanonical, result2.pricePerCanonical)) * 100;

  return {
    better,
    worse,
    difference,
    percentageDifference,
  };
}

/**
 * Format price calculation result for display
 */
export function formatPriceResult(result: PriceCalculationResult): string {
  if (!result.success) {
    return `Error: ${result.errorMessage}`;
  }

  const price = result.pricePerCanonical.toFixed(4);
  const confidence = (result.confidence * 100).toFixed(1);
  const flags = result.flags.length > 0 ? ` (${result.flags.join(', ')})` : '';

  return `${price} (confidence: ${confidence}%${flags})`;
}
