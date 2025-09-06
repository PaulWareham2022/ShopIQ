/**
 * Unit tests for HistoricalPriceRepository
 */

import { HistoricalPriceRepository } from '../../repositories/HistoricalPriceRepository';
import { HistoricalPrice, HistoricalPriceSource } from '../../types';
import { setupTestDatabase, cleanupTestDatabase } from '../setup';

describe('HistoricalPriceRepository', () => {
  let repository: HistoricalPriceRepository;

  beforeAll(async () => {
    await setupTestDatabase();
    repository = new HistoricalPriceRepository();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clean up any existing data
    await repository.hardDeleteMany({});
  });

  describe('create', () => {
    it('should create a new historical price record', async () => {
      const historicalPrice: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'> = {
        inventoryItemId: 'item-1',
        supplierId: 'supplier-1',
        price: 10.50,
        currency: 'CAD',
        unit: 'g',
        quantity: 100,
        observedAt: '2024-01-01T10:00:00Z',
        source: 'offer',
        metadata: {
          confidence: 0.8,
          includesShipping: true,
          includesTax: true,
        },
      };

      const result = await repository.create(historicalPrice);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.inventoryItemId).toBe(historicalPrice.inventoryItemId);
      expect(result.supplierId).toBe(historicalPrice.supplierId);
      expect(result.price).toBe(historicalPrice.price);
      expect(result.currency).toBe(historicalPrice.currency);
      expect(result.unit).toBe(historicalPrice.unit);
      expect(result.quantity).toBe(historicalPrice.quantity);
      expect(result.observedAt).toBe(historicalPrice.observedAt);
      expect(result.source).toBe(historicalPrice.source);
      expect(result.metadata).toEqual(historicalPrice.metadata);
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    it('should create a historical price record without supplier (aggregated data)', async () => {
      const historicalPrice: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'> = {
        inventoryItemId: 'item-1',
        supplierId: undefined,
        price: 12.00,
        currency: 'CAD',
        unit: 'g',
        quantity: 100,
        observedAt: '2024-01-01T10:00:00Z',
        source: 'aggregated',
        metadata: {
          confidence: 0.6,
          notes: 'Aggregated from multiple sources',
        },
      };

      const result = await repository.create(historicalPrice);

      expect(result).toBeDefined();
      expect(result.supplierId).toBeUndefined();
      expect(result.source).toBe('aggregated');
    });
  });

  describe('createMany', () => {
    it('should create multiple historical price records', async () => {
      const historicalPrices: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>[] = [
        {
          inventoryItemId: 'item-1',
          supplierId: 'supplier-1',
          price: 10.50,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer',
        },
        {
          inventoryItemId: 'item-1',
          supplierId: 'supplier-2',
          price: 11.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T11:00:00Z',
          source: 'offer',
        },
      ];

      const results = await repository.createMany(historicalPrices);

      expect(results).toHaveLength(2);
      expect(results[0].inventoryItemId).toBe('item-1');
      expect(results[1].inventoryItemId).toBe('item-1');
      expect(results[0].supplierId).toBe('supplier-1');
      expect(results[1].supplierId).toBe('supplier-2');
    });
  });

  describe('getHistoricalPricesForItem', () => {
    beforeEach(async () => {
      // Create test data
      const historicalPrices: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>[] = [
        {
          inventoryItemId: 'item-1',
          supplierId: 'supplier-1',
          price: 10.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer',
        },
        {
          inventoryItemId: 'item-1',
          supplierId: 'supplier-2',
          price: 11.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-02T10:00:00Z',
          source: 'offer',
        },
        {
          inventoryItemId: 'item-2',
          supplierId: 'supplier-1',
          price: 15.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer',
        },
      ];

      await repository.createMany(historicalPrices);
    });

    it('should get historical prices for a specific inventory item', async () => {
      const prices = await repository.getHistoricalPricesForItem('item-1');

      expect(prices).toHaveLength(2);
      expect(prices.every(p => p.inventoryItemId === 'item-1')).toBe(true);
    });

    it('should filter by supplier', async () => {
      const prices = await repository.getHistoricalPricesForItem('item-1', {
        supplierId: 'supplier-1',
      });

      expect(prices).toHaveLength(1);
      expect(prices[0].supplierId).toBe('supplier-1');
    });

    it('should filter by date range', async () => {
      const prices = await repository.getHistoricalPricesForItem('item-1', {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-01T23:59:59Z',
      });

      expect(prices).toHaveLength(1);
      expect(prices[0].observedAt).toBe('2024-01-01T10:00:00Z');
    });

    it('should filter by source', async () => {
      const prices = await repository.getHistoricalPricesForItem('item-1', {
        source: 'offer',
      });

      expect(prices).toHaveLength(2);
      expect(prices.every(p => p.source === 'offer')).toBe(true);
    });

    it('should limit results', async () => {
      const prices = await repository.getHistoricalPricesForItem('item-1', {
        limit: 1,
      });

      expect(prices).toHaveLength(1);
    });

    it('should order by observed_at by default', async () => {
      const prices = await repository.getHistoricalPricesForItem('item-1');

      expect(prices[0].observedAt).toBe('2024-01-01T10:00:00Z');
      expect(prices[1].observedAt).toBe('2024-01-02T10:00:00Z');
    });
  });

  describe('getPriceStatistics', () => {
    beforeEach(async () => {
      // Create test data with known statistics
      const historicalPrices: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>[] = [
        {
          inventoryItemId: 'item-1',
          supplierId: 'supplier-1',
          price: 10.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer',
        },
        {
          inventoryItemId: 'item-1',
          supplierId: 'supplier-1',
          price: 12.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-02T10:00:00Z',
          source: 'offer',
        },
        {
          inventoryItemId: 'item-1',
          supplierId: 'supplier-1',
          price: 8.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-03T10:00:00Z',
          source: 'offer',
        },
      ];

      await repository.createMany(historicalPrices);
    });

    it('should calculate price statistics correctly', async () => {
      const stats = await repository.getPriceStatistics('item-1');

      expect(stats).toBeDefined();
      expect(stats!.min).toBe(8.00);
      expect(stats!.max).toBe(12.00);
      expect(stats!.average).toBe(10.00);
      expect(stats!.count).toBe(3);
      expect(stats!.standardDeviation).toBeCloseTo(1.63, 1);
    });

    it('should return null for non-existent item', async () => {
      const stats = await repository.getPriceStatistics('non-existent');

      expect(stats).toBeNull();
    });
  });

  describe('getBestHistoricalPrice', () => {
    beforeEach(async () => {
      const historicalPrices: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>[] = [
        {
          inventoryItemId: 'item-1',
          supplierId: 'supplier-1',
          price: 15.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer',
        },
        {
          inventoryItemId: 'item-1',
          supplierId: 'supplier-2',
          price: 10.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-02T10:00:00Z',
          source: 'offer',
        },
        {
          inventoryItemId: 'item-1',
          supplierId: 'supplier-1',
          price: 12.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-03T10:00:00Z',
          source: 'offer',
        },
      ];

      await repository.createMany(historicalPrices);
    });

    it('should return the lowest price', async () => {
      const bestPrice = await repository.getBestHistoricalPrice('item-1');

      expect(bestPrice).toBeDefined();
      expect(bestPrice!.price).toBe(10.00);
      expect(bestPrice!.supplierId).toBe('supplier-2');
    });

    it('should filter by supplier', async () => {
      const bestPrice = await repository.getBestHistoricalPrice('item-1', {
        supplierId: 'supplier-1',
      });

      expect(bestPrice).toBeDefined();
      expect(bestPrice!.price).toBe(12.00);
      expect(bestPrice!.supplierId).toBe('supplier-1');
    });
  });

  describe('getPriceTrend', () => {
    beforeEach(async () => {
      // Create test data with a clear trend
      const historicalPrices: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>[] = [
        {
          inventoryItemId: 'item-1',
          supplierId: 'supplier-1',
          price: 10.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer',
        },
        {
          inventoryItemId: 'item-1',
          supplierId: 'supplier-1',
          price: 11.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-02T10:00:00Z',
          source: 'offer',
        },
        {
          inventoryItemId: 'item-1',
          supplierId: 'supplier-1',
          price: 12.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-03T10:00:00Z',
          source: 'offer',
        },
      ];

      await repository.createMany(historicalPrices);
    });

    it('should return price trend data', async () => {
      const trend = await repository.getPriceTrend('item-1');

      expect(trend).toHaveLength(3);
      expect(trend[0].date).toBe('2024-01-01');
      expect(trend[0].price).toBe(10.00);
      expect(trend[1].date).toBe('2024-01-02');
      expect(trend[1].price).toBe(11.00);
      expect(trend[2].date).toBe('2024-01-03');
      expect(trend[2].price).toBe(12.00);
    });
  });

  describe('cleanupOldData', () => {
    beforeEach(async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const recentDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      const historicalPrices: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>[] = [
        {
          inventoryItemId: 'item-1',
          supplierId: 'supplier-1',
          price: 10.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: oldDate.toISOString(),
          source: 'offer',
        },
        {
          inventoryItemId: 'item-1',
          supplierId: 'supplier-1',
          price: 11.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: recentDate.toISOString(),
          source: 'offer',
        },
      ];

      await repository.createMany(historicalPrices);
    });

    it('should delete old data', async () => {
      const deletedCount = await repository.cleanupOldData(30); // Delete data older than 30 days

      expect(deletedCount).toBe(1);

      const remainingPrices = await repository.getHistoricalPricesForItem('item-1');
      expect(remainingPrices).toHaveLength(1);
    });
  });
});
