/**
 * Smart Unit Defaults Utility
 * 
 * Provides intelligent unit suggestions based on item names, categories, and patterns
 * to reduce manual input and improve ultra-fast capture UX as specified in the PRD.
 */

import { CanonicalDimension } from '../types';

export interface UnitSuggestion {
  unit: string;
  dimension: CanonicalDimension;
  confidence: number; // 0-1, higher means more confident
  reason: string; // Human-readable explanation
}

export interface SmartUnitContext {
  itemName: string;
  category?: string;
  existingCanonicalUnit?: string;
}

// Common patterns for different item types
const ITEM_PATTERNS = {
  // Mass-based items (food, chemicals, etc.)
  mass: {
    patterns: [
      /\b(apple|banana|orange|grape|berry|fruit|meat|beef|chicken|pork|fish|cheese|butter|flour|sugar|salt|rice|pasta|nuts|seeds|powder|granules|tablets|capsules|pills)\b/i,
      /\b(kg|kilogram|pound|lb|ounce|oz|gram|g)\b/i,
    ],
    units: [
      { unit: 'g', confidence: 0.9, reason: 'Most food items are sold by weight' },
      { unit: 'kg', confidence: 0.7, reason: 'Bulk food items often sold in kilograms' },
    ],
  },
  
  // Volume-based items (liquids, etc.)
  volume: {
    patterns: [
      /\b(milk|juice|water|oil|vinegar|sauce|syrup|honey|wine|beer|soda|drink|liquid|fluid|cream|yogurt|soup|broth)\b/i,
      /\b(liter|litre|l|ml|milliliter|gallon|gal|fl oz|fluid ounce|cup|pint|quart)\b/i,
    ],
    units: [
      { unit: 'ml', confidence: 0.9, reason: 'Most liquid items are sold by volume' },
      { unit: 'L', confidence: 0.6, reason: 'Larger liquid containers often in liters' },
    ],
  },
  
  // Count-based items (discrete items)
  count: {
    patterns: [
      /\b(bread|loaf|roll|bagel|muffin|donut|egg|eggs|banana|apple|orange|onion|potato|tomato|pepper|carrot|piece|item|unit|pack|package|box|bottle|can|jar|tube|stick|bar|tablet|pill|capsule)\b/i,
      /\b(count|each|piece|unit|dozen|pack|box|bottle|can|jar)\b/i,
    ],
    units: [
      { unit: 'unit', confidence: 0.8, reason: 'Discrete items typically sold by count' },
      { unit: 'piece', confidence: 0.7, reason: 'Alternative count unit for individual items' },
      { unit: 'dozen', confidence: 0.5, reason: 'Some items sold by dozen' },
    ],
  },
  
  // Length-based items (fabric, rope, etc.)
  length: {
    patterns: [
      /\b(rope|string|wire|cable|fabric|cloth|ribbon|tape|hose|pipe|tube|length|meter|metre|foot|inch|yard)\b/i,
      /\b(m|cm|mm|ft|in|inch|yard|yd)\b/i,
    ],
    units: [
      { unit: 'm', confidence: 0.8, reason: 'Length items typically sold by meter' },
      { unit: 'cm', confidence: 0.6, reason: 'Shorter length items in centimeters' },
    ],
  },
  
  // Area-based items (flooring, fabric, etc.)
  area: {
    patterns: [
      /\b(carpet|flooring|tile|fabric|cloth|wallpaper|sheet|area|square|sq)\b/i,
      /\b(m²|cm²|ft²|in²|square meter|square foot|square inch)\b/i,
    ],
    units: [
      { unit: 'm²', confidence: 0.8, reason: 'Area items typically sold by square meter' },
      { unit: 'ft²', confidence: 0.6, reason: 'Alternative area unit' },
    ],
  },
};

// Category-based mappings
const CATEGORY_MAPPINGS: Record<string, UnitSuggestion[]> = {
  'food': [
    { unit: 'g', dimension: 'mass', confidence: 0.8, reason: 'Food items typically sold by weight' },
    { unit: 'ml', dimension: 'volume', confidence: 0.6, reason: 'Liquid food items by volume' },
    { unit: 'unit', dimension: 'count', confidence: 0.5, reason: 'Some food items by count' },
  ],
  'beverage': [
    { unit: 'ml', dimension: 'volume', confidence: 0.9, reason: 'Beverages sold by volume' },
    { unit: 'L', dimension: 'volume', confidence: 0.7, reason: 'Large beverages in liters' },
  ],
  'cleaning': [
    { unit: 'ml', dimension: 'volume', confidence: 0.8, reason: 'Cleaning products by volume' },
    { unit: 'g', dimension: 'mass', confidence: 0.6, reason: 'Powder cleaning products by weight' },
  ],
  'pool': [
    { unit: 'g', dimension: 'mass', confidence: 0.8, reason: 'Pool chemicals typically by weight' },
    { unit: 'ml', dimension: 'volume', confidence: 0.6, reason: 'Liquid pool chemicals by volume' },
  ],
  'spa': [
    { unit: 'g', dimension: 'mass', confidence: 0.8, reason: 'Spa chemicals typically by weight' },
    { unit: 'ml', dimension: 'volume', confidence: 0.6, reason: 'Liquid spa chemicals by volume' },
  ],
  'grocery': [
    { unit: 'g', dimension: 'mass', confidence: 0.7, reason: 'Grocery items often by weight' },
    { unit: 'unit', dimension: 'count', confidence: 0.6, reason: 'Many grocery items by count' },
    { unit: 'ml', dimension: 'volume', confidence: 0.5, reason: 'Liquid grocery items by volume' },
  ],
};

/**
 * Get smart unit suggestions based on item context
 */
export function getSmartUnitSuggestions(context: SmartUnitContext): UnitSuggestion[] {
  const suggestions: UnitSuggestion[] = [];
  const searchText = `${context.itemName} ${context.category || ''}`.toLowerCase();
  
  // If we already have a canonical unit, prioritize it
  if (context.existingCanonicalUnit) {
    const dimension = getDimensionFromUnit(context.existingCanonicalUnit);
    if (dimension) {
      suggestions.push({
        unit: context.existingCanonicalUnit,
        dimension,
        confidence: 1.0,
        reason: 'Based on existing item configuration',
      });
    }
  }
  
  // Check category-based mappings first
  if (context.category) {
    const categorySuggestions = CATEGORY_MAPPINGS[context.category.toLowerCase()];
    if (categorySuggestions) {
      suggestions.push(...categorySuggestions);
    }
  }
  
  // Check pattern-based mappings
  for (const [dimension, config] of Object.entries(ITEM_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(searchText)) {
        suggestions.push(...config.units.map(u => ({
          ...u,
          dimension: dimension as CanonicalDimension,
        })));
        break; // Only match first pattern per dimension
      }
    }
  }
  
  // Remove duplicates and sort by confidence
  const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
    index === self.findIndex(s => s.unit === suggestion.unit)
  );
  
  return uniqueSuggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get the most likely unit for an item
 */
export function getMostLikelyUnit(context: SmartUnitContext): string | null {
  const suggestions = getSmartUnitSuggestions(context);
  return suggestions.length > 0 ? suggestions[0].unit : null;
}

/**
 * Get dimension from unit (helper function)
 */
function getDimensionFromUnit(unit: string): CanonicalDimension | null {
  const unitDimensionMap: Record<string, CanonicalDimension> = {
    'g': 'mass', 'kg': 'mass', 'lb': 'mass', 'oz': 'mass',
    'ml': 'volume', 'L': 'volume', 'gal': 'volume', 'fl oz': 'volume',
    'unit': 'count', 'piece': 'count', 'dozen': 'count', 'pack': 'count',
    'm': 'length', 'cm': 'length', 'ft': 'length', 'in': 'length',
    'm²': 'area', 'cm²': 'area', 'ft²': 'area', 'in²': 'area',
  };
  
  return unitDimensionMap[unit] || null;
}

/**
 * Get unit suggestions for a specific dimension
 */
export function getUnitSuggestionsForDimension(dimension: CanonicalDimension): string[] {
  const dimensionUnits: Record<CanonicalDimension, string[]> = {
    mass: ['g', 'kg', 'lb', 'oz'],
    volume: ['ml', 'L', 'gal', 'fl oz'],
    count: ['unit', 'piece', 'dozen', 'pack'],
    length: ['m', 'cm', 'ft', 'in'],
    area: ['m²', 'cm²', 'ft²', 'in²'],
  };
  
  return dimensionUnits[dimension] || [];
}
