import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../../constants/colors';
import { InventoryItem } from '../../storage/types';
import { BestOfferBadge } from './BestOfferBadge';

export interface ComparisonHeaderProps {
  /** The inventory item being compared */
  inventoryItem: InventoryItem;

  /** Total number of offers */
  totalOffers: number;

  /** Best price found */
  bestPrice: number;

  /** Highest price found (for range calculation) */
  highestPrice: number;

  /** Currency for price display */
  currency: string;

  /** Canonical unit for the item */
  canonicalUnit: string;

  /** Whether to show savings information */
  showSavings?: boolean;

  /** Whether to show item details */
  showItemDetails?: boolean;

  /** Callback when item is pressed */
  onItemPress?: () => void;

  /** Custom container style */
  containerStyle?: ViewStyle;

  /** Test ID for testing */
  testID?: string;
}

export const ComparisonHeader: React.FC<ComparisonHeaderProps> = ({
  inventoryItem,
  totalOffers,
  bestPrice,
  highestPrice,
  currency,
  canonicalUnit,
  showSavings = true,
  showItemDetails = true,
  onItemPress,
  containerStyle,
  testID,
}) => {
  // Format price
  const formatPrice = (price: number): string => {
    if (typeof price !== 'number' || isNaN(price)) {
      return `${currency} 0.00`;
    }
    return `${currency} ${price.toFixed(2)}`;
  };

  // Calculate savings
  const priceSavings = highestPrice - bestPrice;
  const savingsPercentage =
    highestPrice > 0 ? (priceSavings / highestPrice) * 100 : 0;

  // Get item category display
  const getCategoryDisplay = (): string => {
    if (!inventoryItem.category) return '';
    return `• ${inventoryItem.category}`;
  };

  // Get shelf life warning
  const getShelfLifeWarning = (): string | null => {
    if (!inventoryItem.shelfLifeSensitive) return null;
    return '⚠️ Shelf-life sensitive';
  };

  // Get usage rate display
  const getUsageRateDisplay = (): string | null => {
    if (!inventoryItem.usageRatePerDay) return null;
    return `Usage: ${inventoryItem.usageRatePerDay} ${canonicalUnit}/day`;
  };

  const categoryDisplay = getCategoryDisplay();
  const shelfLifeWarning = getShelfLifeWarning();
  const usageRateDisplay = getUsageRateDisplay();

  const headerContent = (
    <View style={[styles.container, containerStyle]} testID={testID}>
      {/* Item name and category */}
      <View style={styles.titleRow}>
        <Text style={styles.itemName}>{inventoryItem.name}</Text>
        {categoryDisplay && (
          <Text style={styles.category}>{categoryDisplay}</Text>
        )}
      </View>

      {/* Item details */}
      {showItemDetails && (
        <View style={styles.detailsRow}>
          <Text style={styles.canonicalUnit}>
            Unit: {inventoryItem.canonicalUnit} (
            {inventoryItem.canonicalDimension})
          </Text>
          {shelfLifeWarning && (
            <Text style={styles.shelfLifeWarning}>{shelfLifeWarning}</Text>
          )}
        </View>
      )}

      {/* Usage rate */}
      {usageRateDisplay && (
        <Text style={styles.usageRate}>{usageRateDisplay}</Text>
      )}

      {/* Offers summary */}
      <View style={styles.summaryRow}>
        <Text style={styles.offersCount}>
          {totalOffers} offer{totalOffers !== 1 ? 's' : ''} found
        </Text>
        {showSavings && priceSavings > 0 && (
          <BestOfferBadge
            isBestOffer={true}
            variant="savings"
            size="small"
            position="inline"
            customText={`Save ${formatPrice(priceSavings)} (${savingsPercentage.toFixed(0)}%)`}
          />
        )}
      </View>

      {/* Price summary */}
      <View style={styles.priceSummary}>
        <View style={styles.bestPriceContainer}>
          <Text style={styles.bestPriceLabel}>Best price:</Text>
          <Text style={styles.bestPriceValue}>
            {formatPrice(bestPrice)} per {canonicalUnit}
          </Text>
        </View>

        {showSavings && priceSavings > 0 && (
          <View style={styles.priceRangeContainer}>
            <Text style={styles.priceRangeLabel}>Price range:</Text>
            <Text style={styles.priceRangeValue}>
              {formatPrice(bestPrice)} - {formatPrice(highestPrice)}
            </Text>
          </View>
        )}
      </View>

      {/* Notes */}
      {inventoryItem.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText} numberOfLines={2}>
            {inventoryItem.notes}
          </Text>
        </View>
      )}

      {/* Attributes */}
      {inventoryItem.attributes &&
        Object.keys(inventoryItem.attributes).length > 0 && (
          <View style={styles.attributesContainer}>
            <Text style={styles.attributesLabel}>Attributes:</Text>
            <View style={styles.attributesList}>
              {Object.entries(inventoryItem.attributes).map(([key, value]) => (
                <View key={key} style={styles.attributeItem}>
                  <Text style={styles.attributeKey}>{key}:</Text>
                  <Text style={styles.attributeValue}>{String(value)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
    </View>
  );

  if (onItemPress) {
    return (
      <TouchableOpacity
        onPress={onItemPress}
        activeOpacity={0.7}
        testID={testID}
      >
        {headerContent}
      </TouchableOpacity>
    );
  }

  return headerContent;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.lightBackground,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.lightBorder,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.darkText,
    flex: 1,
  },
  category: {
    fontSize: 14,
    color: colors.grayText,
    fontStyle: 'italic',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  canonicalUnit: {
    fontSize: 14,
    color: colors.grayText,
  },
  shelfLifeWarning: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
  },
  usageRate: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  offersCount: {
    fontSize: 14,
    color: colors.grayText,
  },
  priceSummary: {
    marginBottom: 12,
  },
  bestPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bestPriceLabel: {
    fontSize: 14,
    color: colors.grayText,
    marginRight: 8,
  },
  bestPriceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.success,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceRangeLabel: {
    fontSize: 12,
    color: colors.grayText,
    marginRight: 8,
  },
  priceRangeValue: {
    fontSize: 14,
    color: colors.darkText,
    fontWeight: '500',
  },
  notesContainer: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.lightBorder,
  },
  notesLabel: {
    fontSize: 12,
    color: colors.grayText,
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: colors.darkText,
    lineHeight: 18,
  },
  attributesContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.lightBorder,
  },
  attributesLabel: {
    fontSize: 12,
    color: colors.grayText,
    fontWeight: '600',
    marginBottom: 6,
  },
  attributesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  attributeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  attributeKey: {
    fontSize: 12,
    color: colors.grayText,
    marginRight: 4,
  },
  attributeValue: {
    fontSize: 12,
    color: colors.darkText,
    fontWeight: '500',
  },
});
