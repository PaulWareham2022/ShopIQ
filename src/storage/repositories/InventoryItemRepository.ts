/**
 * Inventory Item Repository Implementation
 * Handles CRUD operations for InventoryItem entities
 */

import { BaseRepository } from './base/BaseRepository';
import { BaseEntity } from '../types';
import { executeSql } from '../sqlite/database';
import { DatabaseError } from '../types';

// InventoryItem entity interface
export interface InventoryItem extends BaseEntity {
  name: string;
  canonical_unit: string;
  shelf_life_sensitive: boolean;
  notes?: string;
}

export class InventoryItemRepository extends BaseRepository<InventoryItem> {
  protected tableName = 'inventory_items';

  protected mapRowToEntity(row: any): InventoryItem {
    return {
      id: row.id,
      name: row.name,
      canonical_unit: row.canonical_unit,
      shelf_life_sensitive: Boolean(row.shelf_life_sensitive),
      notes: row.notes || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at || undefined,
    };
  }

  protected mapEntityToRow(entity: Partial<InventoryItem>): Record<string, any> {
    return {
      id: entity.id,
      name: entity.name,
      canonical_unit: entity.canonical_unit,
      shelf_life_sensitive: entity.shelf_life_sensitive ? 1 : 0,
      notes: entity.notes || null,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
      deleted_at: entity.deleted_at || null,
    };
  }

  /**
   * Find inventory items by name (case-insensitive partial match)
   */
  async findByName(name: string): Promise<InventoryItem[]> {
    try {
      const sql = `
        SELECT * FROM ${this.tableName} 
        WHERE LOWER(name) LIKE LOWER(?) 
        AND deleted_at IS NULL 
        ORDER BY name ASC
      `;
      const result = await executeSql(sql, [`%${name}%`]);
      
      const items: InventoryItem[] = [];
      for (let i = 0; i < result.rows.length; i++) {
        items.push(this.mapRowToEntity(result.rows.item(i)));
      }
      
      return items;
    } catch (error) {
      throw new DatabaseError('Failed to find inventory items by name', error as Error);
    }
  }

  /**
   * Find items by canonical unit
   */
  async findByCanonicalUnit(unit: string): Promise<InventoryItem[]> {
    try {
      const sql = `
        SELECT * FROM ${this.tableName} 
        WHERE canonical_unit = ? 
        AND deleted_at IS NULL 
        ORDER BY name ASC
      `;
      const result = await executeSql(sql, [unit]);
      
      const items: InventoryItem[] = [];
      for (let i = 0; i < result.rows.length; i++) {
        items.push(this.mapRowToEntity(result.rows.item(i)));
      }
      
      return items;
    } catch (error) {
      throw new DatabaseError('Failed to find inventory items by canonical unit', error as Error);
    }
  }

  /**
   * Find shelf-life sensitive items
   */
  async findShelfLifeSensitive(): Promise<InventoryItem[]> {
    try {
      const sql = `
        SELECT * FROM ${this.tableName} 
        WHERE shelf_life_sensitive = 1 
        AND deleted_at IS NULL 
        ORDER BY name ASC
      `;
      const result = await executeSql(sql);
      
      const items: InventoryItem[] = [];
      for (let i = 0; i < result.rows.length; i++) {
        items.push(this.mapRowToEntity(result.rows.item(i)));
      }
      
      return items;
    } catch (error) {
      throw new DatabaseError('Failed to find shelf-life sensitive items', error as Error);
    }
  }

  /**
   * Get inventory statistics
   */
  async getStats(): Promise<{
    total: number;
    shelfLifeSensitive: number;
    unitDistribution: Record<string, number>;
  }> {
    try {
      // Get total and shelf-life sensitive count
      const countQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(shelf_life_sensitive) as shelf_life_sensitive_count
        FROM ${this.tableName} 
        WHERE deleted_at IS NULL
      `;
      
      const countResult = await executeSql(countQuery);
      const countRow = countResult.rows.item(0);
      
      // Get unit distribution
      const unitQuery = `
        SELECT canonical_unit, COUNT(*) as count
        FROM ${this.tableName} 
        WHERE deleted_at IS NULL 
        GROUP BY canonical_unit 
        ORDER BY count DESC
      `;
      
      const unitResult = await executeSql(unitQuery);
      const unitDistribution: Record<string, number> = {};
      
      for (let i = 0; i < unitResult.rows.length; i++) {
        const row = unitResult.rows.item(i);
        unitDistribution[row.canonical_unit] = row.count;
      }
      
      return {
        total: countRow.total || 0,
        shelfLifeSensitive: countRow.shelf_life_sensitive_count || 0,
        unitDistribution,
      };
    } catch (error) {
      throw new DatabaseError('Failed to get inventory statistics', error as Error);
    }
  }

  /**
   * Get items with their offer counts (for dashboard/overview)
   */
  async findWithOfferCounts(): Promise<Array<InventoryItem & { offerCount: number }>> {
    try {
      const sql = `
        SELECT 
          i.*,
          COUNT(o.id) as offer_count
        FROM ${this.tableName} i
        LEFT JOIN offers o ON i.id = o.inventory_item_id AND o.deleted_at IS NULL
        WHERE i.deleted_at IS NULL
        GROUP BY i.id
        ORDER BY i.name ASC
      `;
      
      const result = await executeSql(sql);
      const items: Array<InventoryItem & { offerCount: number }> = [];
      
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        items.push({
          ...this.mapRowToEntity(row),
          offerCount: row.offer_count || 0,
        });
      }
      
      return items;
    } catch (error) {
      throw new DatabaseError('Failed to find inventory items with offer counts', error as Error);
    }
  }
}
