import { InventoryItem, Offer } from '../types';

/**
 * Configuration for shelf-life warning thresholds
 */
export interface ShelfLifeWarningConfig {
  /** Default warning threshold multiplier (e.g., 2.0 = warn when quantity is 2x normal) */
  defaultThresholdMultiplier: number;

  /** Per-category threshold overrides */
  categoryThresholds?: Record<string, number>;

  /** Per-item threshold overrides by item ID */
  itemThresholds?: Record<string, number>;

  /** Minimum quantity to trigger warning (absolute value) */
  minimumQuantityThreshold?: number;
}

/**
 * Default configuration for shelf-life warnings
 */
export const DEFAULT_SHELF_LIFE_CONFIG: ShelfLifeWarningConfig = {
  defaultThresholdMultiplier: 3.0, // Warn when quantity is 3x normal
  minimumQuantityThreshold: 10, // Minimum absolute quantity to trigger warning
  categoryThresholds: {
    'Grocery/Meat': 2.0, // Lower threshold for meat products
    'Pool Chemicals': 4.0, // Higher threshold for chemicals
    Dairy: 2.5, // Medium threshold for dairy
  },
};

/**
 * Result of shelf-life warning analysis
 */
export interface ShelfLifeWarningResult {
  /** Whether a warning should be shown */
  shouldShowWarning: boolean;

  /** The warning message to display */
  warningMessage?: string;

  /** The severity level of the warning */
  severity: 'info' | 'warning' | 'high';

  /** The threshold that was exceeded */
  exceededThreshold?: number;

  /** The actual quantity that triggered the warning */
  actualQuantity?: number;
}

/**
 * Check if an inventory item is shelf-life sensitive
 */
export function isShelfLifeSensitive(item: InventoryItem): boolean {
  return item.shelfLifeSensitive === true;
}

/**
 * Get the warning threshold for a specific item
 */
export function getWarningThreshold(
  item: InventoryItem,
  config: ShelfLifeWarningConfig = DEFAULT_SHELF_LIFE_CONFIG
): number {
  // Check for per-item threshold override
  if (config.itemThresholds?.[item.id]) {
    return config.itemThresholds[item.id];
  }

  // Check for category-based threshold
  if (item.category && config.categoryThresholds?.[item.category]) {
    return config.categoryThresholds[item.category];
  }

  // Use default threshold
  return config.defaultThresholdMultiplier;
}

/**
 * Analyze if a quantity should trigger a shelf-life warning
 */
export function analyzeShelfLifeWarning(
  item: InventoryItem,
  quantity: number,
  config: ShelfLifeWarningConfig = DEFAULT_SHELF_LIFE_CONFIG
): ShelfLifeWarningResult {
  // If item is not shelf-life sensitive, no warning needed
  if (!isShelfLifeSensitive(item)) {
    return {
      shouldShowWarning: false,
      severity: 'info',
    };
  }

  // Check minimum quantity threshold
  const minThreshold = config.minimumQuantityThreshold || 0;
  if (quantity < minThreshold) {
    return {
      shouldShowWarning: false,
      severity: 'info',
    };
  }

  // Get the warning threshold for this item
  const threshold = getWarningThreshold(item, config);

  // For MVP, we'll use a simple approach:
  // - If quantity is above threshold, show warning
  // - In future, this could be enhanced with usage rate calculations

  const shouldWarn = quantity > threshold;

  if (!shouldWarn) {
    return {
      shouldShowWarning: false,
      severity: 'info',
    };
  }

  // Determine severity based on how much the threshold was exceeded
  const excessRatio = quantity / threshold;
  let severity: 'info' | 'warning' | 'high' = 'info';
  let warningMessage: string;

  if (excessRatio >= 5.0) {
    severity = 'high';
    warningMessage = `⚠️ High quantity purchase: ${quantity} units may exceed shelf life for ${item.name}. Consider smaller quantities or faster usage.`;
  } else if (excessRatio >= 3.0) {
    severity = 'warning';
    warningMessage = `⚠️ Large quantity purchase: ${quantity} units of ${item.name} may be difficult to use before expiry.`;
  } else {
    severity = 'info';
    warningMessage = `ℹ️ Shelf-life sensitive: ${item.name} has limited shelf life. Consider usage rate when purchasing ${quantity} units.`;
  }

  return {
    shouldShowWarning: true,
    warningMessage,
    severity,
    exceededThreshold: threshold,
    actualQuantity: quantity,
  };
}

/**
 * Analyze shelf-life warning for an offer
 */
export function analyzeOfferShelfLifeWarning(
  item: InventoryItem,
  offer: Offer,
  config: ShelfLifeWarningConfig = DEFAULT_SHELF_LIFE_CONFIG
): ShelfLifeWarningResult {
  return analyzeShelfLifeWarning(item, offer.amount, config);
}

/**
 * Get a user-friendly warning message for display in UI
 */
export function getShelfLifeWarningMessage(
  item: InventoryItem,
  quantity: number,
  config: ShelfLifeWarningConfig = DEFAULT_SHELF_LIFE_CONFIG
): string | null {
  const result = analyzeShelfLifeWarning(item, quantity, config);
  return result.shouldShowWarning ? result.warningMessage || null : null;
}

/**
 * Check if an offer should show a shelf-life warning
 */
export function shouldShowShelfLifeWarning(
  item: InventoryItem,
  offer: Offer,
  config: ShelfLifeWarningConfig = DEFAULT_SHELF_LIFE_CONFIG
): boolean {
  const result = analyzeOfferShelfLifeWarning(item, offer, config);
  return result.shouldShowWarning;
}

/**
 * Get shelf-life warning severity for an offer
 */
export function getShelfLifeWarningSeverity(
  item: InventoryItem,
  offer: Offer,
  config: ShelfLifeWarningConfig = DEFAULT_SHELF_LIFE_CONFIG
): 'info' | 'warning' | 'high' {
  const result = analyzeOfferShelfLifeWarning(item, offer, config);
  return result.severity;
}
