/**
 * Integration tests for Historical Price Tracking
 * 
 * These tests verify that the historical price tracking system works
 * end-to-end with the database and service layer.
 */

import { RepositoryFactory } from '../../RepositoryFactory';
import { HistoricalPriceService } from '../../services/HistoricalPriceService';
import { HistoricalPriceRepository } from '../../repositories/HistoricalPriceRepository';
import { HistoricalPrice, HistoricalPriceSource } from '../../types';
import { setupTestDatabase, cleanupTestDatabase } from '../setup';

describe('Historical Price Tracking Integration', () => {
  let repositoryFactory: RepositoryFactory;
  let historicalPriceService: HistoricalPriceService;
  let historicalPriceRepository: HistoricalPriceRepository;

  beforeAll(async () => {
    await setupTestDatabase();
    repositoryFactory = RepositoryFactory.getInstance();
    await repositoryFactory.initialize();
    
    historicalPriceRepository = await repositoryFactory.getHistoricalPriceRepository() as HistoricalPriceRepository;
    historicalPriceService = new HistoricalPriceService(repositoryFactory);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clean up any existing data
    await historicalPriceRepository.hardDeleteMany({});
  });

  describe('Basic Historical Price Operations', () => {
    it('should record and retrieve historical prices', async () => {
      // Create a test historical price
      const testPrice: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'> = {
        inventoryItemId: 'test-item-1',
        supplierId: 'test-supplier-1',
        price: 25.99,
        currency: 'CAD',
        unit: 'g',
        quantity: 100,
        observedAt: '2024-01-01T10:00:00Z',
        source: 'offer' as HistoricalPriceSource,
        metadata: {
          confidence: 0.9,
          includesShipping: true,
          includesTax: true,
          notes: 'Test price entry',
        },
      };

      // Record the price
      const recordedPrice = await historicalPriceService.recordPrice(testPrice);

      expect(recordedPrice).toBeDefined();
      expect(recordedPrice.id).toBeDefined();
      expect(recordedPrice.inventoryItemId).toBe(testPrice.inventoryItemId);
      expect(recordedPrice.price).toBe(testPrice.price);
      expect(recordedPrice.source).toBe(testPrice.source);

      // Retrieve the price
      const retrievedPrices = await historicalPriceService.getHistoricalPrices(testPrice.inventoryItemId);
      
      expect(retrievedPrices).toHaveLength(1);
      expect(retrievedPrices[0].id).toBe(recordedPrice.id);
      expect(retrievedPrices[0].price).toBe(testPrice.price);
    });

    it('should record multiple historical prices', async () => {
      const testPrices: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>[] = [
        {
          inventoryItemId: 'test-item-2',
          supplierId: 'test-supplier-1',
          price: 20.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer' as HistoricalPriceSource,
        },
        {
          inventoryItemId: 'test-item-2',
          supplierId: 'test-supplier-2',
          price: 22.50,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-02T10:00:00Z',
          source: 'offer' as HistoricalPriceSource,
        },
      ];

      // Record multiple prices
      const recordedPrices = await historicalPriceService.recordPrices(testPrices);

      expect(recordedPrices).toHaveLength(2);
      expect(recordedPrices[0].inventoryItemId).toBe('test-item-2');
      expect(recordedPrices[1].inventoryItemId).toBe('test-item-2');

      // Retrieve all prices for the item
      const retrievedPrices = await historicalPriceService.getHistoricalPrices('test-item-2');
      expect(retrievedPrices).toHaveLength(2);
    });

    it('should get best historical price', async () => {
      const testPrices: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>[] = [
        {
          inventoryItemId: 'test-item-3',
          supplierId: 'test-supplier-1',
          price: 30.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer' as HistoricalPriceSource,
        },
        {
          inventoryItemId: 'test-item-3',
          supplierId: 'test-supplier-2',
          price: 25.00, // This should be the best price
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-02T10:00:00Z',
          source: 'offer' as HistoricalPriceSource,
        },
        {
          inventoryItemId: 'test-item-3',
          supplierId: 'test-supplier-3',
          price: 35.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-03T10:00:00Z',
          source: 'offer' as HistoricalPriceSource,
        },
      ];

      await historicalPriceService.recordPrices(testPrices);

      // Get best price
      const bestPrice = await historicalPriceService.getBestHistoricalPrice('test-item-3');
      
      expect(bestPrice).toBeDefined();
      expect(bestPrice!.price).toBe(25.00);
      expect(bestPrice!.supplierId).toBe('test-supplier-2');
    });

    it('should get price statistics', async () => {
      const testPrices: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>[] = [
        {
          inventoryItemId: 'test-item-4',
          supplierId: 'test-supplier-1',
          price: 10.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer' as HistoricalPriceSource,
        },
        {
          inventoryItemId: 'test-item-4',
          supplierId: 'test-supplier-2',
          price: 20.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-02T10:00:00Z',
          source: 'offer' as HistoricalPriceSource,
        },
        {
          inventoryItemId: 'test-item-4',
          supplierId: 'test-supplier-3',
          price: 30.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-03T10:00:00Z',
          source: 'offer' as HistoricalPriceSource,
        },
      ];

      await historicalPriceService.recordPrices(testPrices);

      // Get price statistics
      const statistics = await historicalPriceService.getPriceStatistics('test-item-4', '30d');
      
      expect(statistics).toBeDefined();
      expect(statistics!.min).toBe(10.00);
      expect(statistics!.max).toBe(30.00);
      expect(statistics!.average).toBe(20.00);
      expect(statistics!.count).toBe(3);
    });

    it('should get price trend analysis', async () => {
      const testPrices: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>[] = [
        {
          inventoryItemId: 'test-item-5',
          supplierId: 'test-supplier-1',
          price: 10.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer' as HistoricalPriceSource,
        },
        {
          inventoryItemId: 'test-item-5',
          supplierId: 'test-supplier-1',
          price: 15.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-02T10:00:00Z',
          source: 'offer' as HistoricalPriceSource,
        },
        {
          inventoryItemId: 'test-item-5',
          supplierId: 'test-supplier-1',
          price: 20.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-03T10:00:00Z',
          source: 'offer' as HistoricalPriceSource,
        },
      ];

      await historicalPriceService.recordPrices(testPrices);

      // Get price trend
      const trend = await historicalPriceService.getPriceTrend('test-item-5', {
        period: '30d',
        supplierId: 'test-supplier-1',
      });
      
      expect(trend).toBeDefined();
      expect(trend!.direction).toBe('up');
      expect(trend!.changePercentage).toBeGreaterThan(0);
      expect(trend!.startPrice).toBe(10.00);
      expect(trend!.endPrice).toBe(20.00);
    });

    it('should get price history summary', async () => {
      const testPrices: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>[] = [
        {
          inventoryItemId: 'test-item-6',
          supplierId: 'test-supplier-1',
          price: 15.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer' as HistoricalPriceSource,
        },
        {
          inventoryItemId: 'test-item-6',
          supplierId: 'test-supplier-2',
          price: 12.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-02T10:00:00Z',
          source: 'offer' as HistoricalPriceSource,
        },
        {
          inventoryItemId: 'test-item-6',
          supplierId: 'test-supplier-1',
          price: 18.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-03T10:00:00Z',
          source: 'offer' as HistoricalPriceSource,
        },
      ];

      await historicalPriceService.recordPrices(testPrices);

      // Get price history summary
      const summary = await historicalPriceService.getPriceHistorySummary('test-item-6', '30d');
      
      expect(summary).toBeDefined();
      expect(summary.currentPrice).toBe(18.00); // Most recent
      expect(summary.bestPrice).toBe(12.00); // Lowest
      expect(summary.averagePrice).toBe(15.00); // Average
      expect(summary.priceRange.min).toBe(12.00);
      expect(summary.priceRange.max).toBe(18.00);
      expect(summary.supplierCount).toBe(2);
      expect(summary.dataPointCount).toBe(3);
    });
  });

  describe('Data Management', () => {
    it('should clean up old data', async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const recentDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      const testPrices: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'>[] = [
        {
          inventoryItemId: 'test-item-7',
          supplierId: 'test-supplier-1',
          price: 10.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: oldDate.toISOString(),
          source: 'offer' as HistoricalPriceSource,
        },
        {
          inventoryItemId: 'test-item-7',
          supplierId: 'test-supplier-1',
          price: 15.00,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: recentDate.toISOString(),
          source: 'offer' as HistoricalPriceSource,
        },
      ];

      await historicalPriceService.recordPrices(testPrices);

      // Verify both prices exist
      let allPrices = await historicalPriceService.getHistoricalPrices('test-item-7');
      expect(allPrices).toHaveLength(2);

      // Clean up data older than 30 days
      const deletedCount = await historicalPriceService.cleanupOldData(30);
      expect(deletedCount).toBe(1);

      // Verify only recent price remains
      allPrices = await historicalPriceService.getHistoricalPrices('test-item-7');
      expect(allPrices).toHaveLength(1);
      expect(allPrices[0].price).toBe(15.00);
    });
  });
});
