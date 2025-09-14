/**
 * Offer Repository Implementation
 * Handles CRUD operations for Offer entities with automatic unit conversion
 * and price normalization using canonical unit conversion utilities.
 */

import { BaseRepository } from './base/BaseRepository';
import { DatabaseError, ValidationError, Offer } from '../types';
import { CanonicalDimension } from '../types';

// Re-export Offer type for external use
export type { Offer };
import { executeSql } from '../sqlite/database';
import { validateAndConvert } from '../utils/canonical-units';
import { Platform } from 'react-native';

/**
 * Input data for creating offers (before conversion calculations)
 */
export interface OfferInput {
  inventoryItemId: string;
  supplierId: string;
  supplierNameSnapshot?: string;
  supplierUrl?: string;
  sourceType: 'manual' | 'url' | 'ocr' | 'api';
  sourceUrl?: string;
  rawCapture?: string;
  observedAt: string;
  totalPrice: number;
  currency: string;
  isTaxIncluded?: boolean;
  taxRate?: number;
  shippingCost?: number;
  minOrderAmount?: number;
  freeShippingThresholdAtCapture?: number;
  shippingIncluded?: boolean;

  // Raw amount and unit (to be converted)
  amount: number;
  amountUnit: string;

  // Optional fields
  bundleId?: string;
  qualityRating?: number;
  notes?: string;
  photoUri?: string;
}

export class OfferRepository extends BaseRepository<Offer> {
  protected tableName = 'offers';

  // Version tag for tracking which normalization algorithm was used
  private readonly COMPUTATION_VERSION = 'v1.0.0';

  // Override to allow ordering by offer-specific columns
  protected getAllowedOrderByColumns(): string[] {
    return [
      'id',
      'created_at',
      'updated_at',
      'observed_at',
      'captured_at',
      'total_price',
      'effective_price_per_canonical',
      'price_per_canonical_excl_shipping',
      'price_per_canonical_incl_shipping',
      'amount',
      'amount_canonical',
      'supplier_id',
      'inventory_item_id',
    ];
  }

  protected mapRowToEntity(row: any): Offer {
    return {
      id: row.id,
      inventoryItemId: row.inventory_item_id,
      supplierId: row.supplier_id,
      supplierNameSnapshot: row.supplier_name_snapshot || undefined,
      supplierUrl: row.supplier_url || undefined,
      sourceType: row.source_type as 'manual' | 'url' | 'ocr' | 'api',
      sourceUrl: row.source_url || undefined,
      rawCapture: row.raw_capture || undefined,
      observedAt: row.observed_at,
      capturedAt: row.captured_at,
      totalPrice: row.total_price,
      currency: row.currency,
      isTaxIncluded: Boolean(row.is_tax_included),
      taxRate: row.tax_rate || undefined,
      shippingCost: row.shipping_cost || undefined,
      minOrderAmount: row.min_order_amount || undefined,
      freeShippingThresholdAtCapture:
        row.free_shipping_threshold_at_capture || undefined,
      shippingIncluded: Boolean(row.shipping_included),
      amount: row.amount,
      amountUnit: row.amount_unit,
      amountCanonical: row.amount_canonical,
      pricePerCanonicalExclShipping: row.price_per_canonical_excl_shipping,
      pricePerCanonicalInclShipping: row.price_per_canonical_incl_shipping,
      effectivePricePerCanonical: row.effective_price_per_canonical,
      bundleId: row.bundle_id || undefined,
      qualityRating: row.quality_rating || undefined,
      notes: row.notes || undefined,
      photoUri: row.photo_uri || undefined,
      computedByVersion: row.computed_by_version || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at || undefined,
    };
  }

  protected mapEntityToRow(entity: Partial<Offer>): Record<string, any> {
    return {
      id: entity.id,
      inventory_item_id: entity.inventoryItemId,
      supplier_id: entity.supplierId,
      supplier_name_snapshot: entity.supplierNameSnapshot,
      supplier_url: entity.supplierUrl,
      source_type: entity.sourceType,
      source_url: entity.sourceUrl,
      raw_capture: entity.rawCapture,
      observed_at: entity.observedAt,
      captured_at: entity.capturedAt,
      total_price: entity.totalPrice,
      currency: entity.currency,
      is_tax_included: entity.isTaxIncluded ? 1 : 0,
      tax_rate: entity.taxRate,
      shipping_cost: entity.shippingCost,
      min_order_amount: entity.minOrderAmount,
      free_shipping_threshold_at_capture: entity.freeShippingThresholdAtCapture,
      shipping_included: entity.shippingIncluded ? 1 : 0,
      amount: entity.amount,
      amount_unit: entity.amountUnit,
      amount_canonical: entity.amountCanonical,
      price_per_canonical_excl_shipping: entity.pricePerCanonicalExclShipping,
      price_per_canonical_incl_shipping: entity.pricePerCanonicalInclShipping,
      effective_price_per_canonical: entity.effectivePricePerCanonical,
      bundle_id: entity.bundleId,
      quality_rating: entity.qualityRating,
      notes: entity.notes,
      photo_uri: entity.photoUri,
      computed_by_version: entity.computedByVersion,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
      deleted_at: entity.deleted_at,
    };
  }

  /**
   * Get the canonical dimension for an inventory item
   * @param inventoryItemId ID of the inventory item
   * @returns The canonical dimension for unit conversion
   */
  private async getInventoryItemDimension(
    inventoryItemId: string
  ): Promise<CanonicalDimension> {
    try {
      // Check if we're on web platform and need to use fallback
      if (Platform.OS === 'web') {
        // Import the InventoryItemRepository to access the shared store
        const { InventoryItemRepository } = await import(
          './InventoryItemRepository'
        );
        const inventoryRepo = new InventoryItemRepository();
        const item = await inventoryRepo.findById(inventoryItemId);

        if (!item) {
          throw new ValidationError(
            `Inventory item with ID ${inventoryItemId} not found`
          );
        }

        return item.canonicalDimension;
      }

      // Use SQL query for native platforms
      const sql = `
        SELECT canonical_dimension 
        FROM inventory_items 
        WHERE id = ? AND deleted_at IS NULL
      `;
      const result = await executeSql(sql, [inventoryItemId]);

      if (result.rows.length === 0) {
        throw new ValidationError(
          `Inventory item with ID ${inventoryItemId} not found`
        );
      }

      return result.rows.item(0).canonical_dimension as CanonicalDimension;
    } catch (error) {
      throw new DatabaseError(
        'Failed to get inventory item dimension',
        error as Error
      );
    }
  }

  /**
   * Compute canonical amount and price metrics for an offer
   * @param input Raw offer input data
   * @param dimension Canonical dimension from inventory item
   * @returns Computed fields for the offer
   */
  private computeOfferMetrics(
    input: OfferInput,
    dimension: CanonicalDimension
  ): {
    amountCanonical: number;
    pricePerCanonicalExclShipping: number;
    pricePerCanonicalInclShipping: number;
    effectivePricePerCanonical: number;
  } {
    // Validate and convert amount to canonical unit
    const validation = validateAndConvert(
      input.amount,
      input.amountUnit,
      dimension
    );

    if (!validation.isValid || validation.canonicalAmount === undefined) {
      throw new ValidationError(
        validation.errorMessage ||
          `Failed to convert ${input.amount} ${input.amountUnit} to canonical unit for dimension ${dimension}`
      );
    }

    const amountCanonical = validation.canonicalAmount;

    // Calculate base price per canonical unit (excluding shipping)
    const pricePerCanonicalExclShipping = input.totalPrice / amountCanonical;

    // Calculate price including shipping (if applicable)
    const shippingCost = input.shippingCost || 0;
    const shippingIncluded = input.shippingIncluded || false;
    const totalWithShipping = shippingIncluded
      ? input.totalPrice
      : input.totalPrice + shippingCost;
    const pricePerCanonicalInclShipping = totalWithShipping / amountCanonical;

    // For now, effective price equals price including shipping (tax excluded)
    // In future, this might consider tax implications, bulk discounts, etc.
    const effectivePricePerCanonical = pricePerCanonicalInclShipping;

    return {
      amountCanonical,
      pricePerCanonicalExclShipping,
      pricePerCanonicalInclShipping,
      effectivePricePerCanonical,
    };
  }

  /**
   * Create an offer with automatic unit conversion and price normalization
   * @param input Raw offer input data
   * @returns Created offer with computed fields
   */
  async createOffer(input: OfferInput): Promise<Offer> {
    try {
      // Get the canonical dimension from the linked inventory item
      const dimension = await this.getInventoryItemDimension(
        input.inventoryItemId
      );

      // Compute canonical metrics
      const metrics = this.computeOfferMetrics(input, dimension);

      // Create the complete offer entity
      const entityData: Omit<Offer, 'id' | 'created_at' | 'updated_at'> = {
        ...input,
        capturedAt: input.observedAt, // Default capturedAt to observedAt if not provided
        // Default to tax NOT included per current product decision
        isTaxIncluded: false,
        shippingIncluded: input.shippingIncluded ?? false,
        amountCanonical: metrics.amountCanonical,
        pricePerCanonicalExclShipping: metrics.pricePerCanonicalExclShipping,
        pricePerCanonicalInclShipping: metrics.pricePerCanonicalInclShipping,
        effectivePricePerCanonical: metrics.effectivePricePerCanonical,
        computedByVersion: this.COMPUTATION_VERSION,
      };

      return this.create(entityData);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(
        'Failed to create offer with unit conversion',
        error as Error
      );
    }
  }

  /**
   * Get offers for a specific inventory item, sorted by effective price per canonical unit
   * @param inventoryItemId ID of the inventory item
   * @param ascending Whether to sort in ascending order (cheapest first)
   * @returns Array of offers sorted by price
   */
  async findByInventoryItemSortedByPrice(
    inventoryItemId: string,
    ascending: boolean = true
  ): Promise<Offer[]> {
    try {
      const orderDirection = ascending ? 'ASC' : 'DESC';
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE inventory_item_id = ? AND deleted_at IS NULL
        ORDER BY effective_price_per_canonical ${orderDirection}, captured_at DESC
      `;

      const result = await executeSql(sql, [inventoryItemId]);
      const offers: Offer[] = [];

      for (let i = 0; i < result.rows.length; i++) {
        offers.push(this.mapRowToEntity(result.rows.item(i)));
      }

      return offers;
    } catch (error) {
      throw new DatabaseError(
        'Failed to find offers by inventory item',
        error as Error
      );
    }
  }

  /**
   * Get the best offer (lowest effective price) for an inventory item
   * @param inventoryItemId ID of the inventory item
   * @returns The cheapest offer, or null if none found
   */
  async findBestOfferForItem(inventoryItemId: string): Promise<Offer | null> {
    try {
      const offers = await this.findByInventoryItemSortedByPrice(
        inventoryItemId,
        true
      );
      return offers.length > 0 ? offers[0] : null;
    } catch (error) {
      throw new DatabaseError(
        'Failed to find best offer for item',
        error as Error
      );
    }
  }

  /**
   * Update an offer's prices when total_price, amount, or amount_unit changes
   * This recomputes all canonical metrics
   * @param id Offer ID
   * @param updates Fields to update
   * @returns Updated offer
   */
  async updateWithRecomputation(
    id: string,
    updates: Partial<OfferInput>
  ): Promise<Offer> {
    try {
      // Get current offer
      const currentOffer = await this.findById(id);
      if (!currentOffer) {
        throw new ValidationError(`Offer with ID ${id} not found`);
      }

      // Create input data combining current values with updates
      const updatedInput: OfferInput = {
        inventoryItemId:
          updates.inventoryItemId ?? currentOffer.inventoryItemId,
        supplierId: updates.supplierId ?? currentOffer.supplierId,
        supplierNameSnapshot:
          updates.supplierNameSnapshot ?? currentOffer.supplierNameSnapshot,
        supplierUrl: updates.supplierUrl ?? currentOffer.supplierUrl,
        sourceType: updates.sourceType ?? currentOffer.sourceType,
        sourceUrl: updates.sourceUrl ?? currentOffer.sourceUrl,
        rawCapture: updates.rawCapture ?? currentOffer.rawCapture,
        observedAt: updates.observedAt ?? currentOffer.observedAt,
        totalPrice: updates.totalPrice ?? currentOffer.totalPrice,
        currency: updates.currency ?? currentOffer.currency,
        isTaxIncluded: updates.isTaxIncluded ?? currentOffer.isTaxIncluded,
        taxRate: updates.taxRate ?? currentOffer.taxRate,
        shippingCost: updates.shippingCost ?? currentOffer.shippingCost,
        minOrderAmount: updates.minOrderAmount ?? currentOffer.minOrderAmount,
        freeShippingThresholdAtCapture:
          updates.freeShippingThresholdAtCapture ??
          currentOffer.freeShippingThresholdAtCapture,
        shippingIncluded:
          updates.shippingIncluded ?? currentOffer.shippingIncluded,
        amount: updates.amount ?? currentOffer.amount,
        amountUnit: updates.amountUnit ?? currentOffer.amountUnit,
        bundleId: updates.bundleId ?? currentOffer.bundleId,
        qualityRating: updates.qualityRating ?? currentOffer.qualityRating,
        notes: updates.notes ?? currentOffer.notes,
        photoUri: updates.photoUri ?? currentOffer.photoUri,
      };

      // Check if any fields affecting computation changed
      const needsRecomputation =
        updates.totalPrice !== undefined ||
        updates.amount !== undefined ||
        updates.amountUnit !== undefined ||
        updates.shippingCost !== undefined ||
        updates.shippingIncluded !== undefined ||
        updates.inventoryItemId !== undefined;

      if (needsRecomputation) {
        // Get dimension (may have changed if inventoryItemId changed)
        const dimension = await this.getInventoryItemDimension(
          updatedInput.inventoryItemId
        );

        // Recompute metrics
        const metrics = this.computeOfferMetrics(updatedInput, dimension);

        // Update with recomputed values
        const updateData: Partial<Offer> = {
          ...updates,
          amountCanonical: metrics.amountCanonical,
          pricePerCanonicalExclShipping: metrics.pricePerCanonicalExclShipping,
          pricePerCanonicalInclShipping: metrics.pricePerCanonicalInclShipping,
          effectivePricePerCanonical: metrics.effectivePricePerCanonical,
          computedByVersion: this.COMPUTATION_VERSION,
        };

        const updated = await this.update(id, updateData);
        if (!updated) {
          throw new DatabaseError(
            `Failed to update offer with ID ${id}`,
            new Error('Update returned null')
          );
        }
        return updated;
      } else {
        // Simple update without recomputation
        const updated = await this.update(id, updates);
        if (!updated) {
          throw new DatabaseError(
            `Failed to update offer with ID ${id}`,
            new Error('Update returned null')
          );
        }
        return updated;
      }
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(
        'Failed to update offer with recomputation',
        error as Error
      );
    }
  }
}
