import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Linking,
  Alert,
} from 'react-native';
import { colors } from '../../constants/colors';
import { ComparisonResult } from '../../storage/comparison/types';
import { InventoryItem } from '../../storage/types';
import {
  shouldShowShelfLifeWarning,
  getShelfLifeWarningSeverity,
} from '../../storage/utils/shelf-life-warnings';

export interface ComparisonItemCardProps {
  /** The comparison result containing offer and metadata */
  comparisonResult: ComparisonResult;

  /** The inventory item for shelf-life warning analysis */
  inventoryItem?: InventoryItem;

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

  /** Show price trend information */
  showPriceTrend?: boolean;

  /** The canonical unit for price display */
  canonicalUnit?: string;

  /** Test ID for testing */
  testID?: string;
}

export const ComparisonItemCard: React.FC<ComparisonItemCardProps> = ({
  comparisonResult,
  inventoryItem,
  isBestOffer = false,
  isTiedForBest = false,
  onPress,
  onLongPress,
  containerStyle,
  showComparisonDetails = false,
  showPriceTrend = true,
  canonicalUnit,
  testID,
}) => {
  const { offer, metadata } = comparisonResult;

  // Determine the highlight variant
  const getHighlightVariant = (): 'best' | 'tied' | 'normal' => {
    if (isBestOffer && !isTiedForBest) return 'best';
    if (isTiedForBest) return 'tied';
    return 'normal';
  };

  const highlightVariant = getHighlightVariant();

  // Format price information
  const formatPrice = (price: number, currency: string = 'CAD'): string => {
    if (typeof price !== 'number' || isNaN(price)) {
      return `${currency} 0.00`;
    }

    // Handle very small numbers that would round to 0.00
    if (price < 0.01 && price > 0) {
      // For prices less than 1 cent, show more decimal places
      return `${currency} ${price.toFixed(6)}`;
    }

    return `${currency} ${price.toFixed(2)}`;
  };

  // Format amount with unit
  const formatAmount = (amount: number, unit: string): string => {
    return `${amount} ${unit}`;
  };

  // Handle supplier URL tap
  const handleSupplierUrlPress = async () => {
    if (offer.supplierUrl) {
      try {
        const supported = await Linking.canOpenURL(offer.supplierUrl);
        if (supported) {
          await Linking.openURL(offer.supplierUrl);
        } else {
          Alert.alert('Error', 'Cannot open this URL');
        }
      } catch {
        Alert.alert('Error', 'Failed to open supplier URL');
      }
    }
  };

  // Get trend indicator
  const getTrendIndicator = () => {
    if (!showPriceTrend || !metadata?.trend) return null;

    const { direction } = metadata.trend;
    const trendEmoji =
      direction === 'up' ? '📈' : direction === 'down' ? '📉' : '➡️';
    const trendColor =
      direction === 'up'
        ? colors.error
        : direction === 'down'
          ? colors.success
          : colors.grayText;

    return (
      <View style={styles.trendContainer}>
        <Text style={styles.trendEmoji}>{trendEmoji}</Text>
        <Text style={[styles.trendText, { color: trendColor }]}>
          {direction === 'up'
            ? 'Rising'
            : direction === 'down'
              ? 'Falling'
              : 'Stable'}
        </Text>
      </View>
    );
  };

  // Get confidence indicator
  const getConfidenceIndicator = () => {
    if (!metadata?.confidence) return null;

    const confidence = metadata.confidence;
    const confidenceColor =
      confidence >= 0.8
        ? colors.success
        : confidence >= 0.6
          ? colors.warning
          : colors.error;
    const confidenceText =
      confidence >= 0.8 ? 'High' : confidence >= 0.6 ? 'Medium' : 'Low';

    return (
      <View style={styles.confidenceContainer}>
        <View
          style={[styles.confidenceDot, { backgroundColor: confidenceColor }]}
        />
        <Text style={[styles.confidenceText, { color: confidenceColor }]}>
          {confidenceText} Confidence
        </Text>
      </View>
    );
  };

  // Get shelf-life warning indicator
  const getShelfLifeWarning = () => {
    if (!inventoryItem) return null;

    const shouldWarn = shouldShowShelfLifeWarning(inventoryItem, offer);
    if (!shouldWarn) return null;

    const severity = getShelfLifeWarningSeverity(inventoryItem, offer);
    // const message = getShelfLifeWarningMessage(inventoryItem, offer.amount);

    const warningColor =
      severity === 'high'
        ? colors.error
        : severity === 'warning'
          ? colors.warning
          : colors.primary;

    const warningIcon =
      severity === 'high' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';

    return (
      <View style={styles.shelfLifeWarningContainer}>
        <Text style={styles.shelfLifeWarningIcon}>{warningIcon}</Text>
        <Text style={[styles.shelfLifeWarningText, { color: warningColor }]}>
          Shelf-life sensitive
        </Text>
      </View>
    );
  };

  // Get flags as chips
  const getFlagChips = () => {
    if (!metadata?.flags || metadata.flags.length === 0) return [];

    return metadata.flags.map((flag, index) => {
      let chipVariant: 'primary' | 'secondary' | 'warning' | 'success' =
        'secondary';
      if (flag.includes('best') || flag.includes('lowest')) {
        chipVariant = 'success';
      } else if (flag.includes('warning') || flag.includes('high')) {
        chipVariant = 'warning';
      }

      return (
        <View key={index} style={[styles.flagChip, getChipStyle(chipVariant)]}>
          <Text style={[styles.flagChipText, getChipTextStyle(chipVariant)]}>
            {flag}
          </Text>
        </View>
      );
    });
  };

  const getChipStyle = (variant: string) => {
    switch (variant) {
      case 'success':
        return styles.chipSuccess;
      case 'warning':
        return styles.chipWarning;
      case 'primary':
        return styles.chipPrimary;
      default:
        return styles.chipSecondary;
    }
  };

  const getChipTextStyle = (variant: string) => {
    switch (variant) {
      case 'success':
        return styles.chipTextSuccess;
      case 'warning':
        return styles.chipTextWarning;
      case 'primary':
        return styles.chipTextPrimary;
      default:
        return styles.chipTextSecondary;
    }
  };

  const getContainerStyle = (variant: string) => {
    switch (variant) {
      case 'best':
        return styles.containerBest;
      case 'tied':
        return styles.containerTied;
      default:
        return styles.containerNormal;
    }
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
            {offer.sourceType === 'manual'
              ? '✋ Manual'
              : offer.sourceType === 'url'
                ? '🌐 URL'
                : offer.sourceType === 'ocr'
                  ? '📷 OCR'
                  : '🔗 API'}
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

      {/* Price per canonical unit - prominently displayed */}
      <View style={styles.pricePerUnitRow}>
        <Text style={styles.pricePerUnitLabel}>
          Price per {canonicalUnit || offer.amountUnit}:
        </Text>
        <Text
          style={[
            styles.pricePerUnitValue,
            isBestOffer ? styles.pricePerUnitValueBest : undefined,
          ]}
        >
          {formatPrice(
            offer.effectivePricePerCanonical ||
              offer.pricePerCanonicalInclShipping ||
              offer.pricePerCanonicalExclShipping ||
              offer.totalPrice / offer.amount,
            offer.currency
          )}
        </Text>
      </View>

      {/* Comparison score */}
      {showComparisonDetails && (
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>Comparison Score:</Text>
          <Text style={styles.scoreValue}>
            {comparisonResult.score.toFixed(2)}
          </Text>
        </View>
      )}

      {/* Trend and confidence indicators */}
      <View style={styles.indicatorsRow}>
        {getTrendIndicator()}
        {getConfidenceIndicator()}
        {getShelfLifeWarning()}
      </View>

      {/* Flags */}
      {chips.length > 0 && <View style={styles.flagsContainer}>{chips}</View>}

      {/* Supplier URL */}
      {offer.supplierUrl && (
        <TouchableOpacity
          style={styles.urlButton}
          onPress={handleSupplierUrlPress}
          testID={`${testID}-supplier-url`}
        >
          <Text style={styles.urlButtonText}>🌐 Open Supplier Page</Text>
        </TouchableOpacity>
      )}

      {/* Explanation */}
      {showComparisonDetails && metadata?.explanation && (
        <Text style={styles.explanation} numberOfLines={3}>
          {metadata.explanation}
        </Text>
      )}
    </View>
  );

  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  containerBest: {
    borderWidth: 2,
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  containerTied: {
    borderWidth: 2,
    borderColor: colors.warning,
    backgroundColor: colors.warningLight,
  },
  containerNormal: {
    borderWidth: 1,
    borderColor: colors.lightGray,
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
    marginRight: 12,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 4,
  },
  sourceType: {
    fontSize: 12,
    color: colors.grayText,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: '700',
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
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.lightBackground,
    borderRadius: 8,
  },
  pricePerUnitLabel: {
    fontSize: 14,
    color: colors.grayText,
    fontWeight: '500',
  },
  pricePerUnitValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.darkText,
  },
  pricePerUnitValueBest: {
    color: colors.success,
    fontSize: 18,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 12,
    color: colors.grayText,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkText,
  },
  indicatorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  shelfLifeWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shelfLifeWarningIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  shelfLifeWarningText: {
    fontSize: 12,
    fontWeight: '500',
  },
  flagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  flagChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  chipPrimary: {
    backgroundColor: colors.primary,
  },
  chipSecondary: {
    backgroundColor: colors.lightGray,
  },
  chipSuccess: {
    backgroundColor: colors.success,
  },
  chipWarning: {
    backgroundColor: colors.warning,
  },
  flagChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  chipTextPrimary: {
    color: colors.white,
  },
  chipTextSecondary: {
    color: colors.darkText,
  },
  chipTextSuccess: {
    color: colors.white,
  },
  chipTextWarning: {
    color: colors.white,
  },
  urlButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  urlButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  explanation: {
    fontSize: 12,
    color: colors.grayText,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 16,
  },
});
