/**
 * Base Comparator Implementation
 *
 * Provides common functionality for all comparison strategies including
 * validation, error handling, and utility methods.
 */

import {
  Comparator,
  ComparisonResult,
  ValidationResult,
  ComparisonError,
} from './types';
import { Offer, InventoryItem, Supplier } from '../types';

/**
 * Abstract base class for all comparison strategies
 */
export abstract class BaseComparator implements Comparator {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly version: string;

  /**
   * Compare a single offer against others
   * This is the main entry point that handles common logic
   */
  async compare(
    offer: Offer,
    allOffers: Offer[],
    inventoryItem: InventoryItem,
    suppliers: Map<string, Supplier>,
    options?: Record<string, any>
  ): Promise<ComparisonResult> {
    try {
      // Validate inputs
      this.validateInputs(offer, allOffers, inventoryItem, suppliers);

      // Validate and normalize options
      const validationResult = this.validateOptions(options);
      if (!validationResult.isValid) {
        throw new ComparisonError(
          `Invalid options for comparator ${this.id}: ${validationResult.error}`,
          'INVALID_OPTIONS'
        );
      }

      const normalizedOptions =
        validationResult.normalizedOptions || this.getDefaultOptions();

      // Perform the actual comparison
      const result = await this.performComparison(
        offer,
        allOffers,
        inventoryItem,
        suppliers,
        normalizedOptions
      );

      // Add metadata
      result.metadata = {
        ...result.metadata,
        explanation: this.generateExplanation(offer, result, normalizedOptions),
        confidence: this.calculateConfidence(
          offer,
          allOffers,
          normalizedOptions
        ),
      };

      return result;
    } catch (error) {
      if (error instanceof ComparisonError) {
        throw error;
      }
      throw new ComparisonError(
        `Error in comparator ${this.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'COMPARISON_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Abstract method that subclasses must implement
   */
  protected abstract performComparison(
    offer: Offer,
    allOffers: Offer[],
    inventoryItem: InventoryItem,
    suppliers: Map<string, Supplier>,
    options: Record<string, any>
  ): Promise<ComparisonResult>;

  /**
   * Validate inputs to the comparison
   */
  protected validateInputs(
    offer: Offer,
    allOffers: Offer[],
    inventoryItem: InventoryItem,
    suppliers: Map<string, Supplier>
  ): void {
    if (!offer) {
      throw new ComparisonError('Offer is required', 'INVALID_INPUT');
    }

    if (!allOffers || !Array.isArray(allOffers)) {
      throw new ComparisonError('All offers must be an array', 'INVALID_INPUT');
    }

    if (!inventoryItem) {
      throw new ComparisonError('Inventory item is required', 'INVALID_INPUT');
    }

    if (!suppliers || !(suppliers instanceof Map)) {
      throw new ComparisonError('Suppliers must be a Map', 'INVALID_INPUT');
    }

    // Ensure the offer is in the allOffers array
    if (!allOffers.some(o => o.id === offer.id)) {
      throw new ComparisonError(
        'Offer must be included in allOffers array',
        'INVALID_INPUT'
      );
    }

    // Ensure all offers are for the same inventory item
    const mismatchedOffers = allOffers.filter(
      o => o.inventoryItemId !== inventoryItem.id
    );
    if (mismatchedOffers.length > 0) {
      throw new ComparisonError(
        `Found ${mismatchedOffers.length} offers for different inventory items`,
        'INVALID_INPUT'
      );
    }
  }

  /**
   * Generate a human-readable explanation of the comparison result
   */
  protected generateExplanation(
    offer: Offer,
    result: ComparisonResult,
    _options: Record<string, any>
  ): string {
    const supplier = this.getSupplierName(offer);
    const price = this.formatPrice(
      offer.effectivePricePerCanonical,
      offer.currency
    );

    return `${supplier} offer: ${price} per ${offer.amountCanonical} ${offer.amountUnit} (score: ${result.score.toFixed(4)})`;
  }

  /**
   * Calculate confidence level for the comparison result
   */
  protected calculateConfidence(
    offer: Offer,
    allOffers: Offer[],
    _options: Record<string, any>
  ): number {
    let confidence = 1.0;

    // Reduce confidence for offers with missing data
    if (!offer.qualityRating) {
      confidence -= 0.1;
    }

    if (!offer.supplierUrl) {
      confidence -= 0.05;
    }

    if (!offer.observedAt || this.isOfferStale(offer)) {
      confidence -= 0.2;
    }

    // Reduce confidence for offers with very different prices
    const prices = allOffers.map(o => o.effectivePricePerCanonical);
    const avgPrice =
      prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const priceDeviation =
      Math.abs(offer.effectivePricePerCanonical - avgPrice) / avgPrice;

    if (priceDeviation > 0.5) {
      // More than 50% deviation
      confidence -= 0.3;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Check if an offer is stale (older than 30 days by default)
   */
  protected isOfferStale(offer: Offer, maxAgeDays: number = 30): boolean {
    const observedDate = new Date(offer.observedAt);
    const now = new Date();
    const ageInDays =
      (now.getTime() - observedDate.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays > maxAgeDays;
  }

  /**
   * Get supplier name for an offer
   */
  protected getSupplierName(offer: Offer): string {
    return offer.supplierNameSnapshot || `Supplier ${offer.supplierId}`;
  }

  /**
   * Format price for display
   */
  protected formatPrice(price: number, currency: string): string {
    return `${currency} ${price.toFixed(4)}`;
  }

  /**
   * Get supplier object for an offer
   */
  protected getSupplier(
    offer: Offer,
    suppliers: Map<string, Supplier>
  ): Supplier | null {
    return suppliers.get(offer.supplierId) || null;
  }

  /**
   * Apply equivalence factor from inventory item
   */
  protected applyEquivalenceFactor(
    price: number,
    inventoryItem: InventoryItem
  ): number {
    if (
      inventoryItem.equivalenceFactor &&
      inventoryItem.equivalenceFactor !== 1.0
    ) {
      return price / inventoryItem.equivalenceFactor;
    }
    return price;
  }

  /**
   * Normalize a score to a 0-1 range
   */
  protected normalizeScore(
    score: number,
    minScore: number,
    maxScore: number
  ): number {
    if (maxScore === minScore) return 0.5;
    return (score - minScore) / (maxScore - minScore);
  }

  /**
   * Calculate percentile rank of a value in an array
   */
  protected calculatePercentile(value: number, values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);

    if (index === -1) return 1.0; // Value is higher than all others
    if (index === 0) return 0.0; // Value is lower than all others

    return index / sorted.length;
  }

  /**
   * Default validation implementation
   * Subclasses can override for strategy-specific validation
   */
  validateOptions(options?: Record<string, any>): ValidationResult {
    const defaultOptions = this.getDefaultOptions();
    const normalizedOptions = { ...defaultOptions, ...options };

    return {
      isValid: true,
      normalizedOptions,
    };
  }

  /**
   * Default options implementation
   * Subclasses should override with strategy-specific defaults
   */
  getDefaultOptions(): Record<string, any> {
    return {};
  }

  /**
   * Utility method to create a comparison result
   */
  protected createResult(
    offer: Offer,
    score: number,
    metadata?: Partial<ComparisonResult['metadata']>
  ): ComparisonResult {
    return {
      offer,
      score,
      metadata: {
        ...metadata,
        flags: metadata?.flags || [],
      },
    };
  }
}
