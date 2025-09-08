import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../constants/colors';

export interface BestOfferBadgeProps {
  /** Whether this is the best offer */
  isBestOffer: boolean;

  /** Whether this offer is tied for best */
  isTiedForBest?: boolean;

  /** Custom badge text */
  customText?: string;

  /** Badge variant */
  variant?: 'best' | 'tied' | 'savings' | 'custom';

  /** Size variant */
  size?: 'small' | 'medium' | 'large';

  /** Position of the badge */
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'inline';

  /** Custom container style */
  containerStyle?: ViewStyle;

  /** Custom text style */
  textStyle?: TextStyle;

  /** Test ID for testing */
  testID?: string;
}

export const BestOfferBadge: React.FC<BestOfferBadgeProps> = ({
  isBestOffer,
  isTiedForBest = false,
  customText,
  variant,
  size = 'medium',
  position = 'top-right',
  containerStyle,
  textStyle,
  testID,
}) => {
  // Don't render if not a best offer
  if (!isBestOffer) {
    return null;
  }

  // Determine variant
  const getVariant = (): 'best' | 'tied' | 'savings' | 'custom' => {
    if (variant) return variant;
    if (isTiedForBest) return 'tied';
    return 'best';
  };

  const badgeVariant = getVariant();

  // Get badge content
  const getBadgeContent = () => {
    if (customText) {
      return customText;
    }

    switch (badgeVariant) {
      case 'best':
        return '🏆 Best Offer';
      case 'tied':
        return '🏆 Tied for Best';
      case 'savings':
        return '💰 Best Value';
      default:
        return '🏆 Best Offer';
    }
  };

  // Get badge styles
  const getBadgeStyles = () => {
    const baseStyles = {
      container: styles.container,
      text: styles.text,
    };

    // Size variants
    switch (size) {
      case 'small':
        baseStyles.container = [baseStyles.container, styles.containerSmall];
        baseStyles.text = [baseStyles.text, styles.textSmall];
        break;
      case 'large':
        baseStyles.container = [baseStyles.container, styles.containerLarge];
        baseStyles.text = [baseStyles.text, styles.textLarge];
        break;
      default:
        baseStyles.container = [baseStyles.container, styles.containerMedium];
        baseStyles.text = [baseStyles.text, styles.textMedium];
    }

    // Variant styles
    switch (badgeVariant) {
      case 'best':
        baseStyles.container = [baseStyles.container, styles.containerBest];
        baseStyles.text = [baseStyles.text, styles.textBest];
        break;
      case 'tied':
        baseStyles.container = [baseStyles.container, styles.containerTied];
        baseStyles.text = [baseStyles.text, styles.textTied];
        break;
      case 'savings':
        baseStyles.container = [baseStyles.container, styles.containerSavings];
        baseStyles.text = [baseStyles.text, styles.textSavings];
        break;
      case 'custom':
        baseStyles.container = [baseStyles.container, styles.containerCustom];
        baseStyles.text = [baseStyles.text, styles.textCustom];
        break;
    }

    // Position styles
    switch (position) {
      case 'top-left':
        baseStyles.container = [baseStyles.container, styles.positionTopLeft];
        break;
      case 'top-right':
        baseStyles.container = [baseStyles.container, styles.positionTopRight];
        break;
      case 'bottom-left':
        baseStyles.container = [
          baseStyles.container,
          styles.positionBottomLeft,
        ];
        break;
      case 'bottom-right':
        baseStyles.container = [
          baseStyles.container,
          styles.positionBottomRight,
        ];
        break;
      case 'inline':
        baseStyles.container = [baseStyles.container, styles.positionInline];
        break;
    }

    return baseStyles;
  };

  const badgeStyles = getBadgeStyles();
  const badgeContent = getBadgeContent();

  return (
    <View style={[badgeStyles.container, containerStyle]} testID={testID}>
      <Text style={[badgeStyles.text, textStyle]}>{badgeContent}</Text>
    </View>
  );
};

// Standalone badge component for use outside of cards
export interface StandaloneBestOfferBadgeProps
  extends Omit<BestOfferBadgeProps, 'position'> {
  /** Show savings amount */
  savingsAmount?: number;

  /** Currency for savings display */
  currency?: string;

  /** Show percentage savings */
  savingsPercentage?: number;
}

export const StandaloneBestOfferBadge: React.FC<
  StandaloneBestOfferBadgeProps
> = ({
  isBestOffer,
  isTiedForBest = false,
  savingsAmount,
  savingsPercentage,
  currency = 'CAD',
  size = 'medium',
  containerStyle,
  textStyle,
  testID,
}) => {
  if (!isBestOffer) {
    return null;
  }

  const formatPrice = (amount: number): string => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return `${currency} 0.00`;
    }
    return `${currency} ${amount.toFixed(2)}`;
  };

  const getBadgeText = () => {
    if (savingsAmount && savingsPercentage) {
      return `🏆 Best Offer • Save ${formatPrice(savingsAmount)} (${savingsPercentage.toFixed(0)}%)`;
    } else if (savingsAmount) {
      return `🏆 Best Offer • Save ${formatPrice(savingsAmount)}`;
    } else if (savingsPercentage) {
      return `🏆 Best Offer • Save ${savingsPercentage.toFixed(0)}%`;
    } else if (isTiedForBest) {
      return '🏆 Tied for Best Offer';
    } else {
      return '🏆 Best Offer';
    }
  };

  const getBadgeStyles = () => {
    const baseStyles = {
      container: styles.standaloneContainer,
      text: styles.standaloneText,
    };

    // Size variants
    switch (size) {
      case 'small':
        baseStyles.container = [
          baseStyles.container,
          styles.standaloneContainerSmall,
        ];
        baseStyles.text = [baseStyles.text, styles.standaloneTextSmall];
        break;
      case 'large':
        baseStyles.container = [
          baseStyles.container,
          styles.standaloneContainerLarge,
        ];
        baseStyles.text = [baseStyles.text, styles.standaloneTextLarge];
        break;
      default:
        baseStyles.container = [
          baseStyles.container,
          styles.standaloneContainerMedium,
        ];
        baseStyles.text = [baseStyles.text, styles.standaloneTextMedium];
    }

    // Variant based on savings
    if (savingsAmount || savingsPercentage) {
      baseStyles.container = [
        baseStyles.container,
        styles.standaloneContainerSavings,
      ];
      baseStyles.text = [baseStyles.text, styles.standaloneTextSavings];
    } else if (isTiedForBest) {
      baseStyles.container = [
        baseStyles.container,
        styles.standaloneContainerTied,
      ];
      baseStyles.text = [baseStyles.text, styles.standaloneTextTied];
    } else {
      baseStyles.container = [
        baseStyles.container,
        styles.standaloneContainerBest,
      ];
      baseStyles.text = [baseStyles.text, styles.standaloneTextBest];
    }

    return baseStyles;
  };

  const badgeStyles = getBadgeStyles();
  const badgeText = getBadgeText();

  return (
    <View style={[badgeStyles.container, containerStyle]} testID={testID}>
      <Text style={[badgeStyles.text, textStyle]}>{badgeText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Base badge styles
  container: {
    position: 'absolute',
    zIndex: 10,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    color: colors.white,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Size variants
  containerSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  containerMedium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  containerLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 12,
  },
  textLarge: {
    fontSize: 14,
  },

  // Variant styles
  containerBest: {
    backgroundColor: colors.success,
  },
  containerTied: {
    backgroundColor: colors.warning,
  },
  containerSavings: {
    backgroundColor: colors.primary,
  },
  containerCustom: {
    backgroundColor: colors.grayText,
  },
  textBest: {
    color: colors.white,
  },
  textTied: {
    color: colors.white,
  },
  textSavings: {
    color: colors.white,
  },
  textCustom: {
    color: colors.white,
  },

  // Position styles
  positionTopLeft: {
    top: -8,
    left: 16,
  },
  positionTopRight: {
    top: -8,
    right: 16,
  },
  positionBottomLeft: {
    bottom: -8,
    left: 16,
  },
  positionBottomRight: {
    bottom: -8,
    right: 16,
  },
  positionInline: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },

  // Standalone badge styles
  standaloneContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  standaloneContainerSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  standaloneContainerMedium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  standaloneContainerLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  standaloneText: {
    color: colors.white,
    fontWeight: '600',
    textAlign: 'center',
  },
  standaloneTextSmall: {
    fontSize: 11,
  },
  standaloneTextMedium: {
    fontSize: 13,
  },
  standaloneTextLarge: {
    fontSize: 15,
  },
  standaloneContainerBest: {
    backgroundColor: colors.success,
  },
  standaloneContainerTied: {
    backgroundColor: colors.warning,
  },
  standaloneContainerSavings: {
    backgroundColor: colors.primary,
  },
  standaloneTextBest: {
    color: colors.white,
  },
  standaloneTextTied: {
    color: colors.white,
  },
  standaloneTextSavings: {
    color: colors.white,
  },
});
