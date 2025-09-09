import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import StarRating from 'react-native-star-rating-widget';
import { colors } from '../../constants/colors';

export interface StarRatingProps {
  /** Current rating value (0-5) */
  rating: number;
  
  /** Whether the rating can be changed by user interaction */
  interactive?: boolean;
  
  /** Callback when rating changes (only used when interactive=true) */
  onRatingChange?: (rating: number) => void;
  
  /** Size of the stars */
  starSize?: number;
  
  /** Color of filled stars */
  starColor?: string;
  
  /** Color of empty stars */
  emptyStarColor?: string;
  
  /** Whether to show the rating number next to stars */
  showRatingNumber?: boolean;
  
  /** Custom text to show instead of rating number */
  ratingText?: string;
  
  /** Whether to show "No rating" when rating is 0 */
  showNoRating?: boolean;
  
  /** Custom container style */
  containerStyle?: ViewStyle;
  
  /** Custom text style for rating number/text */
  textStyle?: TextStyle;
  
  /** Test ID for testing */
  testID?: string;
}

export const StarRatingComponent: React.FC<StarRatingProps> = ({
  rating,
  interactive = false,
  onRatingChange,
  starSize = 20,
  starColor = '#FFD700', // Gold color
  emptyStarColor = '#E0E0E0', // Light gray
  showRatingNumber = true,
  ratingText,
  showNoRating = true,
  containerStyle,
  textStyle,
  testID,
}) => {
  // Handle rating display logic
  const getRatingDisplay = (): string => {
    if (ratingText) return ratingText;
    if (rating === 0 && showNoRating) return 'No rating';
    return rating.toFixed(1);
  };

  // Handle rating change with validation
  const handleRatingChange = (newRating: number) => {
    if (interactive && onRatingChange) {
      // Ensure rating is between 0 and 5
      const clampedRating = Math.max(0, Math.min(5, newRating));
      onRatingChange(clampedRating);
    }
  };

  return (
    <View 
      style={[styles.container, containerStyle]} 
      testID={testID}
      accessibilityRole={interactive ? "adjustable" : "text"}
      accessibilityLabel={`Rating: ${getRatingDisplay()}`}
      accessibilityHint={interactive ? "Double tap to change rating" : undefined}
      accessibilityValue={interactive ? { min: 0, max: 5, now: rating } : undefined}
    >
      <StarRating
        rating={rating}
        onChange={handleRatingChange}
        maxStars={5}
        starSize={starSize}
        color={starColor}
        emptyColor={emptyStarColor}
        enableHalfStar={false}
        enableSwiping={interactive}
        starStyle={styles.star}
        testID={`${testID}-stars`}
      />
      
      {(showRatingNumber || ratingText) && (
        <Text 
          style={[styles.ratingText, textStyle]} 
          testID={`${testID}-text`}
          accessibilityRole="text"
        >
          {getRatingDisplay()}
        </Text>
      )}
    </View>
  );
};

// Convenience components for common use cases
export const SupplierRating: React.FC<Omit<StarRatingProps, 'starColor' | 'emptyStarColor'>> = (props) => (
  <StarRatingComponent
    {...props}
    starColor="#FF9500" // Orange color for supplier ratings
    emptyStarColor="#E0E0E0"
    showNoRating={true}
  />
);

export const QualityRating: React.FC<Omit<StarRatingProps, 'starColor' | 'emptyStarColor'>> = (props) => (
  <StarRatingComponent
    {...props}
    starColor="#34C759" // Green color for quality ratings
    emptyStarColor="#E0E0E0"
    showNoRating={true}
  />
);

// Read-only display component
export const StarRatingDisplay: React.FC<Omit<StarRatingProps, 'interactive' | 'onRatingChange'>> = (props) => (
  <StarRatingComponent
    {...props}
    interactive={false}
  />
);

// Interactive rating component
export const StarRatingInput: React.FC<Omit<StarRatingProps, 'interactive'>> = (props) => (
  <StarRatingComponent
    {...props}
    interactive={true}
  />
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  star: {
    marginHorizontal: 2, // Increased spacing between stars for better touch targets
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.grayText,
    marginLeft: 4,
  },
});

// Export the main component as default
export default StarRatingComponent;
