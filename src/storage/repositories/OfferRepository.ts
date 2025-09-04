/**
 * Offer Repository Implementation
 * Handles CRUD operations for Offer entities with automatic unit conversion
 * and price normalization using canonical unit conversion utilities.
 */

import { BaseRepository } from './base/BaseRepository';
import { BaseEntity, DatabaseError, ValidationError } from '../types';
import { CanonicalDimension } from '../types';
import { executeSql } from '../sqlite/database';
import { validateAndConvert } from '../utils/canonical-units';

// Offer entity interface (extending BaseEntity but with proper field names)
export interface Offer extends BaseEntity {
  // Foreign keys
  inventory_item_id: string;
  supplier_id: string;

  // Supplier snapshot and URL information
  supplier_name_snapshot?: string;
  supplier_url?: string;

  // Source tracking
  source_type: 'manual' | 'url' | 'ocr' | 'api';
  source_url?: string;
  raw_capture?: string;

  // Timing information
  observed_at: string;
  captured_at: string;

  // Price information
  total_price: number;
  currency: string;

  // Tax information
  is_tax_included: boolean;
  tax_rate?: number;

  // Shipping information
  shipping_cost?: number;
  min_order_amount?: number;
  free_shipping_threshold_at_capture?: number;
  shipping_included?: boolean;

  // Quantity information (raw user input)
  amount: number;
  amount_unit: string;

  // Computed canonical quantity
  amount_canonical: number;

  // Computed price metrics
  price_per_canonical_excl_shipping: number;
  price_per_canonical_incl_shipping: number;
  effective_price_per_canonical: number;

  // Bundle and quality information
  bundle_id?: string;
  quality_rating?: number;

  // Additional metadata
  notes?: string;
  photo_uri?: string;
  computed_by_version?: string;
}

/**
 * Input data for creating offers (before conversion calculations)
 */
export interface OfferInput {
  inventory_item_id: string;
  supplier_id: string;
  supplier_name_snapshot?: string;
  supplier_url?: string;
  source_type: 'manual' | 'url' | 'ocr' | 'api';
  source_url?: string;
  raw_capture?: string;
  observed_at: string;
  total_price: number;
  currency: string;
  is_tax_included?: boolean;
  tax_rate?: number;
  shipping_cost?: number;
  min_order_amount?: number;
  free_shipping_threshold_at_capture?: number;
  shipping_included?: boolean;

  // Raw amount and unit (to be converted)
  amount: number;
  amount_unit: string;

  // Optional fields
  bundle_id?: string;
  quality_rating?: number;
  notes?: string;
  photo_uri?: string;
}

export class OfferRepository extends BaseRepository<Offer> {
  protected tableName = 'offers';

  // Version tag for tracking which normalization algorithm was used
  private readonly COMPUTATION_VERSION = 'v1.0.0';

  protected mapRowToEntity(row: any): Offer {
    return {
      id: row.id,
      inventory_item_id: row.inventory_item_id,
      supplier_id: row.supplier_id,
      supplier_name_snapshot: row.supplier_name_snapshot || undefined,
      supplier_url: row.supplier_url || undefined,
      source_type: row.source_type as 'manual' | 'url' | 'ocr' | 'api',
      source_url: row.source_url || undefined,
      raw_capture: row.raw_capture || undefined,
      observed_at: row.observed_at,
      captured_at: row.captured_at,
      total_price: row.total_price,
      currency: row.currency,
      is_tax_included: Boolean(row.is_tax_included),
      tax_rate: row.tax_rate || undefined,
      shipping_cost: row.shipping_cost || undefined,
      min_order_amount: row.min_order_amount || undefined,
      free_shipping_threshold_at_capture:
        row.free_shipping_threshold_at_capture || undefined,
      shipping_included: Boolean(row.shipping_included),
      amount: row.amount,
      amount_unit: row.amount_unit,
      amount_canonical: row.amount_canonical,
      price_per_canonical_excl_shipping: row.price_per_canonical_excl_shipping,
      price_per_canonical_incl_shipping: row.price_per_canonical_incl_shipping,
      effective_price_per_canonical: row.effective_price_per_canonical,
      bundle_id: row.bundle_id || undefined,
      quality_rating: row.quality_rating || undefined,
      notes: row.notes || undefined,
      photo_uri: row.photo_uri || undefined,
      computed_by_version: row.computed_by_version || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at || undefined,
    };
  }

  protected mapEntityToRow(entity: Partial<Offer>): Record<string, any> {
    return {
      id: entity.id,
      inventory_item_id: entity.inventory_item_id,
      supplier_id: entity.supplier_id,
      supplier_name_snapshot: entity.supplier_name_snapshot,
      supplier_url: entity.supplier_url,
      source_type: entity.source_type,
      source_url: entity.source_url,
      raw_capture: entity.raw_capture,
      observed_at: entity.observed_at,
      captured_at: entity.captured_at,
      total_price: entity.total_price,
      currency: entity.currency,
      is_tax_included: entity.is_tax_included ? 1 : 0,
      tax_rate: entity.tax_rate,
      shipping_cost: entity.shipping_cost,
      min_order_amount: entity.min_order_amount,
      free_shipping_threshold_at_capture:
        entity.free_shipping_threshold_at_capture,
      shipping_included: entity.shipping_included ? 1 : 0,
      amount: entity.amount,
      amount_unit: entity.amount_unit,
      amount_canonical: entity.amount_canonical,
      price_per_canonical_excl_shipping:
        entity.price_per_canonical_excl_shipping,
      price_per_canonical_incl_shipping:
        entity.price_per_canonical_incl_shipping,
      effective_price_per_canonical: entity.effective_price_per_canonical,
      bundle_id: entity.bundle_id,
      quality_rating: entity.quality_rating,
      notes: entity.notes,
      photo_uri: entity.photo_uri,
      computed_by_version: entity.computed_by_version,
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
      input.amount_unit,
      dimension
    );

    if (!validation.isValid || validation.canonicalAmount === undefined) {
      throw new ValidationError(
        validation.errorMessage ||
          `Failed to convert ${input.amount} ${input.amount_unit} to canonical unit for dimension ${dimension}`
      );
    }

    const amountCanonical = validation.canonicalAmount;

    // Calculate base price per canonical unit (excluding shipping)
    const pricePerCanonicalExclShipping = input.total_price / amountCanonical;

    // Calculate price including shipping (if applicable)
    const shippingCost = input.shipping_cost || 0;
    const shippingIncluded = input.shipping_included || false;
    const totalWithShipping = shippingIncluded
      ? input.total_price
      : input.total_price + shippingCost;
    const pricePerCanonicalInclShipping = totalWithShipping / amountCanonical;

    // For now, effective price equals price including shipping
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
      const dimension = await getInventoryItemDimension(
        input.inventory_item_id
      );

      // Compute canonical metrics
      const metrics = this.computeOfferMetrics(input, dimension);

      // Create the complete offer entity
      const entityData: Omit<Offer, 'id' | 'created_at' | 'updated_at'> = {
        ...input,
        captured_at: input.observed_at, // Default captured_at to observed_at if not provided
        is_tax_included: input.is_tax_included ?? true, // Default to tax included
        shipping_included: input.shipping_included ?? false,
        amount_canonical: metrics.amountCanonical,
        price_per_canonical_excl_shipping:
          metrics.pricePerCanonicalExclShipping,
        price_per_canonical_incl_shipping:
          metrics.pricePerCanonicalInclShipping,
        effective_price_per_canonical: metrics.effectivePricePerCanonical,
        computed_by_version: this.COMPUTATION_VERSION,
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
        inventory_item_id:
          updates.inventory_item_id ?? currentOffer.inventory_item_id,
        supplier_id: updates.supplier_id ?? currentOffer.supplier_id,
        supplier_name_snapshot:
          updates.supplier_name_snapshot ?? currentOffer.supplier_name_snapshot,
        supplier_url: updates.supplier_url ?? currentOffer.supplier_url,
        source_type: updates.source_type ?? currentOffer.source_type,
        source_url: updates.source_url ?? currentOffer.source_url,
        raw_capture: updates.raw_capture ?? currentOffer.raw_capture,
        observed_at: updates.observed_at ?? currentOffer.observed_at,
        total_price: updates.total_price ?? currentOffer.total_price,
        currency: updates.currency ?? currentOffer.currency,
        is_tax_included:
          updates.is_tax_included ?? currentOffer.is_tax_included,
        tax_rate: updates.tax_rate ?? currentOffer.tax_rate,
        shipping_cost: updates.shipping_cost ?? currentOffer.shipping_cost,
        min_order_amount:
          updates.min_order_amount ?? currentOffer.min_order_amount,
        free_shipping_threshold_at_capture:
          updates.free_shipping_threshold_at_capture ??
          currentOffer.free_shipping_threshold_at_capture,
        shipping_included:
          updates.shipping_included ?? currentOffer.shipping_included,
        amount: updates.amount ?? currentOffer.amount,
        amount_unit: updates.amount_unit ?? currentOffer.amount_unit,
        bundle_id: updates.bundle_id ?? currentOffer.bundle_id,
        quality_rating: updates.quality_rating ?? currentOffer.quality_rating,
        notes: updates.notes ?? currentOffer.notes,
        photo_uri: updates.photo_uri ?? currentOffer.photo_uri,
      };

      // Check if any fields affecting computation changed
      const needsRecomputation =
        updates.total_price !== undefined ||
        updates.amount !== undefined ||
        updates.amount_unit !== undefined ||
        updates.shipping_cost !== undefined ||
        updates.shipping_included !== undefined ||
        updates.inventory_item_id !== undefined;

      if (needsRecomputation) {
        // Get dimension (may have changed if inventory_item_id changed)
        const dimension = await getInventoryItemDimension(
          updatedInput.inventory_item_id
        );

        // Recompute metrics
        const metrics = this.computeOfferMetrics(updatedInput, dimension);

        // Update with recomputed values
        const updateData: Partial<Offer> = {
          ...updates,
          amount_canonical: metrics.amountCanonical,
          price_per_canonical_excl_shipping:
            metrics.pricePerCanonicalExclShipping,
          price_per_canonical_incl_shipping:
            metrics.pricePerCanonicalInclShipping,
          effective_price_per_canonical: metrics.effectivePricePerCanonical,
          computed_by_version: this.COMPUTATION_VERSION,
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

/**
 * Helper function to get inventory item dimension
 * (extracted to avoid "this" binding issues in private method calls)
 */
async function getInventoryItemDimension(
  inventoryItemId: string
): Promise<CanonicalDimension> {
  try {
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
    if (error instanceof ValidationError) {
      throw error; // Re-throw validation errors as-is
    }
    throw new DatabaseError(
      'Failed to get inventory item dimension',
      error as Error
    );
  }
}
