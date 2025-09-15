/**
 * Product Variant Repository Implementation
 * Handles CRUD operations for ProductVariant entities
 */

import { BaseRepository } from './base/BaseRepository';
import { ProductVariant, DatabaseError } from '../types';
import { executeSql } from '../sqlite/database';
// import { Platform } from 'react-native';
// import { generateUUID } from '../utils/uuid';

// Local helper to safely parse JSON strings
function safeParseJson<T = any>(value: string): T | undefined {
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export class ProductVariantRepository extends BaseRepository<ProductVariant> {
  protected tableName = 'product_variants';

  // Override to allow ordering by product variant-specific columns
  protected getAllowedOrderByColumns(): string[] {
    return [
      'id',
      'created_at',
      'updated_at',
      'inventory_item_id',
      'net_content',
      'uom',
      'barcode_value',
    ];
  }

  protected mapRowToEntity(row: any): ProductVariant {
    return {
      id: row.id,
      inventoryItemId: row.inventory_item_id,
      netContent: row.net_content,
      uom: row.uom,
      barcodeValue: row.barcode_value || undefined,
      metadata: row.metadata ? safeParseJson(row.metadata) : undefined,
      notes: row.notes || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at || undefined,
    };
  }

  protected mapEntityToRow(entity: Partial<ProductVariant>): Record<string, any> {
    const row: Record<string, any> = {};

    if (entity.id !== undefined) row.id = entity.id;
    if (entity.inventoryItemId !== undefined) row.inventory_item_id = entity.inventoryItemId;
    if (entity.netContent !== undefined) row.net_content = entity.netContent;
    if (entity.uom !== undefined) row.uom = entity.uom;
    if (entity.barcodeValue !== undefined) row.barcode_value = entity.barcodeValue;
    if (entity.metadata !== undefined) row.metadata = entity.metadata ? JSON.stringify(entity.metadata) : null;
    if (entity.notes !== undefined) row.notes = entity.notes;
    if (entity.created_at !== undefined) row.created_at = entity.created_at;
    if (entity.updated_at !== undefined) row.updated_at = entity.updated_at;
    if (entity.deleted_at !== undefined) row.deleted_at = entity.deleted_at;

    return row;
  }

  /**
   * Find all variants for a specific inventory item
   */
  async findByInventoryItemId(inventoryItemId: string): Promise<ProductVariant[]> {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE inventory_item_id = ? AND deleted_at IS NULL
        ORDER BY created_at ASC
      `;
      
      const result = await executeSql(sql, [inventoryItemId]);
      return this.mapResultToEntities(result);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find product variants by inventory item ID: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Find a variant by its barcode value
   */
  async findByBarcodeValue(barcodeValue: string): Promise<ProductVariant | null> {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE barcode_value = ? AND deleted_at IS NULL
        LIMIT 1
      `;
      
      const result = await executeSql(sql, [barcodeValue]);
      const entities = this.mapResultToEntities(result);
      return entities.length > 0 ? entities[0] : null;
    } catch (error) {
      throw new DatabaseError(
        `Failed to find product variant by barcode: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Check if a barcode value is already in use by another variant
   */
  async isBarcodeInUse(barcodeValue: string, excludeId?: string): Promise<boolean> {
    try {
      let sql = `
        SELECT COUNT(*) as count FROM ${this.tableName}
        WHERE barcode_value = ? AND deleted_at IS NULL
      `;
      const params: any[] = [barcodeValue];

      if (excludeId) {
        sql += ' AND id != ?';
        params.push(excludeId);
      }

      const result = await executeSql(sql, params);
      const count = this.getCountFromResult(result);
      return count > 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to check barcode availability: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Get count of variants for a specific inventory item
   */
  async countByInventoryItemId(inventoryItemId: string): Promise<number> {
    try {
      const sql = `
        SELECT COUNT(*) as count FROM ${this.tableName}
        WHERE inventory_item_id = ? AND deleted_at IS NULL
      `;
      
      const result = await executeSql(sql, [inventoryItemId]);
      return this.getCountFromResult(result);
    } catch (error) {
      throw new DatabaseError(
        `Failed to count product variants by inventory item ID: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Override create to validate barcode uniqueness
   */
  async create(entity: Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'>): Promise<ProductVariant> {
    // Check barcode uniqueness if barcode is provided
    if (entity.barcodeValue) {
      const isInUse = await this.isBarcodeInUse(entity.barcodeValue);
      if (isInUse) {
        throw new DatabaseError(
          `Barcode value '${entity.barcodeValue}' is already in use`
        );
      }
    }

    return super.create(entity);
  }

  /**
   * Override update to validate barcode uniqueness
   */
  async update(
    id: string,
    updates: Partial<Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<ProductVariant | null> {
    // Check barcode uniqueness if barcode is being updated
    if (updates.barcodeValue) {
      const isInUse = await this.isBarcodeInUse(updates.barcodeValue, id);
      if (isInUse) {
        throw new DatabaseError(
          `Barcode value '${updates.barcodeValue}' is already in use`
        );
      }
    }

    return super.update(id, updates);
  }

  /**
   * Helper method to get count from query result
   */
  private getCountFromResult(result: any): number {
    return result.rows.length > 0 ? result.rows.item(0).count : 0;
  }

  /**
   * Helper method to map query result to entities
   */
  private mapResultToEntities(result: any): ProductVariant[] {
    const entities: ProductVariant[] = [];
    
    for (let i = 0; i < result.rows.length; i++) {
      entities.push(this.mapRowToEntity(result.rows.item(i)));
    }
    
    return entities;
  }

  // =============================================================================
  // MIGRATION HELPER METHODS
  // =============================================================================

  /**
   * Create a default variant for an inventory item (for migration from legacy systems)
   * This creates a basic variant without barcode for items that don't have variants yet
   */
  async createDefaultVariantForItem(
    inventoryItemId: string,
    netContent: number = 1,
    uom: string = 'unit'
  ): Promise<ProductVariant> {
    try {
      // Check if item already has variants
      const existingVariants = await this.findByInventoryItemId(inventoryItemId);
      if (existingVariants.length > 0) {
        throw new DatabaseError(
          `Inventory item ${inventoryItemId} already has variants`
        );
      }

      const defaultVariant = {
        inventoryItemId,
        netContent,
        uom,
        // No barcode for default variant
        barcodeValue: undefined,
        metadata: { isDefault: true, migrated: true },
        notes: 'Default variant created during migration',
      };

      return await this.create(defaultVariant);
    } catch (error) {
      throw new DatabaseError(
        `Failed to create default variant for inventory item: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Migrate barcode data from legacy system to product variants
   * This is a helper method for gradual migration from legacy barcode scanning
   */
  async migrateLegacyBarcodeData(
    inventoryItemId: string,
    legacyBarcodeData: {
      barcodeValue: string;
      netContent?: number;
      uom?: string;
      metadata?: Record<string, any>;
      notes?: string;
    }
  ): Promise<ProductVariant> {
    try {
      // Check if barcode already exists
      const existingVariant = await this.findByBarcodeValue(legacyBarcodeData.barcodeValue);
      if (existingVariant) {
        throw new DatabaseError(
          `Barcode ${legacyBarcodeData.barcodeValue} already exists in variants`
        );
      }

      const migratedVariant = {
        inventoryItemId,
        netContent: legacyBarcodeData.netContent || 1,
        uom: legacyBarcodeData.uom || 'unit',
        barcodeValue: legacyBarcodeData.barcodeValue,
        metadata: {
          ...legacyBarcodeData.metadata,
          migrated: true,
          migrationDate: new Date().toISOString(),
        },
        notes: legacyBarcodeData.notes || 'Migrated from legacy barcode system',
      };

      return await this.create(migratedVariant);
    } catch (error) {
      throw new DatabaseError(
        `Failed to migrate legacy barcode data: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Get migration statistics for monitoring migration progress
   */
  async getMigrationStats(): Promise<{
    totalVariants: number;
    variantsWithBarcodes: number;
    migratedVariants: number;
    defaultVariants: number;
  }> {
    try {
      // Get total variants
      const totalResult = await executeSql(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE deleted_at IS NULL`
      );
      const totalVariants = this.getCountFromResult(totalResult);

      // Get variants with barcodes
      const barcodeResult = await executeSql(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE barcode_value IS NOT NULL AND deleted_at IS NULL`
      );
      const variantsWithBarcodes = this.getCountFromResult(barcodeResult);

      // Get migrated variants (have migration metadata)
      const migratedResult = await executeSql(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE metadata LIKE '%"migrated":true%' AND deleted_at IS NULL`
      );
      const migratedVariants = this.getCountFromResult(migratedResult);

      // Get default variants
      const defaultResult = await executeSql(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE metadata LIKE '%"isDefault":true%' AND deleted_at IS NULL`
      );
      const defaultVariants = this.getCountFromResult(defaultResult);

      return {
        totalVariants,
        variantsWithBarcodes,
        migratedVariants,
        defaultVariants,
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get migration statistics: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Find variants that need migration (items without variants)
   * This helps identify inventory items that need default variants created
   */
  async findInventoryItemsNeedingVariants(): Promise<string[]> {
    try {
      const sql = `
        SELECT DISTINCT ii.id
        FROM products ii
        LEFT JOIN ${this.tableName} pv ON ii.id = pv.inventory_item_id AND pv.deleted_at IS NULL
        WHERE ii.deleted_at IS NULL AND pv.id IS NULL
        ORDER BY ii.created_at ASC
      `;
      
      const result = await executeSql(sql);
      const itemIds: string[] = [];
      
      for (let i = 0; i < result.rows.length; i++) {
        itemIds.push(result.rows.item(i).id);
      }
      
      return itemIds;
    } catch (error) {
      throw new DatabaseError(
        `Failed to find inventory items needing variants: ${(error as Error).message}`,
        error as Error
      );
    }
  }
}
