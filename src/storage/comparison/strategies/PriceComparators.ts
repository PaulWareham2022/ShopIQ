/**
 * Price-Based Comparison Strategies
 *
 * Implements various price-based comparison strategies including
 * price per canonical unit, total price, and quality-adjusted pricing.
 */

import { BaseComparator } from '../BaseComparator';
import {
  ComparisonResult,
  ValidationResult,
  Offer,
  InventoryItem,
  Supplier,
  PriceComparatorOptions,
  QualityComparatorOptions,
} from '../types';

/**
 * Compares offers by price per canonical unit
 * This is the default and most common comparison strategy
 */
export class PricePerCanonicalComparator extends BaseComparator {
  readonly id = 'pricePerCanonical';
  readonly name = 'Price Per Canonical Unit';
  readonly description =
    'Compares offers by price per canonical unit, with options for including shipping and tax';
  readonly version = '1.0.0';

  protected async performComparison(
    offer: Offer,
    allOffers: Offer[],
    inventoryItem: InventoryItem,
    suppliers: Map<string, Supplier>,
    options: PriceComparatorOptions
  ): Promise<ComparisonResult> {
    let price = offer.effectivePricePerCanonical;

    // Apply options
    if (!options.useEffectivePrice) {
      if (options.includeShipping && options.includeTax) {
        price = offer.pricePerCanonicalInclShipping;
      } else if (options.includeTax) {
        price = offer.pricePerCanonicalExclShipping;
      } else {
        // Calculate pre-tax price
        const preTaxPrice =
          offer.isTaxIncluded && offer.taxRate
            ? offer.totalPrice / (1 + offer.taxRate)
            : offer.totalPrice;
        price = preTaxPrice / offer.amountCanonical;
      }
    }

    // Apply equivalence factor if enabled
    if (options.applyEquivalenceFactors !== false) {
      price = this.applyEquivalenceFactor(price, inventoryItem);
    }

    // Apply currency conversion if needed
    if (options.currencyRate && options.currencyRate !== 1.0) {
      price = price * options.currencyRate;
    }

    const flags: string[] = [];
    if (offer.shippingIncluded) flags.push('shipping-included');
    if (offer.isTaxIncluded) flags.push('tax-included');
    if (offer.qualityRating && offer.qualityRating >= 4)
      flags.push('high-quality');

    return this.createResult(offer, price, {
      scoreBreakdown: {
        basePrice: price,
        shippingIncluded: options.includeShipping ? 1 : 0,
        taxIncluded: options.includeTax ? 1 : 0,
      },
      flags,
    });
  }

  validateOptions(options?: Record<string, any>): ValidationResult {
    const defaultOptions = this.getDefaultOptions();
    const normalizedOptions = { ...defaultOptions, ...options };

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate boolean options
    if (typeof normalizedOptions.includeShipping !== 'boolean') {
      errors.push('includeShipping must be a boolean');
    }

    if (typeof normalizedOptions.includeTax !== 'boolean') {
      errors.push('includeTax must be a boolean');
    }

    if (typeof normalizedOptions.useEffectivePrice !== 'boolean') {
      errors.push('useEffectivePrice must be a boolean');
    }

    // Validate currency rate
    if (normalizedOptions.currencyRate !== undefined) {
      if (
        typeof normalizedOptions.currencyRate !== 'number' ||
        normalizedOptions.currencyRate <= 0
      ) {
        errors.push('currencyRate must be a positive number');
      }
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      normalizedOptions,
    };
  }

  getDefaultOptions(): PriceComparatorOptions {
    return {
      includeShipping: true,
      includeTax: true,
      useEffectivePrice: true,
      useCanonicalUnit: true,
      applyEquivalenceFactors: true,
    };
  }
}

/**
 * Compares offers by total price regardless of quantity
 * Useful when quantity differences are not significant
 */
export class TotalPriceComparator extends BaseComparator {
  readonly id = 'totalPrice';
  readonly name = 'Total Price';
  readonly description =
    'Compares offers by total price regardless of quantity differences';
  readonly version = '1.0.0';

  protected async performComparison(
    offer: Offer,
    allOffers: Offer[],
    inventoryItem: InventoryItem,
    suppliers: Map<string, Supplier>,
    options: PriceComparatorOptions
  ): Promise<ComparisonResult> {
    let totalPrice = offer.totalPrice;

    // Add shipping if not included and option is enabled
    if (
      options.includeShipping &&
      !offer.shippingIncluded &&
      offer.shippingCost
    ) {
      totalPrice += offer.shippingCost;
    }

    // Add tax if not included and option is enabled
    if (options.includeTax && !offer.isTaxIncluded && offer.taxRate) {
      totalPrice = totalPrice * (1 + offer.taxRate);
    }

    // Apply currency conversion if needed
    if (options.currencyRate && options.currencyRate !== 1.0) {
      totalPrice = totalPrice * options.currencyRate;
    }

    const flags: string[] = [];
    if (offer.shippingIncluded) flags.push('shipping-included');
    if (offer.isTaxIncluded) flags.push('tax-included');
    if (offer.amount > 1) flags.push('bulk-quantity');

    return this.createResult(offer, totalPrice, {
      scoreBreakdown: {
        basePrice: offer.totalPrice,
        shippingCost: offer.shippingCost || 0,
        taxCost: offer.isTaxIncluded
          ? 0
          : offer.totalPrice * (offer.taxRate || 0),
      },
      flags,
    });
  }

  validateOptions(options?: Record<string, any>): ValidationResult {
    const defaultOptions = this.getDefaultOptions();
    const normalizedOptions = { ...defaultOptions, ...options };

    const errors: string[] = [];

    // Validate boolean options
    if (typeof normalizedOptions.includeShipping !== 'boolean') {
      errors.push('includeShipping must be a boolean');
    }

    if (typeof normalizedOptions.includeTax !== 'boolean') {
      errors.push('includeTax must be a boolean');
    }

    // Validate currency rate
    if (normalizedOptions.currencyRate !== undefined) {
      if (
        typeof normalizedOptions.currencyRate !== 'number' ||
        normalizedOptions.currencyRate <= 0
      ) {
        errors.push('currencyRate must be a positive number');
      }
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined,
      normalizedOptions,
    };
  }

  getDefaultOptions(): PriceComparatorOptions {
    return {
      includeShipping: true,
      includeTax: true,
      useEffectivePrice: false, // Not applicable for total price
      useCanonicalUnit: false, // Not applicable for total price
      applyEquivalenceFactors: false, // Not applicable for total price
    };
  }
}

/**
 * Compares offers by price per display unit (not canonical)
 * Useful when canonical unit conversion is not desired
 */
export class PricePerUnitComparator extends BaseComparator {
  readonly id = 'pricePerUnit';
  readonly name = 'Price Per Unit';
  readonly description =
    'Compares offers by price per display unit (not canonical unit)';
  readonly version = '1.0.0';

  protected async performComparison(
    offer: Offer,
    allOffers: Offer[],
    inventoryItem: InventoryItem,
    suppliers: Map<string, Supplier>,
    options: PriceComparatorOptions
  ): Promise<ComparisonResult> {
    let totalPrice = offer.totalPrice;

    // Add shipping if not included and option is enabled
    if (
      options.includeShipping &&
      !offer.shippingIncluded &&
      offer.shippingCost
    ) {
      totalPrice += offer.shippingCost;
    }

    // Add tax if not included and option is enabled
    if (options.includeTax && !offer.isTaxIncluded && offer.taxRate) {
      totalPrice = totalPrice * (1 + offer.taxRate);
    }

    // Calculate price per display unit
    const pricePerUnit = totalPrice / offer.amount;

    // Apply currency conversion if needed
    const finalPrice =
      options.currencyRate && options.currencyRate !== 1.0
        ? pricePerUnit * options.currencyRate
        : pricePerUnit;

    const flags: string[] = [];
    if (offer.shippingIncluded) flags.push('shipping-included');
    if (offer.isTaxIncluded) flags.push('tax-included');
    if (offer.amountUnit !== inventoryItem.canonicalUnit)
      flags.push('non-canonical-unit');

    return this.createResult(offer, finalPrice, {
      scoreBreakdown: {
        basePrice: offer.totalPrice,
        amount: offer.amount,
        unit: offer.amountUnit,
        pricePerUnit: finalPrice,
      },
      flags,
    });
  }

  validateOptions(options?: Record<string, any>): ValidationResult {
    const defaultOptions = this.getDefaultOptions();
    const normalizedOptions = { ...defaultOptions, ...options };

    const errors: string[] = [];

    // Validate boolean options
    if (typeof normalizedOptions.includeShipping !== 'boolean') {
      errors.push('includeShipping must be a boolean');
    }

    if (typeof normalizedOptions.includeTax !== 'boolean') {
      errors.push('includeTax must be a boolean');
    }

    // Validate currency rate
    if (normalizedOptions.currencyRate !== undefined) {
      if (
        typeof normalizedOptions.currencyRate !== 'number' ||
        normalizedOptions.currencyRate <= 0
      ) {
        errors.push('currencyRate must be a positive number');
      }
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined,
      normalizedOptions,
    };
  }

  getDefaultOptions(): PriceComparatorOptions {
    return {
      includeShipping: true,
      includeTax: true,
      useEffectivePrice: false, // Not applicable for per-unit pricing
      useCanonicalUnit: false, // Explicitly not using canonical units
      applyEquivalenceFactors: false, // Not applicable for per-unit pricing
    };
  }
}

/**
 * Adjusts price based on quality rating
 * Higher quality ratings result in lower effective prices
 */
export class QualityAdjustedPriceComparator extends BaseComparator {
  readonly id = 'qualityAdjustedPrice';
  readonly name = 'Quality-Adjusted Price';
  readonly description =
    'Adjusts price based on quality rating, giving better value to higher quality items';
  readonly version = '1.0.0';

  protected async performComparison(
    offer: Offer,
    allOffers: Offer[],
    inventoryItem: InventoryItem,
    suppliers: Map<string, Supplier>,
    options: QualityComparatorOptions
  ): Promise<ComparisonResult> {
    // Start with base price
    let adjustedPrice = offer.effectivePricePerCanonical;

    // Apply quality adjustment if quality rating is available
    if (
      offer.qualityRating &&
      offer.qualityRating >= 1 &&
      offer.qualityRating <= 5
    ) {
      const qualityScore = offer.qualityRating / 5.0; // Normalize to 0-1
      const qualityAdjustment =
        (1 - qualityScore) * options.qualityAdjustmentFactor;
      adjustedPrice = adjustedPrice * (1 - qualityAdjustment);
    }

    // Apply equivalence factor if enabled
    if (options.applyEquivalenceFactors !== false) {
      adjustedPrice = this.applyEquivalenceFactor(adjustedPrice, inventoryItem);
    }

    const flags: string[] = [];
    if (offer.qualityRating) {
      if (offer.qualityRating >= 4) flags.push('high-quality');
      else if (offer.qualityRating <= 2) flags.push('low-quality');
    } else {
      flags.push('no-quality-rating');
    }

    return this.createResult(offer, adjustedPrice, {
      scoreBreakdown: {
        basePrice: offer.effectivePricePerCanonical,
        qualityRating: offer.qualityRating || 0,
        qualityAdjustment: offer.qualityRating
          ? (1 - offer.qualityRating / 5.0) * options.qualityAdjustmentFactor
          : 0,
        adjustedPrice,
      },
      flags,
    });
  }

  validateOptions(options?: Record<string, any>): ValidationResult {
    const defaultOptions = this.getDefaultOptions();
    const normalizedOptions = { ...defaultOptions, ...options };

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate quality adjustment factor
    if (
      typeof normalizedOptions.qualityAdjustmentFactor !== 'number' ||
      normalizedOptions.qualityAdjustmentFactor < 0 ||
      normalizedOptions.qualityAdjustmentFactor > 1
    ) {
      errors.push('qualityAdjustmentFactor must be a number between 0 and 1');
    }

    // Validate minimum quality rating
    if (normalizedOptions.minQualityRating !== undefined) {
      if (
        typeof normalizedOptions.minQualityRating !== 'number' ||
        normalizedOptions.minQualityRating < 1 ||
        normalizedOptions.minQualityRating > 5
      ) {
        errors.push('minQualityRating must be a number between 1 and 5');
      }
    }

    // Warn about high adjustment factors
    if (normalizedOptions.qualityAdjustmentFactor > 0.5) {
      warnings.push(
        'High quality adjustment factor may result in unrealistic price adjustments'
      );
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      normalizedOptions,
    };
  }

  getDefaultOptions(): QualityComparatorOptions {
    return {
      qualityWeight: 0.2,
      priceWeight: 0.8,
      qualityAdjustmentFactor: 0.1,
      preferHigher: true,
      minQualityRating: 1,
      applyEquivalenceFactors: true,
    };
  }
}
