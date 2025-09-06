/**
 * Inventory Item Repository Implementation
 * Handles CRUD operations for InventoryItem entities
 */

import { BaseRepository } from './base/BaseRepository';
import { InventoryItem, DatabaseError } from '../types';
import { executeSql } from '../sqlite/database';
import { Platform } from 'react-native';
import { generateUUID } from '../utils/uuid';

// Local helper to safely parse JSON strings
function safeParseJson<T = any>(value: string): T | undefined {
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

// Mock data for web testing (seed)
const MOCK_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Apples',
    canonicalDimension: 'mass' as const,
    canonicalUnit: 'kg',
    shelfLifeSensitive: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Milk',
    canonicalDimension: 'volume' as const,
    canonicalUnit: 'L',
    shelfLifeSensitive: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export class InventoryItemRepository extends BaseRepository<InventoryItem> {
  protected tableName = 'inventory_items';

  // Override to allow ordering by inventory item-specific columns
  protected getAllowedOrderByColumns(): string[] {
    return [
      'id',
      'created_at',
      'updated_at',
      'name',
      'category',
      'canonical_dimension',
      'canonical_unit',
      'shelf_life_sensitive',
      'shelf_life_days',
      'usage_rate_per_day',
    ];
  }

  // Shared in-memory store for web fallback so multiple instances see the same data
  private static sharedItems: InventoryItem[] = [...MOCK_INVENTORY_ITEMS];

  // Web fallback methods
  private isWebFallback(): boolean {
    return Platform.OS === 'web';
  }

  // Override main CRUD methods for web fallback
  async findAll(): Promise<InventoryItem[]> {
    if (this.isWebFallback()) {
      return [...InventoryItemRepository.sharedItems];
    }
    return super.findAll();
  }

  async findById(id: string): Promise<InventoryItem | null> {
    if (this.isWebFallback()) {
      return (
        InventoryItemRepository.sharedItems.find(item => item.id === id) || null
      );
    }
    return super.findById(id);
  }

  async create(
    entity: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<InventoryItem> {
    if (this.isWebFallback()) {
      const newItem: InventoryItem = {
        ...entity,
        id: generateUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      InventoryItemRepository.sharedItems.push(newItem);
      return newItem;
    }
    return super.create(entity);
  }

  async update(
    id: string,
    entity: Partial<InventoryItem>
  ): Promise<InventoryItem | null> {
    if (this.isWebFallback()) {
      const index = InventoryItemRepository.sharedItems.findIndex(
        item => item.id === id
      );
      if (index === -1) return null;

      InventoryItemRepository.sharedItems[index] = {
        ...InventoryItemRepository.sharedItems[index],
        ...entity,
        id,
        updated_at: new Date().toISOString(),
      };
      return InventoryItemRepository.sharedItems[index];
    }
    return super.update(id, entity);
  }

  async delete(id: string): Promise<boolean> {
    if (this.isWebFallback()) {
      const index = InventoryItemRepository.sharedItems.findIndex(
        item => item.id === id
      );
      if (index === -1) return false;

      InventoryItemRepository.sharedItems.splice(index, 1);
      return true;
    }
    return super.delete(id);
  }

  protected mapRowToEntity(row: any): InventoryItem {
    return {
      id: row.id,
      name: row.name,
      category: row.category || undefined,
      canonicalDimension: row.canonical_dimension,
      canonicalUnit: row.canonical_unit,
      shelfLifeSensitive: Boolean(row.shelf_life_sensitive),
      shelfLifeDays: row.shelf_life_days ?? undefined,
      usageRatePerDay: row.usage_rate_per_day ?? undefined,
      attributes: row.attributes ? safeParseJson(row.attributes) : undefined,
      equivalenceFactor:
        typeof row.equivalence_factor === 'number'
          ? row.equivalence_factor
          : row.equivalence_factor
            ? Number(row.equivalence_factor)
            : undefined,
      notes: row.notes || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at || undefined,
    };
  }

  protected mapEntityToRow(
    entity: Partial<InventoryItem>
  ): Record<string, any> {
    return {
      id: entity.id,
      name: entity.name,
      category: entity.category ?? null,
      canonical_dimension: entity.canonicalDimension,
      canonical_unit: entity.canonicalUnit,
      shelf_life_sensitive: entity.shelfLifeSensitive ? 1 : 0,
      shelf_life_days:
        entity.shelfLifeDays === undefined ? null : entity.shelfLifeDays,
      usage_rate_per_day:
        entity.usageRatePerDay === undefined ? null : entity.usageRatePerDay,
      attributes: entity.attributes ? JSON.stringify(entity.attributes) : null,
      equivalence_factor:
        entity.equivalenceFactor === undefined
          ? null
          : entity.equivalenceFactor,
      notes: entity.notes ?? null,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
      deleted_at: entity.deleted_at ?? null,
    };
  }

  /**
   * Find inventory items by name (case-insensitive partial match)
   */
  async findByName(name: string): Promise<InventoryItem[]> {
    if (this.isWebFallback()) {
      const lowerName = name.toLowerCase();
      return InventoryItemRepository.sharedItems.filter(item =>
        item.name.toLowerCase().includes(lowerName)
      );
    }

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
      throw new DatabaseError(
        'Failed to find inventory items by name',
        error as Error
      );
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
      throw new DatabaseError(
        'Failed to find inventory items by canonical unit',
        error as Error
      );
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
      throw new DatabaseError(
        'Failed to find shelf-life sensitive items',
        error as Error
      );
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
      throw new DatabaseError(
        'Failed to get inventory statistics',
        error as Error
      );
    }
  }

  /**
   * Get items with their offer counts (for dashboard/overview)
   */
  async findWithOfferCounts(): Promise<
    Array<InventoryItem & { offerCount: number }>
  > {
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
      throw new DatabaseError(
        'Failed to find inventory items with offer counts',
        error as Error
      );
    }
  }
}
