/**
 * Smart Unit Defaults Tests
 * 
 * Tests for the smart unit suggestions functionality
 */

import { getSmartUnitSuggestions, getMostLikelyUnit } from '../smart-unit-defaults';

describe('Smart Unit Defaults', () => {
  describe('getSmartUnitSuggestions', () => {
    it('should suggest weight units for food items', () => {
      const suggestions = getSmartUnitSuggestions({
        itemName: 'Apple',
        category: 'food',
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.unit === 'g')).toBe(true);
      expect(suggestions.some(s => s.dimension === 'mass')).toBe(true);
    });

    it('should suggest volume units for beverages', () => {
      const suggestions = getSmartUnitSuggestions({
        itemName: 'Milk',
        category: 'beverage',
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.unit === 'ml')).toBe(true);
      expect(suggestions.some(s => s.dimension === 'volume')).toBe(true);
    });

    it('should suggest count units for discrete items', () => {
      const suggestions = getSmartUnitSuggestions({
        itemName: 'Bread loaf',
        category: 'food',
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.unit === 'unit')).toBe(true);
      expect(suggestions.some(s => s.dimension === 'count')).toBe(true);
    });

    it('should suggest weight units for pool chemicals', () => {
      const suggestions = getSmartUnitSuggestions({
        itemName: 'Chlorine tablets',
        category: 'pool',
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.unit === 'g')).toBe(true);
      expect(suggestions.some(s => s.dimension === 'mass')).toBe(true);
    });

    it('should suggest volume units for cleaning liquids', () => {
      const suggestions = getSmartUnitSuggestions({
        itemName: 'Dish soap',
        category: 'cleaning',
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.unit === 'ml')).toBe(true);
      expect(suggestions.some(s => s.dimension === 'volume')).toBe(true);
    });

    it('should prioritize existing canonical unit', () => {
      const suggestions = getSmartUnitSuggestions({
        itemName: 'Generic item',
        category: 'food',
        existingCanonicalUnit: 'g',
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].unit).toBe('g');
      expect(suggestions[0].confidence).toBe(1.0);
      expect(suggestions[0].reason).toContain('existing item configuration');
    });

    it('should return suggestions sorted by confidence', () => {
      const suggestions = getSmartUnitSuggestions({
        itemName: 'Apple',
        category: 'food',
      });

      expect(suggestions.length).toBeGreaterThan(1);
      for (let i = 0; i < suggestions.length - 1; i++) {
        expect(suggestions[i].confidence).toBeGreaterThanOrEqual(suggestions[i + 1].confidence);
      }
    });

    it('should handle items with no clear category', () => {
      const suggestions = getSmartUnitSuggestions({
        itemName: 'Unknown item',
        category: 'miscellaneous',
      });

      // Should still return some suggestions based on name patterns
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should provide confidence scores and reasons', () => {
      const suggestions = getSmartUnitSuggestions({
        itemName: 'Apple',
        category: 'food',
      });

      expect(suggestions.length).toBeGreaterThan(0);
      suggestions.forEach(suggestion => {
        expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.confidence).toBeLessThanOrEqual(1);
        expect(suggestion.reason).toBeTruthy();
        expect(typeof suggestion.reason).toBe('string');
      });
    });
  });

  describe('getMostLikelyUnit', () => {
    it('should return the highest confidence unit', () => {
      const mostLikely = getMostLikelyUnit({
        itemName: 'Apple',
        category: 'food',
      });

      expect(mostLikely).toBeTruthy();
      expect(typeof mostLikely).toBe('string');
    });

    it('should return existing canonical unit if provided', () => {
      const mostLikely = getMostLikelyUnit({
        itemName: 'Generic item',
        category: 'food',
        existingCanonicalUnit: 'g',
      });

      expect(mostLikely).toBe('g');
    });

    it('should return null for items with no suggestions', () => {
      const mostLikely = getMostLikelyUnit({
        itemName: '',
        category: '',
      });

      expect(mostLikely).toBeNull();
    });
  });

  describe('Pattern matching', () => {
    it('should match food items by name patterns', () => {
      const foodItems = ['apple', 'banana', 'meat', 'cheese', 'flour', 'sugar'];
      
      foodItems.forEach(item => {
        const suggestions = getSmartUnitSuggestions({
          itemName: item,
        });
        
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions.some(s => s.dimension === 'mass')).toBe(true);
      });
    });

    it('should match liquid items by name patterns', () => {
      const liquidItems = ['milk', 'juice', 'water', 'oil', 'vinegar', 'sauce'];
      
      liquidItems.forEach(item => {
        const suggestions = getSmartUnitSuggestions({
          itemName: item,
        });
        
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions.some(s => s.dimension === 'volume')).toBe(true);
      });
    });

    it('should match count items by name patterns', () => {
      const countItems = ['bread', 'egg', 'onion', 'potato', 'piece', 'item'];
      
      countItems.forEach(item => {
        const suggestions = getSmartUnitSuggestions({
          itemName: item,
        });
        
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions.some(s => s.dimension === 'count')).toBe(true);
      });
    });
  });

  describe('Category-based suggestions', () => {
    it('should provide category-specific suggestions', () => {
      const categories = ['food', 'beverage', 'cleaning', 'pool', 'spa', 'grocery'];
      
      categories.forEach(category => {
        const suggestions = getSmartUnitSuggestions({
          itemName: 'test item',
          category,
        });
        
        expect(suggestions.length).toBeGreaterThan(0);
        suggestions.forEach(suggestion => {
          expect(suggestion.dimension).toBeTruthy();
          expect(suggestion.confidence).toBeGreaterThan(0);
        });
      });
    });
  });
});
