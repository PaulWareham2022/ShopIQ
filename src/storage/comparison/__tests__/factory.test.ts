/**
 * Unit Tests for Comparison Engine Factory
 *
 * Tests the factory pattern for creating and configuring comparison engines.
 */

import {
  createComparisonEngine,
  createComparisonEngineWithDefaults,
  ComparisonEnginePresets,
} from '../factory';
import { RepositoryFactory } from '../../RepositoryFactory';
import { ComparisonConfig } from '../types';

// Mock repository factory
const mockRepositoryFactory = {
  getOfferRepository: jest.fn(),
  getInventoryItemRepository: jest.fn(),
  getSupplierRepository: jest.fn(),
  getHistoricalPriceRepository: jest.fn(),
} as unknown as RepositoryFactory;

describe('Comparison Engine Factory', () => {
  describe('createComparisonEngine', () => {
    it('should create a comparison engine with repository factory', () => {
      const engine = createComparisonEngine(mockRepositoryFactory);
      expect(engine).toBeDefined();
      expect(engine).toHaveProperty('compareOffers');
      expect(engine).toHaveProperty('compareMultipleItems');
      expect(engine).toHaveProperty('getAvailableStrategies');
      expect(engine).toHaveProperty('validateConfig');
    });

    it('should create different engine instances', () => {
      const engine1 = createComparisonEngine(mockRepositoryFactory);
      const engine2 = createComparisonEngine(mockRepositoryFactory);
      expect(engine1).not.toBe(engine2);
    });

    it('should create engine with all available strategies', () => {
      const engine = createComparisonEngine(mockRepositoryFactory);
      const strategies = engine.getAvailableStrategies();

      expect(strategies).toHaveLength(5);
      expect(strategies.map(s => s.id)).toContain('pricePerCanonical');
      expect(strategies.map(s => s.id)).toContain('totalPrice');
      expect(strategies.map(s => s.id)).toContain('pricePerUnit');
      expect(strategies.map(s => s.id)).toContain('qualityAdjustedPrice');
      expect(strategies.map(s => s.id)).toContain('historicalPrice');
    });
  });

  describe('createComparisonEngineWithDefaults', () => {
    it('should create engine with default configuration', () => {
      const defaultConfig: Partial<ComparisonConfig> = {
        primaryStrategy: 'pricePerCanonical',
        globalOptions: {
          maxResults: 10,
          minConfidence: 0.8,
        },
      };

      const engine = createComparisonEngineWithDefaults(
        mockRepositoryFactory,
        defaultConfig
      );
      expect(engine).toBeDefined();
      expect(engine).toHaveProperty('compareOffers');
    });

    it('should create engine without default configuration', () => {
      const engine = createComparisonEngineWithDefaults(mockRepositoryFactory);
      expect(engine).toBeDefined();
      expect(engine).toHaveProperty('compareOffers');
    });

    it('should create different instances', () => {
      const engine1 = createComparisonEngineWithDefaults(mockRepositoryFactory);
      const engine2 = createComparisonEngineWithDefaults(mockRepositoryFactory);
      expect(engine1).not.toBe(engine2);
    });
  });

  describe('ComparisonEnginePresets', () => {
    it('should create engine for price comparison', () => {
      const engine = ComparisonEnginePresets.forPriceComparison(
        mockRepositoryFactory
      );
      expect(engine).toBeDefined();
      expect(engine).toHaveProperty('compareOffers');
    });

    it('should create engine for quality comparison', () => {
      const engine = ComparisonEnginePresets.forQualityComparison(
        mockRepositoryFactory
      );
      expect(engine).toBeDefined();
      expect(engine).toHaveProperty('compareOffers');
    });

    it('should create engine for bulk purchasing', () => {
      const engine = ComparisonEnginePresets.forBulkPurchasing(
        mockRepositoryFactory
      );
      expect(engine).toBeDefined();
      expect(engine).toHaveProperty('compareOffers');
    });

    it('should create engine for recent prices', () => {
      const engine = ComparisonEnginePresets.forRecentPrices(
        mockRepositoryFactory
      );
      expect(engine).toBeDefined();
      expect(engine).toHaveProperty('compareOffers');
    });

    it('should create different instances for each preset', () => {
      const priceEngine = ComparisonEnginePresets.forPriceComparison(
        mockRepositoryFactory
      );
      const qualityEngine = ComparisonEnginePresets.forQualityComparison(
        mockRepositoryFactory
      );
      const bulkEngine = ComparisonEnginePresets.forBulkPurchasing(
        mockRepositoryFactory
      );
      const recentEngine = ComparisonEnginePresets.forRecentPrices(
        mockRepositoryFactory
      );

      expect(priceEngine).not.toBe(qualityEngine);
      expect(qualityEngine).not.toBe(bulkEngine);
      expect(bulkEngine).not.toBe(recentEngine);
      expect(recentEngine).not.toBe(priceEngine);
    });
  });

  describe('engine functionality', () => {
    it('should create engines that can validate configurations', () => {
      const engine = createComparisonEngine(mockRepositoryFactory);
      const config: ComparisonConfig = {
        primaryStrategy: 'pricePerCanonical',
        strategyOptions: {},
        globalOptions: {
          maxResults: 10,
          minConfidence: 0.8,
        },
      };

      const result = engine.validateConfig(config);
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('error');
    });

    it('should create engines that can get default configurations', () => {
      const engine = createComparisonEngine(mockRepositoryFactory);

      const defaultConfig = engine.getDefaultConfig('pricePerCanonical');
      expect(defaultConfig).toHaveProperty('primaryStrategy');
      expect(defaultConfig).toHaveProperty('strategyOptions');
      expect(defaultConfig).toHaveProperty('globalOptions');
    });

    it('should throw error for unknown strategy in getDefaultConfig', () => {
      const engine = createComparisonEngine(mockRepositoryFactory);

      expect(() => {
        engine.getDefaultConfig('unknownStrategy');
      }).toThrow("Comparison strategy 'unknownStrategy' not found");
    });
  });

  describe('error handling', () => {
    it('should handle null repository factory gracefully', () => {
      // The factory might not throw immediately, but could fail later
      expect(() => {
        createComparisonEngine(null as any);
      }).not.toThrow();
    });

    it('should handle undefined repository factory gracefully', () => {
      // The factory might not throw immediately, but could fail later
      expect(() => {
        createComparisonEngine(undefined as any);
      }).not.toThrow();
    });
  });
});
