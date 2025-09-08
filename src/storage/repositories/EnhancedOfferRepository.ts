/**
 * Enhanced Offer Repository with Historical Price Tracking
 *
 * Extends the base OfferRepository to automatically record historical prices
 * when offers are created or updated.
 */

import { OfferRepository, Offer, OfferInput } from './OfferRepository';
import { HistoricalPriceService } from '../services/HistoricalPriceService';
import { RepositoryFactory } from '../RepositoryFactory';

/**
 * Enhanced offer repository that automatically tracks historical prices
 */
export class EnhancedOfferRepository extends OfferRepository {
  private historicalPriceService: HistoricalPriceService | null = null;
  private repositoryFactory: RepositoryFactory;

  constructor(repositoryFactory: RepositoryFactory) {
    super();
    this.repositoryFactory = repositoryFactory;
  }

  /**
   * Get the historical price service
   */
  private async getHistoricalPriceService(): Promise<HistoricalPriceService> {
    if (!this.historicalPriceService) {
      this.historicalPriceService = new HistoricalPriceService(
        this.repositoryFactory
      );
    }
    return this.historicalPriceService;
  }

  /**
   * Create an offer and automatically record historical price
   */
  async createOffer(input: OfferInput): Promise<Offer> {
    // Create the offer using the parent implementation
    const offer = await super.createOffer(input);

    // Record historical price asynchronously (don't block offer creation)
    this.recordHistoricalPriceAsync(offer).catch(error => {
      console.warn(
        'Failed to record historical price for offer:',
        offer.id,
        error
      );
    });

    return offer;
  }

  /**
   * Update an offer and record historical price if price changed
   */
  async updateOffer(
    id: string,
    updates: Partial<OfferInput>
  ): Promise<Offer | null> {
    // Get the existing offer to compare prices
    const existingOffer = await this.findById(id);
    if (!existingOffer) {
      return null;
    }

    // Update the offer using the parent implementation
    const updatedOffer = await super.updateOffer(id, updates);
    if (!updatedOffer) {
      return null;
    }

    // Check if price-related fields changed
    const priceChanged = this.hasPriceChanged(existingOffer, updatedOffer);

    if (priceChanged) {
      // Record historical price asynchronously
      this.recordHistoricalPriceAsync(updatedOffer).catch(error => {
        console.warn(
          'Failed to record historical price for updated offer:',
          updatedOffer.id,
          error
        );
      });
    }

    return updatedOffer;
  }

  /**
   * Create multiple offers and record historical prices
   */
  async createOffers(inputs: OfferInput[]): Promise<Offer[]> {
    const offers: Offer[] = [];

    // Create offers one by one to ensure proper historical tracking
    for (const input of inputs) {
      const offer = await this.createOffer(input);
      offers.push(offer);
    }

    return offers;
  }

  /**
   * Record historical price asynchronously
   */
  private async recordHistoricalPriceAsync(offer: Offer): Promise<void> {
    try {
      const historicalPriceService = await this.getHistoricalPriceService();

      // Get the inventory item to get canonical unit
      const inventoryRepo =
        await this.repositoryFactory.getInventoryItemRepository();
      const inventoryItem = await inventoryRepo.findById(offer.inventoryItemId);

      if (!inventoryItem) {
        console.warn(
          'Cannot record historical price: inventory item not found:',
          offer.inventoryItemId
        );
        return;
      }

      // Record the historical price
      await historicalPriceService.recordPriceFromOffer(
        this.mapOfferToStandardFormat(offer),
        inventoryItem,
        {
          includeShipping: true,
          includeTax: true,
          confidence: 0.8,
          notes: `Auto-recorded from offer ${offer.id}`,
        }
      );

      if (__DEV__) {
        console.log('Recorded historical price for offer:', offer.id);
      }
    } catch (error) {
      console.error('Error recording historical price:', error);
      throw error;
    }
  }

  /**
   * Check if price-related fields have changed between two offers
   */
  private hasPriceChanged(existing: Offer, updated: Offer): boolean {
    return (
      existing.totalPrice !== updated.totalPrice ||
      existing.amount !== updated.amount ||
      existing.amountUnit !== updated.amountUnit ||
      existing.shippingCost !== updated.shippingCost ||
      existing.shippingIncluded !== updated.shippingIncluded ||
      existing.isTaxIncluded !== updated.isTaxIncluded ||
      existing.taxRate !== updated.taxRate ||
      existing.effectivePricePerCanonical !== updated.effectivePricePerCanonical
    );
  }

  /**
   * Map internal offer format to standard format for historical price service
   */
  private mapOfferToStandardFormat(offer: Offer): any {
    return {
      id: offer.id,
      inventoryItemId: offer.inventoryItemId,
      supplierId: offer.supplierId,
      supplierNameSnapshot: offer.supplierNameSnapshot,
      supplierUrl: offer.supplierUrl,
      sourceType: offer.sourceType,
      sourceUrl: offer.sourceUrl,
      rawCapture: offer.rawCapture,
      observedAt: offer.observedAt,
      capturedAt: offer.capturedAt,
      totalPrice: offer.totalPrice,
      currency: offer.currency,
      isTaxIncluded: offer.isTaxIncluded,
      taxRate: offer.taxRate,
      shippingCost: offer.shippingCost,
      minOrderAmount: offer.minOrderAmount,
      freeShippingThresholdAtCapture: offer.freeShippingThresholdAtCapture,
      shippingIncluded: offer.shippingIncluded,
      amount: offer.amount,
      amountUnit: offer.amountUnit,
      amountCanonical: offer.amountCanonical,
      pricePerCanonicalExclShipping: offer.pricePerCanonicalExclShipping,
      pricePerCanonicalInclShipping: offer.pricePerCanonicalInclShipping,
      effectivePricePerCanonical: offer.effectivePricePerCanonical,
      bundleId: offer.bundleId,
      qualityRating: offer.qualityRating,
      notes: offer.notes,
      photoUri: offer.photoUri,
      computedByVersion: offer.computedByVersion,
      created_at: offer.created_at,
      updated_at: offer.updated_at,
      deleted_at: offer.deleted_at,
    };
  }

  /**
   * Get price history for an inventory item
   */
  async getPriceHistory(
    inventoryItemId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      supplierId?: string;
      limit?: number;
    }
  ): Promise<any[]> {
    const historicalPriceService = await this.getHistoricalPriceService();
    return await historicalPriceService.getHistoricalPrices(
      inventoryItemId,
      options
    );
  }

  /**
   * Get price trend for an inventory item
   */
  async getPriceTrend(
    inventoryItemId: string,
    period: '1d' | '7d' | '30d' | '90d' | '1y' | 'all' = '30d',
    supplierId?: string
  ): Promise<any> {
    const historicalPriceService = await this.getHistoricalPriceService();
    return await historicalPriceService.getPriceTrend(inventoryItemId, {
      period,
      supplierId,
    });
  }

  /**
   * Get price statistics for an inventory item
   */
  async getPriceStatistics(
    inventoryItemId: string,
    period: '1d' | '7d' | '30d' | '90d' | '1y' | 'all' = '30d',
    supplierId?: string
  ): Promise<any> {
    const historicalPriceService = await this.getHistoricalPriceService();
    return await historicalPriceService.getPriceStatistics(
      inventoryItemId,
      period,
      supplierId
    );
  }

  /**
   * Get best historical price for an inventory item
   */
  async getBestHistoricalPrice(
    inventoryItemId: string,
    period?: '1d' | '7d' | '30d' | '90d' | '1y' | 'all',
    supplierId?: string
  ): Promise<any> {
    const historicalPriceService = await this.getHistoricalPriceService();
    return await historicalPriceService.getBestHistoricalPrice(
      inventoryItemId,
      period,
      supplierId
    );
  }

  /**
   * Get price alerts for an inventory item
   */
  async getPriceAlerts(
    inventoryItemId: string,
    options?: {
      threshold?: number;
      period?: '1d' | '7d' | '30d' | '90d' | '1y' | 'all';
      supplierId?: string;
    }
  ): Promise<any[]> {
    const historicalPriceService = await this.getHistoricalPriceService();
    return await historicalPriceService.getPriceAlerts(
      inventoryItemId,
      options
    );
  }

  /**
   * Get comprehensive price history summary
   */
  async getPriceHistorySummary(
    inventoryItemId: string,
    period: '1d' | '7d' | '30d' | '90d' | '1y' | 'all' = '30d'
  ): Promise<any> {
    const historicalPriceService = await this.getHistoricalPriceService();
    return await historicalPriceService.getPriceHistorySummary(
      inventoryItemId,
      period
    );
  }
}
