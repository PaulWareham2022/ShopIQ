/**
 * Offer Mutation Service
 * Handles updating offers when inventory item canonical units change
 */

import { OfferRepository } from '../repositories/OfferRepository';
import { InventoryItemRepository } from '../repositories/InventoryItemRepository';
import { Offer, InventoryItem, CanonicalDimension } from '../types';
import { ValidationError } from '../types';
import { validateAndConvert } from '../utils/canonical-units';

export interface OfferMutationResult {
  success: boolean;
  updatedOffers: number;
  failedOffers: string[];
  errors: string[];
}

export interface InventoryItemUnitChange {
  itemId: string;
  oldCanonicalUnit: string;
  newCanonicalUnit: string;
  canonicalDimension: CanonicalDimension;
}

export class OfferMutationService {
  private offerRepository: OfferRepository;
  private inventoryItemRepository: InventoryItemRepository;

  constructor(
    offerRepository: OfferRepository,
    inventoryItemRepository: InventoryItemRepository
  ) {
    this.offerRepository = offerRepository;
    this.inventoryItemRepository = inventoryItemRepository;
  }

  /**
   * Update all offers for an inventory item when its canonical unit changes
   * @param unitChange Details about the unit change
   * @returns Result of the mutation operation
   */
  async mutateOffersForUnitChange(
    unitChange: InventoryItemUnitChange
  ): Promise<OfferMutationResult> {
    const result: OfferMutationResult = {
      success: true,
      updatedOffers: 0,
      failedOffers: [],
      errors: [],
    };

    try {
      // Get all offers for this inventory item
      const offers = await this.offerRepository.findWhere({
        inventoryItemId: unitChange.itemId,
      });

      if (offers.length === 0) {
        return result; // No offers to update
      }

      // Get the updated inventory item
      const inventoryItem = await this.inventoryItemRepository.findById(
        unitChange.itemId
      );
      if (!inventoryItem) {
        result.success = false;
        result.errors.push(
          `Inventory item with ID ${unitChange.itemId} not found`
        );
        return result;
      }

      // Update each offer
      for (const offer of offers) {
        try {
          await this.updateOfferForUnitChange(offer, inventoryItem);
          result.updatedOffers++;
        } catch (error) {
          result.failedOffers.push(offer.id);
          result.errors.push(
            `Failed to update offer ${offer.id}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }

      // Mark as failed if any offers failed to update
      if (result.failedOffers.length > 0) {
        result.success = false;
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Failed to mutate offers: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      return result;
    }
  }

  /**
   * Update a single offer when the inventory item's canonical unit changes
   * @param offer The offer to update
   * @param inventoryItem The updated inventory item
   */
  private async updateOfferForUnitChange(
    offer: Offer,
    inventoryItem: InventoryItem
  ): Promise<void> {
    // Recalculate the canonical amount with the new unit
    const unitValidation = validateAndConvert(
      offer.amount,
      offer.amountUnit,
      inventoryItem.canonicalDimension
    );

    if (
      !unitValidation.isValid ||
      unitValidation.canonicalAmount === undefined
    ) {
      throw new ValidationError(
        `Failed to convert ${offer.amount} ${offer.amountUnit} to new canonical unit ${inventoryItem.canonicalUnit} for dimension ${inventoryItem.canonicalDimension}`
      );
    }

    const newAmountCanonical = unitValidation.canonicalAmount;

    // Recalculate price metrics with the new canonical amount
    const pricePerCanonicalExclShipping = offer.totalPrice / newAmountCanonical;

    // Calculate price including shipping (if applicable)
    const shippingCost = offer.shippingCost || 0;
    const shippingIncluded = offer.shippingIncluded || false;
    const totalWithShipping = shippingIncluded
      ? offer.totalPrice
      : offer.totalPrice + shippingCost;
    const pricePerCanonicalInclShipping =
      totalWithShipping / newAmountCanonical;

    // For now, effective price equals price including shipping (tax excluded)
    const effectivePricePerCanonical = pricePerCanonicalInclShipping;

    // Update the offer with new calculations
    await this.offerRepository.update(offer.id, {
      amountCanonical: newAmountCanonical,
      pricePerCanonicalExclShipping,
      pricePerCanonicalInclShipping,
      effectivePricePerCanonical,
      computedByVersion: '1.0.0', // Update version to indicate recalculation
    });
  }

  /**
   * Get all offers that would be affected by a unit change
   * @param inventoryItemId The inventory item ID
   * @returns Array of offers that would be affected
   */
  async getAffectedOffers(inventoryItemId: string): Promise<Offer[]> {
    return this.offerRepository.findWhere({
      inventoryItemId,
    });
  }

  /**
   * Preview the impact of a unit change without actually updating offers
   * @param unitChange Details about the proposed unit change
   * @returns Preview of how offers would be affected
   */
  async previewUnitChangeImpact(unitChange: InventoryItemUnitChange): Promise<{
    affectedOffers: number;
    sampleChanges: Array<{
      offerId: string;
      oldPricePerCanonical: number;
      newPricePerCanonical: number;
      oldAmountCanonical: number;
      newAmountCanonical: number;
    }>;
    errors: string[];
  }> {
    const result = {
      affectedOffers: 0,
      sampleChanges: [] as Array<{
        offerId: string;
        oldPricePerCanonical: number;
        newPricePerCanonical: number;
        oldAmountCanonical: number;
        newAmountCanonical: number;
      }>,
      errors: [] as string[],
    };

    try {
      const offers = await this.getAffectedOffers(unitChange.itemId);
      result.affectedOffers = offers.length;

      // Get the updated inventory item
      const inventoryItem = await this.inventoryItemRepository.findById(
        unitChange.itemId
      );
      if (!inventoryItem) {
        result.errors.push(
          `Inventory item with ID ${unitChange.itemId} not found`
        );
        return result;
      }

      // Preview changes for up to 5 offers
      const sampleSize = Math.min(5, offers.length);
      for (let i = 0; i < sampleSize; i++) {
        const offer = offers[i];
        try {
          const unitValidation = validateAndConvert(
            offer.amount,
            offer.amountUnit,
            inventoryItem.canonicalDimension
          );

          if (
            unitValidation.isValid &&
            unitValidation.canonicalAmount !== undefined
          ) {
            const newAmountCanonical = unitValidation.canonicalAmount;
            const newPricePerCanonical = offer.totalPrice / newAmountCanonical;

            result.sampleChanges.push({
              offerId: offer.id,
              oldPricePerCanonical: offer.pricePerCanonicalExclShipping,
              newPricePerCanonical,
              oldAmountCanonical: offer.amountCanonical,
              newAmountCanonical,
            });
          }
        } catch (error) {
          result.errors.push(
            `Failed to preview offer ${offer.id}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }
    } catch (error) {
      result.errors.push(
        `Failed to preview unit change impact: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }

    return result;
  }
}
