/**
 * Supplier Repository Implementation
 * Handles CRUD operations for Supplier entities
 */

import { BaseRepository } from './base/BaseRepository';
import { Supplier } from '../types';
import { executeSql } from '../sqlite/database';
import { DatabaseError, ValidationError } from '../types';

export class SupplierRepository extends BaseRepository<Supplier> {
  protected tableName = 'suppliers';

  // Override to allow ordering by supplier-specific columns
  protected getAllowedOrderByColumns(): string[] {
    return [
      'id',
      'created_at',
      'updated_at',
      'name',
      'country_code',
      'region_code',
      'store_code',
      'default_currency',
    ];
  }

  protected mapRowToEntity(row: any): Supplier {
    return {
      id: row.id,
      name: row.name,
      countryCode: row.country_code,
      regionCode: row.region_code || undefined,
      storeCode: row.store_code || undefined,
      defaultCurrency: row.default_currency,
      membershipRequired: Boolean(row.membership_required),
      membershipType: row.membership_type || undefined,
      shippingPolicy: row.shipping_policy
        ? JSON.parse(row.shipping_policy)
        : undefined,
      urlPatterns: row.url_patterns ? JSON.parse(row.url_patterns) : undefined,
      notes: row.notes || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at || undefined,
    };
  }

  protected mapEntityToRow(entity: Partial<Supplier>): Record<string, any> {
    return {
      id: entity.id,
      name: entity.name,
      country_code: entity.countryCode,
      region_code: entity.regionCode || null,
      store_code: entity.storeCode || null,
      default_currency: entity.defaultCurrency,
      membership_required: entity.membershipRequired ? 1 : 0,
      membership_type: entity.membershipType || null,
      shipping_policy: entity.shippingPolicy
        ? JSON.stringify(entity.shippingPolicy)
        : null,
      url_patterns: entity.urlPatterns
        ? JSON.stringify(entity.urlPatterns)
        : null,
      notes: entity.notes || null,
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
      throw new DatabaseError(
        'Failed to find suppliers by name',
        error as Error
      );
    }
  }

  /**
   * Find suppliers by country code
   */
  async findByCountryCode(countryCode: string): Promise<Supplier[]> {
    // Validate input parameters
    if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) {
      throw new ValidationError(
        'countryCode must be a 2-letter uppercase ISO 3166-1 code'
      );
    }

    try {
      const sql = `
        SELECT * FROM ${this.tableName} 
        WHERE country_code = ? 
        AND deleted_at IS NULL 
        ORDER BY name ASC
      `;
      const result = await executeSql(sql, [countryCode]);

      const suppliers: Supplier[] = [];
      for (let i = 0; i < result.rows.length; i++) {
        suppliers.push(this.mapRowToEntity(result.rows.item(i)));
      }

      return suppliers;
    } catch (error) {
      throw new DatabaseError(
        'Failed to find suppliers by country code',
        error as Error
      );
    }
  }

  /**
   * Get supplier statistics
   */
  async getStats(): Promise<{
    total: number;
    withMembership: number;
    withShippingPolicy: number;
    withUrlPatterns: number;
  }> {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN membership_required = 1 THEN 1 END) as with_membership,
          COUNT(shipping_policy) as with_shipping_policy,
          COUNT(url_patterns) as with_url_patterns
        FROM ${this.tableName} 
        WHERE deleted_at IS NULL
      `;

      const result = await executeSql(statsQuery);
      const row = result.rows.item(0);

      return {
        total: row.total || 0,
        withMembership: row.with_membership || 0,
        withShippingPolicy: row.with_shipping_policy || 0,
        withUrlPatterns: row.with_url_patterns || 0,
      };
    } catch (error) {
      throw new DatabaseError(
        'Failed to get supplier statistics',
        error as Error
      );
    }
  }
}
