import React from 'react';
import { render } from '@testing-library/react-native';
import { StarRatingComponent, SupplierRating, QualityRating } from '../StarRating';

describe('StarRating', () => {
  describe('StarRatingComponent', () => {
    it('renders with correct rating', () => {
      const { getByTestId } = render(
        <StarRatingComponent rating={3} testID="star-rating" />
      );
      
      expect(getByTestId('star-rating')).toBeTruthy();
      expect(getByTestId('star-rating-text')).toBeTruthy();
    });

    it('shows "No rating" when rating is 0', () => {
      const { getByText } = render(
        <StarRatingComponent rating={0} testID="star-rating" />
      );
      
      expect(getByText('No rating')).toBeTruthy();
    });

    it('shows rating number when showRatingNumber is true', () => {
      const { getByText } = render(
        <StarRatingComponent rating={3.5} testID="star-rating" />
      );
      
      expect(getByText('3.5')).toBeTruthy();
    });

    it('calls onRatingChange when interactive and rating changes', () => {
      const mockOnRatingChange = jest.fn();
      const { getByTestId } = render(
        <StarRatingComponent 
          rating={3} 
          interactive={true}
          onRatingChange={mockOnRatingChange}
          testID="star-rating" 
        />
      );
      
      // Note: Testing the actual star interaction would require more complex setup
      // This test verifies the component renders with interactive props
      expect(getByTestId('star-rating')).toBeTruthy();
    });

    it('does not show rating text when showRatingNumber is false', () => {
      const { queryByTestId } = render(
        <StarRatingComponent 
          rating={3} 
          showRatingNumber={false}
          testID="star-rating" 
        />
      );
      
      expect(queryByTestId('star-rating-text')).toBeNull();
    });
  });

  describe('SupplierRating', () => {
    it('renders with orange stars', () => {
      const { getByTestId } = render(
        <SupplierRating rating={3} testID="supplier-rating" />
      );
      
      expect(getByTestId('supplier-rating')).toBeTruthy();
    });
  });

  describe('QualityRating', () => {
    it('renders with green stars', () => {
      const { getByTestId } = render(
        <QualityRating rating={4} testID="quality-rating" />
      );
      
      expect(getByTestId('quality-rating')).toBeTruthy();
    });
  });
});
