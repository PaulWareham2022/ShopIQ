import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';

export interface PriceTrendData {
  /** Direction of the trend */
  direction: 'up' | 'down' | 'stable';

  /** Strength of the trend (0-1) */
  strength: number;

  /** Confidence in the trend (0-1) */
  confidence: number;

  /** Optional price statistics */
  statistics?: {
    min: number;
    max: number;
    average: number;
    median: number;
    standardDeviation: number;
    volatility: number;
  };

  /** Best historical price */
  bestHistoricalPrice?: {
    price: number;
    date: string;
    supplier: string;
  };
}

export interface PriceTrendIndicatorProps {
  /** Trend data to display */
  trendData: PriceTrendData;

  /** Currency for price display */
  currency?: string;

  /** Show detailed statistics */
  showStatistics?: boolean;

  /** Show best historical price */
  showBestHistorical?: boolean;

  /** Custom container style */
  containerStyle?: ViewStyle;

  /** Size variant */
  size?: 'small' | 'medium' | 'large';

  /** Test ID for testing */
  testID?: string;
}

export const PriceTrendIndicator: React.FC<PriceTrendIndicatorProps> = ({
  trendData,
  currency = 'CAD',
  showStatistics = false,
  showBestHistorical = false,
  containerStyle,
  size = 'medium',
  testID,
}) => {
  const { direction, strength, confidence, statistics, bestHistoricalPrice } =
    trendData;

  // Get trend emoji and color
  const getTrendDisplay = () => {
    switch (direction) {
      case 'up':
        return {
          emoji: '📈',
          color: colors.error,
          label: 'Rising',
        };
      case 'down':
        return {
          emoji: '📉',
          color: colors.success,
          label: 'Falling',
        };
      default:
        return {
          emoji: '➡️',
          color: colors.grayText,
          label: 'Stable',
        };
    }
  };

  const trendDisplay = getTrendDisplay();

  // Format price
  const formatPrice = (price: number): string => {
    if (typeof price !== 'number' || isNaN(price)) {
      return `${currency} 0.00`;
    }
    return `${currency} ${price.toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Get size-specific styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.containerSmall,
          emoji: styles.emojiSmall,
          label: styles.labelSmall,
          confidence: styles.confidenceSmall,
          price: styles.priceSmall,
          date: styles.dateSmall,
        };
      case 'large':
        return {
          container: styles.containerLarge,
          emoji: styles.emojiLarge,
          label: styles.labelLarge,
          confidence: styles.confidenceLarge,
          price: styles.priceLarge,
          date: styles.dateLarge,
        };
      default:
        return {
          container: styles.containerMedium,
          emoji: styles.emojiMedium,
          label: styles.labelMedium,
          confidence: styles.confidenceMedium,
          price: styles.priceMedium,
          date: styles.dateMedium,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  // Get confidence color
  const getConfidenceColor = (): string => {
    if (confidence >= 0.8) return colors.success;
    if (confidence >= 0.6) return colors.warning;
    return colors.error;
  };

  return (
    <View
      style={[styles.container, sizeStyles.container, containerStyle]}
      testID={testID}
    >
      {/* Main trend indicator */}
      <View style={styles.trendRow}>
        <Text style={[styles.emoji, sizeStyles.emoji]}>
          {trendDisplay.emoji}
        </Text>
        <Text
          style={[
            styles.label,
            sizeStyles.label,
            { color: trendDisplay.color },
          ]}
        >
          {trendDisplay.label}
        </Text>
        <View style={styles.confidenceContainer}>
          <View
            style={[
              styles.confidenceDot,
              { backgroundColor: getConfidenceColor() },
            ]}
          />
          <Text
            style={[
              styles.confidence,
              sizeStyles.confidence,
              { color: getConfidenceColor() },
            ]}
          >
            {Math.round(confidence * 100)}%
          </Text>
        </View>
      </View>

      {/* Strength indicator */}
      <View style={styles.strengthContainer}>
        <View style={styles.strengthBar}>
          <View
            style={[
              styles.strengthFill,
              {
                width: `${strength * 100}%`,
                backgroundColor: trendDisplay.color,
              },
            ]}
          />
        </View>
        <Text style={[styles.strengthText, sizeStyles.label]}>
          {Math.round(strength * 100)}% strength
        </Text>
      </View>

      {/* Statistics */}
      {showStatistics && statistics && (
        <View style={styles.statisticsContainer}>
          <Text style={[styles.statisticsTitle, sizeStyles.label]}>
            Price Range:
          </Text>
          <View style={styles.statisticsRow}>
            <Text style={[styles.statisticsText, sizeStyles.price]}>
              Min: {formatPrice(statistics.min)}
            </Text>
            <Text style={[styles.statisticsText, sizeStyles.price]}>
              Max: {formatPrice(statistics.max)}
            </Text>
          </View>
          <View style={styles.statisticsRow}>
            <Text style={[styles.statisticsText, sizeStyles.price]}>
              Avg: {formatPrice(statistics.average)}
            </Text>
            <Text style={[styles.statisticsText, sizeStyles.price]}>
              Volatility: {statistics.volatility.toFixed(1)}%
            </Text>
          </View>
        </View>
      )}

      {/* Best historical price */}
      {showBestHistorical && bestHistoricalPrice && (
        <View style={styles.bestHistoricalContainer}>
          <Text style={[styles.bestHistoricalTitle, sizeStyles.label]}>
            Best Historical:
          </Text>
          <Text style={[styles.bestHistoricalPrice, sizeStyles.price]}>
            {formatPrice(bestHistoricalPrice.price)}
          </Text>
          <Text style={[styles.bestHistoricalDate, sizeStyles.date]}>
            {formatDate(bestHistoricalPrice.date)} •{' '}
            {bestHistoricalPrice.supplier}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.lightBackground,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.lightBorder,
  },
  containerSmall: {
    padding: 8,
  },
  containerMedium: {
    padding: 12,
  },
  containerLarge: {
    padding: 16,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    marginRight: 6,
  },
  emojiSmall: {
    fontSize: 12,
  },
  emojiMedium: {
    fontSize: 14,
  },
  emojiLarge: {
    fontSize: 16,
  },
  label: {
    fontWeight: '600',
    marginRight: 8,
  },
  labelSmall: {
    fontSize: 12,
  },
  labelMedium: {
    fontSize: 14,
  },
  labelLarge: {
    fontSize: 16,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  confidence: {
    fontSize: 10,
    fontWeight: '500',
  },
  confidenceSmall: {
    fontSize: 9,
  },
  confidenceMedium: {
    fontSize: 10,
  },
  confidenceLarge: {
    fontSize: 11,
  },
  strengthContainer: {
    marginBottom: 8,
  },
  strengthBar: {
    height: 4,
    backgroundColor: colors.lightBorder,
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    color: colors.grayText,
    textAlign: 'right',
  },
  statisticsContainer: {
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.lightBorder,
  },
  statisticsTitle: {
    fontWeight: '600',
    marginBottom: 4,
    color: colors.darkText,
  },
  statisticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  statisticsText: {
    color: colors.grayText,
  },
  priceSmall: {
    fontSize: 10,
  },
  priceMedium: {
    fontSize: 12,
  },
  priceLarge: {
    fontSize: 14,
  },
  bestHistoricalContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.lightBorder,
  },
  bestHistoricalTitle: {
    fontWeight: '600',
    marginBottom: 4,
    color: colors.darkText,
  },
  bestHistoricalPrice: {
    fontWeight: '700',
    color: colors.success,
    marginBottom: 2,
  },
  bestHistoricalDate: {
    color: colors.grayText,
  },
  dateSmall: {
    fontSize: 9,
    fontStyle: 'italic',
  },
  dateMedium: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  dateLarge: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});
