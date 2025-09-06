/**
 * Historical Price Repository
 *
 * Provides data access methods for historical price tracking,
 * including specialized queries for trend analysis and statistics.
 */

import { Repository, QueryOptions } from '../types';
import { HistoricalPrice, HistoricalPriceSource, HistoricalPriceMetadata } from '../types';
import { BaseRepository } from './base/BaseRepository';
import { executeSql } from '../sqlite/database';
import { generateUUID } from '../utils/uuid';
import { getCurrentTimestamp } from '../utils/timestamp';

/**
 * Repository for historical price data with specialized trend analysis methods
 */
export class HistoricalPriceRepository extends BaseRepository<HistoricalPrice> {
  protected tableName = 'historical_prices';

  // Override to allow ordering by historical price-specific columns
  protected getAllowedOrderByColumns(): string[] {
    return [
      'id',
      'created_at',
      'updated_at',
      'observed_at',
      'price',
      'inventory_item_id',
      'supplier_id',
      'source',
    ];
  }

  /**
   * Create a new historical price record
   */
  async create(
    entity: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>
  ): Promise<HistoricalPrice> {
    const id = generateUUID();
    const now = getCurrentTimestamp();

    const historicalPrice: HistoricalPrice = {
      ...entity,
      id,
      created_at: now,
      updated_at: now,
    };

    const sql = `
      INSERT INTO historical_prices (
        id, inventory_item_id, supplier_id, price, currency, unit, quantity,
        observed_at, source, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params: (string | number)[] = [
      historicalPrice.id,
      historicalPrice.inventoryItemId,
      historicalPrice.supplierId || '',
      historicalPrice.price,
      historicalPrice.currency,
      historicalPrice.unit,
      historicalPrice.quantity,
      historicalPrice.observedAt,
      historicalPrice.source,
      historicalPrice.metadata ? JSON.stringify(historicalPrice.metadata) : '',
      historicalPrice.created_at,
      historicalPrice.updated_at,
    ];

    await executeSql(sql, params);
    return historicalPrice;
  }

  /**
   * Create multiple historical price records
   */
  async createMany(
    entities: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<HistoricalPrice[]> {
    if (entities.length === 0) return [];

    const now = getCurrentTimestamp();
    const historicalPrices: HistoricalPrice[] = entities.map(entity => ({
      ...entity,
      id: generateUUID(),
      created_at: now,
      updated_at: now,
    }));

    const sql = `
      INSERT INTO historical_prices (
        id, inventory_item_id, supplier_id, price, currency, unit, quantity,
        observed_at, source, metadata, created_at, updated_at
      ) VALUES ${historicalPrices.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}
    `;

    const params: (string | number)[] = [];
    historicalPrices.forEach(price => {
      params.push(
        price.id,
        price.inventoryItemId,
        price.supplierId || '',
        price.price,
        price.currency,
        price.unit,
        price.quantity,
        price.observedAt,
        price.source,
        price.metadata ? JSON.stringify(price.metadata) : '',
        price.created_at,
        price.updated_at
      );
    });

    await executeSql(sql, params);
    return historicalPrices;
  }

  /**
   * Find historical price by ID
   */
  async findById(id: string): Promise<HistoricalPrice | null> {
    const sql = `
      SELECT * FROM historical_prices 
      WHERE id = ? AND deleted_at IS NULL
    `;
    const rows = await executeSql(sql, [id]);
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  /**
   * Find all historical prices with optional filtering
   */
  async findAll(options?: QueryOptions): Promise<HistoricalPrice[]> {
    let sql = 'SELECT * FROM historical_prices WHERE deleted_at IS NULL';
    const params: any[] = [];

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
      if (options.orderDirection) {
        sql += ` ${options.orderDirection}`;
      }
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
      if (options.offset) {
        sql += ` OFFSET ${options.offset}`;
      }
    }

    const rows = await executeSql(sql, params);
    return rows.map((row: any) => this.mapRowToEntity(row));
  }

  /**
   * Find historical prices with conditions
   */
  async findWhere(
    conditions: Partial<HistoricalPrice>,
    options?: QueryOptions
  ): Promise<HistoricalPrice[]> {
    const { whereClause, params } = this.buildWhereClause(conditions);
    
    let sql = `SELECT * FROM historical_prices WHERE ${whereClause} AND deleted_at IS NULL`;
    
    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
      if (options.orderDirection) {
        sql += ` ${options.orderDirection}`;
      }
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
      if (options.offset) {
        sql += ` OFFSET ${options.offset}`;
      }
    }

    const rows = await executeSql(sql, params);
    return rows.map((row: any) => this.mapRowToEntity(row));
  }

  /**
   * Get historical prices for a specific inventory item
   */
  async getHistoricalPricesForItem(
    inventoryItemId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      supplierId?: string;
      source?: HistoricalPriceSource;
      limit?: number;
      orderBy?: 'observed_at' | 'price';
      orderDirection?: 'ASC' | 'DESC';
    }
  ): Promise<HistoricalPrice[]> {
    let sql = `
      SELECT * FROM historical_prices 
      WHERE inventory_item_id = ? AND deleted_at IS NULL
    `;
    const params: any[] = [inventoryItemId];

    if (options?.startDate) {
      sql += ' AND observed_at >= ?';
      params.push(options.startDate);
    }

    if (options?.endDate) {
      sql += ' AND observed_at <= ?';
      params.push(options.endDate);
    }

    if (options?.supplierId) {
      sql += ' AND supplier_id = ?';
      params.push(options.supplierId);
    }

    if (options?.source) {
      sql += ' AND source = ?';
      params.push(options.source);
    }

    const orderBy = options?.orderBy || 'observed_at';
    const orderDirection = options?.orderDirection || 'ASC';
    sql += ` ORDER BY ${orderBy} ${orderDirection}`;

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    const rows = await executeSql(sql, params);
    return rows.map((row: any) => this.mapRowToEntity(row));
  }

  /**
   * Get price statistics for an inventory item
   */
  async getPriceStatistics(
    inventoryItemId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      supplierId?: string;
      source?: HistoricalPriceSource;
    }
  ): Promise<{
    min: number;
    max: number;
    average: number;
    median: number;
    count: number;
    standardDeviation: number;
  } | null> {
    let sql = `
      SELECT 
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(price) as avg_price,
        COUNT(*) as count
      FROM historical_prices 
      WHERE inventory_item_id = ? AND deleted_at IS NULL
    `;
    const params: any[] = [inventoryItemId];

    if (options?.startDate) {
      sql += ' AND observed_at >= ?';
      params.push(options.startDate);
    }

    if (options?.endDate) {
      sql += ' AND observed_at <= ?';
      params.push(options.endDate);
    }

    if (options?.supplierId) {
      sql += ' AND supplier_id = ?';
      params.push(options.supplierId);
    }

    if (options?.source) {
      sql += ' AND source = ?';
      params.push(options.source);
    }

    const rows = await executeSql(sql, params);
    if (rows.length === 0 || rows[0].count === 0) {
      return null;
    }

    const result = rows[0];
    
    // Calculate median and standard deviation
    const medianSql = `
      SELECT price FROM historical_prices 
      WHERE inventory_item_id = ? AND deleted_at IS NULL
      ${options?.startDate ? 'AND observed_at >= ?' : ''}
      ${options?.endDate ? 'AND observed_at <= ?' : ''}
      ${options?.supplierId ? 'AND supplier_id = ?' : ''}
      ${options?.source ? 'AND source = ?' : ''}
      ORDER BY price 
      LIMIT 1 OFFSET ?
    `;
    
    const medianParams = [inventoryItemId];
    if (options?.startDate) medianParams.push(options.startDate);
    if (options?.endDate) medianParams.push(options.endDate);
    if (options?.supplierId) medianParams.push(options.supplierId);
    if (options?.source) medianParams.push(options.source);
    medianParams.push(Math.floor(result.count / 2).toString());

    const medianRows = await executeSql(medianSql, medianParams);
    const median = medianRows.length > 0 ? medianRows[0].price : result.avg_price;

    // Calculate standard deviation
    const stdDevSql = `
      SELECT AVG((price - ?) * (price - ?)) as variance
      FROM historical_prices 
      WHERE inventory_item_id = ? AND deleted_at IS NULL
      ${options?.startDate ? 'AND observed_at >= ?' : ''}
      ${options?.endDate ? 'AND observed_at <= ?' : ''}
      ${options?.supplierId ? 'AND supplier_id = ?' : ''}
      ${options?.source ? 'AND source = ?' : ''}
    `;
    
    const stdDevParams = [result.avg_price, result.avg_price, inventoryItemId];
    if (options?.startDate) stdDevParams.push(options.startDate);
    if (options?.endDate) stdDevParams.push(options.endDate);
    if (options?.supplierId) stdDevParams.push(options.supplierId);
    if (options?.source) stdDevParams.push(options.source);

    const stdDevRows = await executeSql(stdDevSql, stdDevParams);
    const variance = stdDevRows[0]?.variance || 0;
    const standardDeviation = Math.sqrt(variance);

    return {
      min: result.min_price,
      max: result.max_price,
      average: result.avg_price,
      median,
      count: result.count,
      standardDeviation,
    };
  }

  /**
   * Get the best (lowest) historical price for an inventory item
   */
  async getBestHistoricalPrice(
    inventoryItemId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      supplierId?: string;
      source?: HistoricalPriceSource;
    }
  ): Promise<HistoricalPrice | null> {
    let sql = `
      SELECT * FROM historical_prices 
      WHERE inventory_item_id = ? AND deleted_at IS NULL
    `;
    const params: any[] = [inventoryItemId];

    if (options?.startDate) {
      sql += ' AND observed_at >= ?';
      params.push(options.startDate);
    }

    if (options?.endDate) {
      sql += ' AND observed_at <= ?';
      params.push(options.endDate);
    }

    if (options?.supplierId) {
      sql += ' AND supplier_id = ?';
      params.push(options.supplierId);
    }

    if (options?.source) {
      sql += ' AND source = ?';
      params.push(options.source);
    }

    sql += ' ORDER BY price ASC LIMIT 1';

    const rows = await executeSql(sql, params);
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  /**
   * Get price trend data for an inventory item
   */
  async getPriceTrend(
    inventoryItemId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      supplierId?: string;
      source?: HistoricalPriceSource;
      groupBy?: 'day' | 'week' | 'month';
    }
  ): Promise<Array<{
    date: string;
    price: number;
    count: number;
  }>> {
    let sql = `
      SELECT 
        DATE(observed_at) as date,
        AVG(price) as price,
        COUNT(*) as count
      FROM historical_prices 
      WHERE inventory_item_id = ? AND deleted_at IS NULL
    `;
    const params: any[] = [inventoryItemId];

    if (options?.startDate) {
      sql += ' AND observed_at >= ?';
      params.push(options.startDate);
    }

    if (options?.endDate) {
      sql += ' AND observed_at <= ?';
      params.push(options.endDate);
    }

    if (options?.supplierId) {
      sql += ' AND supplier_id = ?';
      params.push(options.supplierId);
    }

    if (options?.source) {
      sql += ' AND source = ?';
      params.push(options.source);
    }

    sql += ' GROUP BY DATE(observed_at) ORDER BY date ASC';

    const rows = await executeSql(sql, params);
    return rows.map((row: any) => ({
      date: row.date,
      price: row.price,
      count: row.count,
    }));
  }

  /**
   * Count historical prices
   */
  async count(conditions?: Partial<HistoricalPrice>): Promise<number> {
    if (!conditions || Object.keys(conditions).length === 0) {
      const sql = 'SELECT COUNT(*) as count FROM historical_prices WHERE deleted_at IS NULL';
      const rows = await executeSql(sql);
      return rows[0]?.count || 0;
    }

    const { whereClause, params } = this.buildWhereClause(conditions);
    const sql = `SELECT COUNT(*) as count FROM historical_prices WHERE ${whereClause} AND deleted_at IS NULL`;
    const rows = await executeSql(sql, params);
    return rows[0]?.count || 0;
  }

  /**
   * Update a historical price record
   */
  async update(
    id: string,
    updates: Partial<Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<HistoricalPrice | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updated_at: getCurrentTimestamp(),
    };

    const sql = `
      UPDATE historical_prices 
      SET inventory_item_id = ?, supplier_id = ?, price = ?, currency = ?, 
          unit = ?, quantity = ?, observed_at = ?, source = ?, metadata = ?, updated_at = ?
      WHERE id = ?
    `;

    const params: (string | number)[] = [
      updated.inventoryItemId,
      updated.supplierId || '',
      updated.price,
      updated.currency,
      updated.unit,
      updated.quantity,
      updated.observedAt,
      updated.source,
      updated.metadata ? JSON.stringify(updated.metadata) : '',
      updated.updated_at,
      id,
    ];

    await executeSql(sql, params);
    return updated;
  }

  /**
   * Soft delete a historical price record
   */
  async delete(id: string): Promise<boolean> {
    const now = getCurrentTimestamp();
    const sql = 'UPDATE historical_prices SET deleted_at = ? WHERE id = ?';
    const result = await executeSql(sql, [now, id]);
    return result.length > 0;
  }

  /**
   * Hard delete a historical price record
   */
  async hardDelete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM historical_prices WHERE id = ?';
    const result = await executeSql(sql, [id]);
    return result.length > 0;
  }

  /**
   * Clean up old historical price data
   */
  async cleanupOldData(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffISO = cutoffDate.toISOString();

    const sql = 'DELETE FROM historical_prices WHERE observed_at < ?';
    const result = await executeSql(sql, [cutoffISO]);
    return result.length;
  }

  /**
   * Map database row to HistoricalPrice entity
   */
  protected mapRowToEntity(row: any): HistoricalPrice {
    return {
      id: row.id,
      inventoryItemId: row.inventory_item_id,
      supplierId: row.supplier_id,
      price: row.price,
      currency: row.currency,
      unit: row.unit,
      quantity: row.quantity,
      observedAt: row.observed_at,
      source: row.source,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
    };
  }

  /**
   * Map HistoricalPrice entity to database row
   */
  protected mapEntityToRow(entity: Partial<HistoricalPrice>): Record<string, any> {
    return {
      id: entity.id,
      inventory_item_id: entity.inventoryItemId,
      supplier_id: entity.supplierId || null,
      price: entity.price,
      currency: entity.currency,
      unit: entity.unit,
      quantity: entity.quantity,
      observed_at: entity.observedAt,
      source: entity.source,
      metadata: entity.metadata ? JSON.stringify(entity.metadata) : null,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
      deleted_at: entity.deleted_at,
    };
  }

  /**
   * Build WHERE clause for conditions
   */
  private buildWhereClause(conditions: Partial<HistoricalPrice>): {
    whereClause: string;
    params: any[];
  } {
    const clauses: string[] = [];
    const params: any[] = [];

    if (conditions.inventoryItemId) {
      clauses.push('inventory_item_id = ?');
      params.push(conditions.inventoryItemId);
    }

    if (conditions.supplierId !== undefined) {
      if (conditions.supplierId === null) {
        clauses.push('supplier_id IS NULL');
      } else {
        clauses.push('supplier_id = ?');
        params.push(conditions.supplierId);
      }
    }

    if (conditions.price !== undefined) {
      clauses.push('price = ?');
      params.push(conditions.price);
    }

    if (conditions.currency) {
      clauses.push('currency = ?');
      params.push(conditions.currency);
    }

    if (conditions.unit) {
      clauses.push('unit = ?');
      params.push(conditions.unit);
    }

    if (conditions.quantity !== undefined) {
      clauses.push('quantity = ?');
      params.push(conditions.quantity);
    }

    if (conditions.observedAt) {
      clauses.push('observed_at = ?');
      params.push(conditions.observedAt);
    }

    if (conditions.source) {
      clauses.push('source = ?');
      params.push(conditions.source);
    }

    return {
      whereClause: clauses.length > 0 ? clauses.join(' AND ') : '1=1',
      params,
    };
  }
}
