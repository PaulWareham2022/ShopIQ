/**
 * Unit tests for HistoricalPriceService
 */

import { HistoricalPriceService } from '../../services/HistoricalPriceService';
import { RepositoryFactory } from '../../RepositoryFactory';
import { HistoricalPrice, HistoricalPriceSource } from '../../types';
import { setupTestDatabase, cleanupTestDatabase } from '../setup';

// Mock the RepositoryFactory
jest.mock('../../RepositoryFactory');

describe('HistoricalPriceService', () => {
  let service: HistoricalPriceService;
  let mockRepositoryFactory: jest.Mocked<RepositoryFactory>;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(() => {
    mockRepositoryFactory = {
      getHistoricalPriceRepository: jest.fn(),
      getInventoryItemRepository: jest.fn(),
    } as any;

    service = new HistoricalPriceService(mockRepositoryFactory);
  });

  describe('recordPrice', () => {
    it('should record a new historical price', async () => {
      const mockRepository = {
        create: jest.fn().mockResolvedValue({
          id: 'hp-1',
          inventoryItemId: 'item-1',
          supplierId: 'supplier-1',
          price: 10.50,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        }),
      };

      mockRepositoryFactory.getHistoricalPriceRepository.mockResolvedValue(mockRepository as any);

      const priceData: Omit<HistoricalPrice, 'id' | 'created_at' | 'updated_at'> = {
        inventoryItemId: 'item-1',
        supplierId: 'supplier-1',
        price: 10.50,
        currency: 'CAD',
        unit: 'g',
        quantity: 100,
        observedAt: '2024-01-01T10:00:00Z',
        source: 'offer',
      };

      const result = await service.recordPrice(priceData);

      expect(mockRepository.create).toHaveBeenCalledWith(priceData);
      expect(result).toBeDefined();
      expect(result.id).toBe('hp-1');
    });
  });

  describe('recordPriceFromOffer', () => {
    it('should record historical price from offer data', async () => {
      const mockRepository = {
        create: jest.fn().mockResolvedValue({
          id: 'hp-1',
          inventoryItemId: 'item-1',
          supplierId: 'supplier-1',
          price: 10.50,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        }),
      };

      const mockInventoryRepo = {
        findById: jest.fn().mockResolvedValue({
          id: 'item-1',
          name: 'Test Item',
          canonicalUnit: 'g',
          canonicalDimension: 'mass',
        }),
      };

      mockRepositoryFactory.getHistoricalPriceRepository.mockResolvedValue(mockRepository as any);
      mockRepositoryFactory.getInventoryItemRepository.mockResolvedValue(mockInventoryRepo as any);

      const offer = {
        id: 'offer-1',
        inventoryItemId: 'item-1',
        supplierId: 'supplier-1',
        effectivePricePerCanonical: 10.50,
        currency: 'CAD',
        amountCanonical: 100,
        observedAt: '2024-01-01T10:00:00Z',
        qualityRating: 4,
      };

      const inventoryItem = {
        id: 'item-1',
        name: 'Test Item',
        canonicalUnit: 'g',
        canonicalDimension: 'mass',
      };

      const result = await service.recordPriceFromOffer(offer as any, inventoryItem as any);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          inventoryItemId: 'item-1',
          supplierId: 'supplier-1',
          price: 10.50,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T10:00:00Z',
          source: 'offer',
          metadata: expect.objectContaining({
            originalOfferId: 'offer-1',
            confidence: 0.8,
            includesShipping: true,
            includesTax: true,
            qualityRating: 4,
          }),
        })
      );

      expect(result).toBeDefined();
    });
  });

  describe('recordAggregatedPrice', () => {
    it('should record aggregated price from multiple sources', async () => {
      const mockRepository = {
        create: jest.fn().mockResolvedValue({
          id: 'hp-1',
          inventoryItemId: 'item-1',
          supplierId: undefined,
          price: 10.50,
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T12:00:00Z',
          source: 'aggregated',
          created_at: '2024-01-01T12:00:00Z',
          updated_at: '2024-01-01T12:00:00Z',
        }),
      };

      mockRepositoryFactory.getHistoricalPriceRepository.mockResolvedValue(mockRepository as any);

      const prices = [
        { price: 10.00, currency: 'CAD', observedAt: '2024-01-01T10:00:00Z' },
        { price: 11.00, currency: 'CAD', observedAt: '2024-01-01T11:00:00Z' },
        { price: 10.50, currency: 'CAD', observedAt: '2024-01-01T12:00:00Z' },
      ];

      const result = await service.recordAggregatedPrice(
        'item-1',
        prices,
        'g',
        100,
        { confidence: 0.7, notes: 'Test aggregation' }
      );

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          inventoryItemId: 'item-1',
          supplierId: undefined,
          price: 10.50, // Average of 10.00, 11.00, 10.50
          currency: 'CAD',
          unit: 'g',
          quantity: 100,
          observedAt: '2024-01-01T12:00:00Z', // Most recent date
          source: 'aggregated',
          metadata: expect.objectContaining({
            confidence: 0.7,
            notes: 'Test aggregation',
            tags: ['aggregated'],
          }),
        })
      );

      expect(result).toBeDefined();
    });

    it('should throw error for empty price array', async () => {
      await expect(
        service.recordAggregatedPrice('item-1', [], 'g', 100)
      ).rejects.toThrow('Cannot create aggregated price from empty price array');
    });
  });

  describe('getPriceTrend', () => {
    it('should get price trend for inventory item', async () => {
      const mockRepository = {
        getHistoricalPricesForItem: jest.fn().mockResolvedValue([
          {
            id: 'hp-1',
            inventoryItemId: 'item-1',
            price: 10.00,
            observedAt: '2024-01-01T10:00:00Z',
          },
          {
            id: 'hp-2',
            inventoryItemId: 'item-1',
            price: 11.00,
            observedAt: '2024-01-02T10:00:00Z',
          },
          {
            id: 'hp-3',
            inventoryItemId: 'item-1',
            price: 12.00,
            observedAt: '2024-01-03T10:00:00Z',
          },
        ]),
      };

      mockRepositoryFactory.getHistoricalPriceRepository.mockResolvedValue(mockRepository as any);

      const trend = await service.getPriceTrend('item-1', {
        period: '30d',
        supplierId: 'supplier-1',
      });

      expect(mockRepository.getHistoricalPricesForItem).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({
          supplierId: 'supplier-1',
          source: 'offer',
        })
      );

      expect(trend).toBeDefined();
      expect(trend!.direction).toBe('up');
      expect(trend!.changePercentage).toBe(20); // 20% increase
    });

    it('should return null for insufficient data', async () => {
      const mockRepository = {
        getHistoricalPricesForItem: jest.fn().mockResolvedValue([
          {
            id: 'hp-1',
            inventoryItemId: 'item-1',
            price: 10.00,
            observedAt: '2024-01-01T10:00:00Z',
          },
        ]),
      };

      mockRepositoryFactory.getHistoricalPriceRepository.mockResolvedValue(mockRepository as any);

      const trend = await service.getPriceTrend('item-1', {
        period: '30d',
        minDataPoints: 3,
      });

      expect(trend).toBeNull();
    });
  });

  describe('getPriceStatistics', () => {
    it('should get price statistics for inventory item', async () => {
      const mockRepository = {
        getHistoricalPricesForItem: jest.fn().mockResolvedValue([
          {
            id: 'hp-1',
            inventoryItemId: 'item-1',
            price: 10.00,
            observedAt: '2024-01-01T10:00:00Z',
          },
          {
            id: 'hp-2',
            inventoryItemId: 'item-1',
            price: 12.00,
            observedAt: '2024-01-02T10:00:00Z',
          },
          {
            id: 'hp-3',
            inventoryItemId: 'item-1',
            price: 8.00,
            observedAt: '2024-01-03T10:00:00Z',
          },
        ]),
      };

      mockRepositoryFactory.getHistoricalPriceRepository.mockResolvedValue(mockRepository as any);

      const stats = await service.getPriceStatistics('item-1', '30d', 'supplier-1');

      expect(mockRepository.getHistoricalPricesForItem).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({
          supplierId: 'supplier-1',
        })
      );

      expect(stats).toBeDefined();
      expect(stats!.min).toBe(8.00);
      expect(stats!.max).toBe(12.00);
      expect(stats!.average).toBe(10.00);
      expect(stats!.count).toBe(3);
    });

    it('should return null for no data', async () => {
      const mockRepository = {
        getHistoricalPricesForItem: jest.fn().mockResolvedValue([]),
      };

      mockRepositoryFactory.getHistoricalPriceRepository.mockResolvedValue(mockRepository as any);

      const stats = await service.getPriceStatistics('item-1', '30d');

      expect(stats).toBeNull();
    });
  });

  describe('getBestHistoricalPrice', () => {
    it('should get best historical price', async () => {
      const mockRepository = {
        getBestHistoricalPrice: jest.fn().mockResolvedValue({
          id: 'hp-1',
          inventoryItemId: 'item-1',
          price: 8.00,
          observedAt: '2024-01-01T10:00:00Z',
        }),
      };

      mockRepositoryFactory.getHistoricalPriceRepository.mockResolvedValue(mockRepository as any);

      const bestPrice = await service.getBestHistoricalPrice('item-1', '30d', 'supplier-1');

      expect(mockRepository.getBestHistoricalPrice).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({
          supplierId: 'supplier-1',
        })
      );

      expect(bestPrice).toBeDefined();
      expect(bestPrice!.price).toBe(8.00);
    });
  });

  describe('getPriceAlerts', () => {
    it('should get price alerts for significant changes', async () => {
      const mockRepository = {
        getHistoricalPricesForItem: jest.fn().mockResolvedValue([
          {
            id: 'hp-1',
            inventoryItemId: 'item-1',
            price: 10.00,
            observedAt: '2024-01-01T10:00:00Z',
            supplierId: 'supplier-1',
          },
          {
            id: 'hp-2',
            inventoryItemId: 'item-1',
            price: 12.00, // 20% increase
            observedAt: '2024-01-02T10:00:00Z',
            supplierId: 'supplier-1',
          },
        ]),
      };

      mockRepositoryFactory.getHistoricalPriceRepository.mockResolvedValue(mockRepository as any);

      const alerts = await service.getPriceAlerts('item-1', {
        threshold: 15, // 15% threshold
        period: '7d',
      });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('increase');
      expect(alerts[0].percentage).toBe(20);
      expect(alerts[0].currentPrice).toBe(12.00);
      expect(alerts[0].previousPrice).toBe(10.00);
    });

    it('should return empty array for no significant changes', async () => {
      const mockRepository = {
        getHistoricalPricesForItem: jest.fn().mockResolvedValue([
          {
            id: 'hp-1',
            inventoryItemId: 'item-1',
            price: 10.00,
            observedAt: '2024-01-01T10:00:00Z',
          },
          {
            id: 'hp-2',
            inventoryItemId: 'item-1',
            price: 10.50, // 5% increase
            observedAt: '2024-01-02T10:00:00Z',
          },
        ]),
      };

      mockRepositoryFactory.getHistoricalPriceRepository.mockResolvedValue(mockRepository as any);

      const alerts = await service.getPriceAlerts('item-1', {
        threshold: 15, // 15% threshold
        period: '7d',
      });

      expect(alerts).toHaveLength(0);
    });
  });

  describe('getPriceHistorySummary', () => {
    it('should get comprehensive price history summary', async () => {
      const mockRepository = {
        getHistoricalPricesForItem: jest.fn().mockResolvedValue([
          {
            id: 'hp-1',
            inventoryItemId: 'item-1',
            price: 10.00,
            observedAt: '2024-01-01T10:00:00Z',
            supplierId: 'supplier-1',
          },
          {
            id: 'hp-2',
            inventoryItemId: 'item-1',
            price: 12.00,
            observedAt: '2024-01-02T10:00:00Z',
            supplierId: 'supplier-2',
          },
        ]),
      };

      mockRepositoryFactory.getHistoricalPriceRepository.mockResolvedValue(mockRepository as any);

      const summary = await service.getPriceHistorySummary('item-1', '30d');

      expect(summary).toBeDefined();
      expect(summary.currentPrice).toBe(12.00); // Most recent price
      expect(summary.bestPrice).toBe(10.00); // Lowest price
      expect(summary.averagePrice).toBe(11.00); // Average price
      expect(summary.priceRange.min).toBe(10.00);
      expect(summary.priceRange.max).toBe(12.00);
      expect(summary.supplierCount).toBe(2);
      expect(summary.dataPointCount).toBe(2);
      expect(summary.lastUpdated).toBe('2024-01-02T10:00:00Z');
    });
  });
});
