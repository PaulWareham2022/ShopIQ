import {
  isShelfLifeSensitive,
  getWarningThreshold,
  analyzeShelfLifeWarning,
  analyzeOfferShelfLifeWarning,
  getShelfLifeWarningMessage,
  shouldShowShelfLifeWarning,
  getShelfLifeWarningSeverity,
  DEFAULT_SHELF_LIFE_CONFIG,
  ShelfLifeWarningConfig,
} from '../shelf-life-warnings';
import { InventoryItem, Offer } from '../../types';

// Mock inventory items for testing
const createMockInventoryItem = (
  overrides: Partial<InventoryItem> = {}
): InventoryItem => ({
  id: 'test-item-1',
  name: 'Test Item',
  canonicalDimension: 'mass',
  canonicalUnit: 'g',
  shelfLifeSensitive: false,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

const createMockOffer = (overrides: Partial<Offer> = {}): Offer => ({
  id: 'test-offer-1',
  inventoryItemId: 'test-item-1',
  supplierId: 'test-supplier-1',
  sourceType: 'manual',
  observedAt: '2023-01-01T00:00:00Z',
  capturedAt: '2023-01-01T00:00:00Z',
  totalPrice: 10.0,
  currency: 'CAD',
  isTaxIncluded: true,
  amount: 1,
  amountUnit: 'g',
  amountCanonical: 1,
  pricePerCanonicalExclShipping: 10.0,
  pricePerCanonicalInclShipping: 10.0,
  effectivePricePerCanonical: 10.0,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

describe('shelf-life-warnings', () => {
  describe('isShelfLifeSensitive', () => {
    it('should return true for shelf-life sensitive items', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: true });
      expect(isShelfLifeSensitive(item)).toBe(true);
    });

    it('should return false for non-shelf-life sensitive items', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: false });
      expect(isShelfLifeSensitive(item)).toBe(false);
    });

    it('should return false for items with undefined shelfLifeSensitive', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: undefined });
      expect(isShelfLifeSensitive(item)).toBe(false);
    });
  });

  describe('getWarningThreshold', () => {
    it('should return default threshold for items without overrides', () => {
      const item = createMockInventoryItem();
      const threshold = getWarningThreshold(item);
      expect(threshold).toBe(
        DEFAULT_SHELF_LIFE_CONFIG.defaultThresholdMultiplier
      );
    });

    it('should return category-specific threshold when available', () => {
      const item = createMockInventoryItem({ category: 'Grocery/Meat' });
      const threshold = getWarningThreshold(item);
      expect(threshold).toBe(2.0);
    });

    it('should return item-specific threshold when available', () => {
      const item = createMockInventoryItem({ id: 'special-item' });
      const config: ShelfLifeWarningConfig = {
        ...DEFAULT_SHELF_LIFE_CONFIG,
        itemThresholds: { 'special-item': 1.5 },
      };
      const threshold = getWarningThreshold(item, config);
      expect(threshold).toBe(1.5);
    });

    it('should prioritize item-specific threshold over category threshold', () => {
      const item = createMockInventoryItem({
        id: 'special-item',
        category: 'Grocery/Meat',
      });
      const config: ShelfLifeWarningConfig = {
        ...DEFAULT_SHELF_LIFE_CONFIG,
        itemThresholds: { 'special-item': 1.5 },
      };
      const threshold = getWarningThreshold(item, config);
      expect(threshold).toBe(1.5);
    });
  });

  describe('analyzeShelfLifeWarning', () => {
    it('should not show warning for non-shelf-life sensitive items', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: false });
      const result = analyzeShelfLifeWarning(item, 100);

      expect(result.shouldShowWarning).toBe(false);
      expect(result.severity).toBe('info');
    });

    it('should not show warning for quantities below minimum threshold', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: true });
      const result = analyzeShelfLifeWarning(item, 5); // Below default min of 10

      expect(result.shouldShowWarning).toBe(false);
      expect(result.severity).toBe('info');
    });

    it('should not show warning for quantities below warning threshold', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: true });
      const result = analyzeShelfLifeWarning(item, 2.5); // Below default threshold of 3.0

      expect(result.shouldShowWarning).toBe(false);
      expect(result.severity).toBe('info');
    });

    it('should show info warning for quantities just above threshold', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: true });
      const config: ShelfLifeWarningConfig = {
        ...DEFAULT_SHELF_LIFE_CONFIG,
        minimumQuantityThreshold: 5, // Lower threshold so 8.0 will trigger warning
      };
      const result = analyzeShelfLifeWarning(item, 8.0, config); // Above min threshold (5) and above default threshold (3.0), but below 3x threshold

      expect(result.shouldShowWarning).toBe(true);
      expect(result.severity).toBe('info');
      expect(result.warningMessage).toContain('Shelf-life sensitive');
      expect(result.exceededThreshold).toBe(3.0);
      expect(result.actualQuantity).toBe(8.0);
    });

    it('should show warning for quantities 3x above threshold', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: true });
      const result = analyzeShelfLifeWarning(item, 10.0); // 3.33x above threshold of 3.0, above min threshold

      expect(result.shouldShowWarning).toBe(true);
      expect(result.severity).toBe('warning');
      expect(result.warningMessage).toContain('Large quantity purchase');
    });

    it('should show high severity warning for quantities 5x above threshold', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: true });
      const result = analyzeShelfLifeWarning(item, 15.0); // 5x above threshold of 3.0

      expect(result.shouldShowWarning).toBe(true);
      expect(result.severity).toBe('high');
      expect(result.warningMessage).toContain('High quantity purchase');
    });

    it('should use custom minimum threshold when provided', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: true });
      const config: ShelfLifeWarningConfig = {
        ...DEFAULT_SHELF_LIFE_CONFIG,
        minimumQuantityThreshold: 5,
      };
      const result = analyzeShelfLifeWarning(item, 3, config);

      expect(result.shouldShowWarning).toBe(false);
    });

    it('should use category-specific threshold for meat products', () => {
      const item = createMockInventoryItem({
        shelfLifeSensitive: true,
        category: 'Grocery/Meat',
      });
      const result = analyzeShelfLifeWarning(item, 12.0); // Above meat threshold of 2.0 and min threshold of 10

      expect(result.shouldShowWarning).toBe(true);
      expect(result.exceededThreshold).toBe(2.0);
    });
  });

  describe('analyzeOfferShelfLifeWarning', () => {
    it('should analyze offer using offer amount', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: true });
      const offer = createMockOffer({ amount: 15.0 }); // 5x above threshold

      const result = analyzeOfferShelfLifeWarning(item, offer);

      expect(result.shouldShowWarning).toBe(true);
      expect(result.severity).toBe('high');
      expect(result.actualQuantity).toBe(15.0);
    });
  });

  describe('getShelfLifeWarningMessage', () => {
    it('should return null when no warning is needed', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: false });
      const message = getShelfLifeWarningMessage(item, 100);
      expect(message).toBeNull();
    });

    it('should return warning message when warning is needed', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: true });
      const message = getShelfLifeWarningMessage(item, 15.0);
      expect(message).toContain('High quantity purchase');
    });
  });

  describe('shouldShowShelfLifeWarning', () => {
    it('should return false when no warning is needed', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: false });
      const offer = createMockOffer({ amount: 100 });

      expect(shouldShowShelfLifeWarning(item, offer)).toBe(false);
    });

    it('should return true when warning is needed', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: true });
      const offer = createMockOffer({ amount: 15.0 });

      expect(shouldShowShelfLifeWarning(item, offer)).toBe(true);
    });
  });

  describe('getShelfLifeWarningSeverity', () => {
    it('should return info severity for non-warning cases', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: false });
      const offer = createMockOffer({ amount: 100 });

      expect(getShelfLifeWarningSeverity(item, offer)).toBe('info');
    });

    it('should return appropriate severity for warning cases', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: true });

      // Info severity
      const config: ShelfLifeWarningConfig = {
        ...DEFAULT_SHELF_LIFE_CONFIG,
        minimumQuantityThreshold: 5, // Lower threshold so 8.0 will trigger warning
      };
      const offer1 = createMockOffer({ amount: 8.0 });
      expect(getShelfLifeWarningSeverity(item, offer1, config)).toBe('info');

      // Warning severity
      const offer2 = createMockOffer({ amount: 10.0 });
      expect(getShelfLifeWarningSeverity(item, offer2)).toBe('warning');

      // High severity
      const offer3 = createMockOffer({ amount: 15.0 });
      expect(getShelfLifeWarningSeverity(item, offer3)).toBe('high');
    });
  });

  describe('edge cases', () => {
    it('should handle zero quantities gracefully', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: true });
      const result = analyzeShelfLifeWarning(item, 0);

      expect(result.shouldShowWarning).toBe(false);
    });

    it('should handle negative quantities gracefully', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: true });
      const result = analyzeShelfLifeWarning(item, -5);

      expect(result.shouldShowWarning).toBe(false);
    });

    it('should handle very large quantities', () => {
      const item = createMockInventoryItem({ shelfLifeSensitive: true });
      const result = analyzeShelfLifeWarning(item, 1000);

      expect(result.shouldShowWarning).toBe(true);
      expect(result.severity).toBe('high');
    });

    it('should handle items with undefined category', () => {
      const item = createMockInventoryItem({
        shelfLifeSensitive: true,
        category: undefined,
      });
      const result = analyzeShelfLifeWarning(item, 12.0); // Above min threshold and default threshold

      expect(result.shouldShowWarning).toBe(true);
      expect(result.exceededThreshold).toBe(
        DEFAULT_SHELF_LIFE_CONFIG.defaultThresholdMultiplier
      );
    });
  });
});
