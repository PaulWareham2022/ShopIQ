import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors } from '../../constants/colors';
import { Offer, ComparisonResult } from '../../storage/types';

export interface OfferCardProps {
  /** The offer to display */
  offer: Offer;

  /** Comparison result if available */
  comparisonResult?: ComparisonResult;

  /** Whether this is the best offer */
  isBestOffer?: boolean;

  /** Whether this offer is tied for best */
  isTiedForBest?: boolean;

  /** Callback when offer is pressed */
  onPress?: () => void;

  /** Callback when offer is long pressed */
  onLongPress?: () => void;

  /** Custom container style */
  containerStyle?: ViewStyle;

  /** Show detailed comparison information */
  showComparisonDetails?: boolean;

  /** Show price breakdown */
  showPriceBreakdown?: boolean;

  /** Test ID for testing */
  testID?: string;
}

export const OfferCard: React.FC<OfferCardProps> = ({
  offer,
  comparisonResult,
  isBestOffer = false,
  isTiedForBest = false,
  onPress,
  onLongPress,
  containerStyle,
  showComparisonDetails = false,
  showPriceBreakdown = false,
  testID,
}) => {
  // Determine the highlight variant
  const getHighlightVariant = (): 'best' | 'tied' | 'normal' => {
    if (isBestOffer && !isTiedForBest) return 'best';
    if (isTiedForBest) return 'tied';
    return 'normal';
  };

  const highlightVariant = getHighlightVariant();

  // Format price information
  const formatPrice = (price: number, currency: string = 'USD'): string => {
    // Handle edge case where price might be NaN or undefined
    if (typeof price !== 'number' || isNaN(price)) {
      return `${currency} 0.00`;
    }
    return `${currency} ${price.toFixed(2)}`;
  };

  // Format amount with unit
  const formatAmount = (amount: number, unit: string): string => {
    return `${amount} ${unit}`;
  };

  // Get confidence level color
  const getConfidenceColor = (confidence?: number): string => {
    if (!confidence) return colors.grayText;
    if (confidence >= 0.8) return colors.success;
    if (confidence >= 0.6) return colors.warning;
    return colors.error;
  };

  // Get flags as chips
  const getFlagChips = (): Array<{
    label: string;
    variant: 'primary' | 'secondary' | 'warning' | 'success';
  }> => {
    const chips: Array<{
      label: string;
      variant: 'primary' | 'secondary' | 'warning' | 'success';
    }> = [];

    // Add comparison flags
    if (comparisonResult?.metadata?.flags) {
      comparisonResult.metadata.flags.forEach(flag => {
        let variant: 'primary' | 'secondary' | 'warning' | 'success' =
          'secondary';

        if (flag.includes('high-quality')) variant = 'success';
        else if (flag.includes('low-quality')) variant = 'warning';
        else if (flag.includes('shipping-included')) variant = 'primary';
        else if (flag.includes('tax-included')) variant = 'primary';

        chips.push({ label: flag.replace(/-/g, ' '), variant });
      });
    }

    // Add offer-specific flags
    if (offer.shippingIncluded) {
      chips.push({ label: 'Free Shipping', variant: 'success' });
    }

    if (offer.isTaxIncluded) {
      chips.push({ label: 'Tax Included', variant: 'primary' });
    }

    return chips;
  };

  const chips = getFlagChips();

  const content = (
    <View
      style={[
        styles.container,
        containerStyle,
        getContainerStyle(highlightVariant),
      ]}
      testID={testID}
    >
      {/* Best Offer Badge */}
      {isBestOffer && (
        <View
          style={[
            styles.bestOfferBadge,
            isTiedForBest ? styles.tiedBadge : styles.bestBadge,
          ]}
        >
          <Text style={styles.bestOfferBadgeText}>
            {isTiedForBest ? '🏆 Tied for Best' : '🏆 Best Offer'}
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.supplierInfo}>
          <Text style={styles.supplierName}>
            {offer.supplierNameSnapshot ||
              offer.supplierId ||
              'Unknown Supplier'}
          </Text>
          <Text style={styles.sourceType}>
            {offer.sourceType === 'online' ? '🌐 Online' : '🏪 In-Store'}
          </Text>
        </View>

        <View style={styles.priceInfo}>
          <Text style={styles.totalPrice}>
            {formatPrice(offer.totalPrice, offer.currency)}
          </Text>
          <Text style={styles.amount}>
            {formatAmount(offer.amount, offer.amountUnit)}
          </Text>
        </View>
      </View>

      {/* Price per canonical unit */}
      {offer.effectivePricePerCanonical && (
        <View style={styles.pricePerUnitRow}>
          <Text style={styles.pricePerUnitLabel}>
            Price per {offer.amountUnit}:
          </Text>
          <Text style={styles.pricePerUnitValue}>
            {formatPrice(offer.effectivePricePerCanonical, offer.currency)}
          </Text>
        </View>
      )}

      {/* Comparison details */}
      {showComparisonDetails && comparisonResult && (
        <View style={styles.comparisonDetails}>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Score:</Text>
            <Text style={styles.comparisonValue}>
              {comparisonResult.score.toFixed(4)}
            </Text>
          </View>

          {comparisonResult.metadata?.confidence !== undefined && (
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>Confidence:</Text>
              <Text
                style={[
                  styles.comparisonValue,
                  {
                    color: getConfidenceColor(
                      comparisonResult.metadata.confidence
                    ),
                  },
                ]}
              >
                {(comparisonResult.metadata.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          )}

          {comparisonResult.metadata?.explanation && (
            <Text style={styles.explanation}>
              {comparisonResult.metadata.explanation}
            </Text>
          )}
        </View>
      )}

      {/* Price breakdown */}
      {showPriceBreakdown && (
        <View style={styles.priceBreakdown}>
          <Text style={styles.breakdownLabel}>Price Breakdown:</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownItem}>Base Price:</Text>
            <Text style={styles.breakdownValue}>
              {formatPrice(offer.totalPrice, offer.currency)}
            </Text>
          </View>

          {offer.shippingCost && offer.shippingCost > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownItem}>Shipping:</Text>
              <Text style={styles.breakdownValue}>
                {formatPrice(offer.shippingCost, offer.currency)}
              </Text>
            </View>
          )}

          {offer.taxRate && offer.taxRate > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownItem}>
                Tax ({offer.taxRate * 100}%):
              </Text>
              <Text style={styles.breakdownValue}>
                {formatPrice(offer.totalPrice * offer.taxRate, offer.currency)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Flags as chips */}
      {chips.length > 0 && (
        <View style={styles.chipsContainer}>
          {chips.map((chip, index) => {
            const chipVariant = chip.variant || 'primary';
            let chipStyle = styles.chip;
            let chipTextStyle = styles.chipText;

            if (chipVariant === 'primary') {
              chipStyle = [styles.chip, styles.chipPrimary];
              chipTextStyle = [styles.chipText, styles.chipTextPrimary];
            } else if (chipVariant === 'secondary') {
              chipStyle = [styles.chip, styles.chipSecondary];
              chipTextStyle = [styles.chipText, styles.chipTextSecondary];
            } else if (chipVariant === 'warning') {
              chipStyle = [styles.chip, styles.chipWarning];
              chipTextStyle = [styles.chipText, styles.chipTextWarning];
            } else if (chipVariant === 'success') {
              chipStyle = [styles.chip, styles.chipSuccess];
              chipTextStyle = [styles.chipText, styles.chipTextSuccess];
            }

            return (
              <View key={index} style={chipStyle}>
                <Text style={chipTextStyle}>{chip.label}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Observed date */}
      <Text style={styles.observedDate}>
        Observed:{' '}
        {offer.observedAt
          ? new Date(offer.observedAt).toLocaleDateString()
          : 'Unknown date'}
      </Text>
    </View>
  );

  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        style={[styles.touchableContainer, getContainerStyle(highlightVariant)]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        testID={testID}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// Helper function to get container style based on highlight variant
const getContainerStyle = (variant: 'best' | 'tied' | 'normal'): ViewStyle => {
  switch (variant) {
    case 'best':
      return {
        borderColor: colors.success,
        borderWidth: 2,
        backgroundColor: '#F0F9F0',
      };
    case 'tied':
      return {
        borderColor: colors.warning,
        borderWidth: 2,
        backgroundColor: '#FFFBF0',
      };
    default:
      return {
        borderColor: colors.lightGray,
        borderWidth: 1,
        backgroundColor: colors.white,
      };
  }
};

const styles = StyleSheet.create({
  touchableContainer: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  container: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    padding: 20,
    position: 'relative',
  },
  bestOfferBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  bestBadge: {
    backgroundColor: colors.success,
  },
  tiedBadge: {
    backgroundColor: colors.warning,
  },
  bestOfferBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  supplierInfo: {
    flex: 1,
    marginRight: 16,
  },
  supplierName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 4,
  },
  sourceType: {
    fontSize: 14,
    color: colors.grayText,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.darkText,
    marginBottom: 2,
  },
  amount: {
    fontSize: 14,
    color: colors.grayText,
  },
  pricePerUnitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  pricePerUnitLabel: {
    fontSize: 14,
    color: colors.grayText,
    fontWeight: '500',
  },
  pricePerUnitValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkText,
  },
  comparisonDetails: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  comparisonLabel: {
    fontSize: 14,
    color: colors.grayText,
    fontWeight: '500',
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkText,
  },
  explanation: {
    fontSize: 12,
    color: colors.grayText,
    fontStyle: 'italic',
    marginTop: 8,
  },
  priceBreakdown: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownItem: {
    fontSize: 14,
    color: colors.grayText,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.darkText,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  chipPrimary: {
    backgroundColor: '#E5F3FF',
  },
  chipSecondary: {
    backgroundColor: '#F0F0F0',
  },
  chipWarning: {
    backgroundColor: '#FFF4E6',
  },
  chipSuccess: {
    backgroundColor: '#E8F5E8',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextPrimary: {
    color: '#007AFF',
  },
  chipTextSecondary: {
    color: colors.grayText,
  },
  chipTextWarning: {
    color: '#FF9500',
  },
  chipTextSuccess: {
    color: '#198754',
  },
  observedDate: {
    fontSize: 12,
    color: colors.grayText,
    textAlign: 'right',
  },
});
