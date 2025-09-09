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
  private ratingColumnExists: boolean | null = null;

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
      rating: row.rating || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at || undefined,
    };
  }

  protected mapEntityToRow(entity: Partial<Supplier>): Record<string, any> {
    const row: Record<string, any> = {
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

    // Only include rating if it's defined (handles cases where column might not exist)
    if (entity.rating !== undefined) {
      row.rating = entity.rating;
    }

    return row;
  }

  /**
   * Check if the rating column exists in the database
   */
  private async checkRatingColumnExists(): Promise<boolean> {
    if (this.ratingColumnExists !== null) {
      return this.ratingColumnExists;
    }

    try {
      // Test the column directly with a simple query - this is more reliable than PRAGMA
      try {
        await executeSql('SELECT rating FROM suppliers LIMIT 1');
        console.log('Rating column test passed - column is accessible');
        this.ratingColumnExists = true;
        return true;
      } catch (testError) {
        console.log('Rating column test failed:', testError);
        
        // If the test fails, also check PRAGMA for debugging
        try {
          const result = await executeSql("PRAGMA table_info(suppliers)");
          const columns = [];
          for (let i = 0; i < result.rows.length; i++) {
            columns.push(result.rows.item(i).name);
          }
          console.log('Database columns from PRAGMA:', columns);
          console.log('PRAGMA says rating column exists:', columns.includes('rating'));
        } catch (pragmaError) {
          console.warn('Failed to check PRAGMA:', pragmaError);
        }
        
        this.ratingColumnExists = false;
        return false;
      }
    } catch (error) {
      console.warn('Failed to check rating column existence:', error);
      this.ratingColumnExists = false;
      return false;
    }
  }

  /**
   * Override update method to handle rating column gracefully
   */
  async update(
    id: string,
    updates: Partial<Omit<Supplier, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Supplier | null> {
    console.log('SupplierRepository.update called with:', { id, updates });
    
    // If this is a rating update, handle it specially
    if (updates.rating !== undefined) {
      try {
        // First try to ensure the column exists
        await this.ensureRatingColumnExists();
        
        // Log the update details
        console.log('Proceeding with rating update for supplier:', id, 'rating:', updates.rating);
        
        // Proceed with normal update
        const result = await super.update(id, updates);
        console.log('Rating update result:', result);
        return result;
      } catch (error) {
        console.error('Rating update failed:', error);
        console.error('Error type:', typeof error);
        console.error('Error constructor:', error?.constructor?.name);
        
        // If the error is about missing column, provide a helpful message
        if (error instanceof Error && error.message && error.message.includes('no such column')) {
          throw new Error('Rating feature is not available. The database needs to be updated to support ratings. Please contact support or reinstall the app.');
        }
        
        // For other errors, re-throw
        throw error;
      }
    }

    // Proceed with normal update for non-rating fields
    return super.update(id, updates);
  }

  /**
   * Ensure the rating column exists by running the migration if needed
   */
  private async ensureRatingColumnExists(): Promise<void> {
    const ratingColumnExists = await this.checkRatingColumnExists();
    console.log('Rating column exists check result:', ratingColumnExists);
    
    if (!ratingColumnExists) {
      console.log('Rating column does not exist, attempting to add it...');
      try {
        // Try to add the rating column directly
        const result = await executeSql(
          'ALTER TABLE suppliers ADD COLUMN rating INTEGER CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));'
        );
        console.log('Successfully added rating column, result:', result);
        
        // Reset the cache and test again to make sure it's accessible
        this.ratingColumnExists = null;
        const testAfterAdd = await this.checkRatingColumnExists();
        if (!testAfterAdd) {
          throw new Error('Rating column was added but is still not accessible');
        }
        
        console.log('Rating column successfully added and verified');
      } catch (error) {
        console.error('Failed to add rating column:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined
        });
        
        // Check if the error is because the column already exists
        if (error instanceof Error && error.message.includes('duplicate column name')) {
          console.log('Column already exists, resetting cache and testing...');
          this.ratingColumnExists = null;
          const testAfterError = await this.checkRatingColumnExists();
          if (testAfterError) {
            console.log('Rating column is accessible after error');
            return;
          }
        }
        
        this.ratingColumnExists = false;
        throw error; // Re-throw to let the caller handle it
      }
    } else {
      console.log('Rating column already exists and is accessible');
    }
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
    withRating: number;
    averageRating: number;
    ratingDistribution: {
      '1': number;
      '2': number;
      '3': number;
      '4': number;
      '5': number;
    };
  }> {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN membership_required = 1 THEN 1 END) as with_membership,
          COUNT(shipping_policy) as with_shipping_policy,
          COUNT(url_patterns) as with_url_patterns,
          COUNT(rating) as with_rating,
          AVG(rating) as average_rating,
          COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1,
          COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4,
          COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5
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
        withRating: row.with_rating || 0,
        averageRating: row.average_rating ? Number(row.average_rating.toFixed(2)) : 0,
        ratingDistribution: {
          '1': row.rating_1 || 0,
          '2': row.rating_2 || 0,
          '3': row.rating_3 || 0,
          '4': row.rating_4 || 0,
          '5': row.rating_5 || 0,
        },
      };
    } catch (error) {
      throw new DatabaseError(
        'Failed to get supplier statistics',
        error as Error
      );
    }
  }
}
