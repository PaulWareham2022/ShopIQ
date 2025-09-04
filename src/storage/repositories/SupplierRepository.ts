/**
 * Supplier Repository Implementation
 * Handles CRUD operations for Supplier entities
 */

import { BaseRepository } from './base/BaseRepository';
import { BaseEntity } from '../types';
import { executeSql } from '../sqlite/database';
import { DatabaseError } from '../types';

// Supplier entity interface
export interface Supplier extends BaseEntity {
  name: string;
  website?: string;
  notes?: string;
  shipping_policy?: string;
  quality_rating?: number; // 1-5
}

export class SupplierRepository extends BaseRepository<Supplier> {
  protected tableName = 'suppliers';

  protected mapRowToEntity(row: any): Supplier {
    return {
      id: row.id,
      name: row.name,
      website: row.website || undefined,
      notes: row.notes || undefined,
      shipping_policy: row.shipping_policy || undefined,
      quality_rating: row.quality_rating || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at || undefined,
    };
  }

  protected mapEntityToRow(entity: Partial<Supplier>): Record<string, any> {
    return {
      id: entity.id,
      name: entity.name,
      website: entity.website || null,
      notes: entity.notes || null,
      shipping_policy: entity.shipping_policy || null,
      quality_rating: entity.quality_rating || null,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
      deleted_at: entity.deleted_at || null,
    };
  }

  /**
   * Find suppliers by name (case-insensitive partial match)
   */
  async findByName(name: string): Promise<Supplier[]> {
    try {
      const sql = `
        SELECT * FROM ${this.tableName} 
        WHERE LOWER(name) LIKE LOWER(?) 
        AND deleted_at IS NULL 
        ORDER BY name ASC
      `;
      const result = await executeSql(sql, [`%${name}%`]);
      
      const suppliers: Supplier[] = [];
      for (let i = 0; i < result.rows.length; i++) {
        suppliers.push(this.mapRowToEntity(result.rows.item(i)));
      }
      
      return suppliers;
    } catch (error) {
      throw new DatabaseError('Failed to find suppliers by name', error as Error);
    }
  }

  /**
   * Find suppliers with quality rating above threshold
   */
  async findByMinQualityRating(minRating: number): Promise<Supplier[]> {
    try {
      const sql = `
        SELECT * FROM ${this.tableName} 
        WHERE quality_rating >= ? 
        AND deleted_at IS NULL 
        ORDER BY quality_rating DESC, name ASC
      `;
      const result = await executeSql(sql, [minRating]);
      
      const suppliers: Supplier[] = [];
      for (let i = 0; i < result.rows.length; i++) {
        suppliers.push(this.mapRowToEntity(result.rows.item(i)));
      }
      
      return suppliers;
    } catch (error) {
      throw new DatabaseError('Failed to find suppliers by quality rating', error as Error);
    }
  }

  /**
   * Get supplier statistics
   */
  async getStats(): Promise<{
    total: number;
    withRating: number;
    averageRating: number;
    withWebsite: number;
  }> {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(quality_rating) as with_rating,
          AVG(quality_rating) as average_rating,
          COUNT(website) as with_website
        FROM ${this.tableName} 
        WHERE deleted_at IS NULL
      `;
      
      const result = await executeSql(statsQuery);
      const row = result.rows.item(0);
      
      return {
        total: row.total || 0,
        withRating: row.with_rating || 0,
        averageRating: row.average_rating || 0,
        withWebsite: row.with_website || 0,
      };
    } catch (error) {
      throw new DatabaseError('Failed to get supplier statistics', error as Error);
    }
  }
}
