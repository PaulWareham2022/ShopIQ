import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  ViewStyle,
  ListRenderItem,
  RefreshControl,
  View,
  Text,
} from 'react-native';
import {
  ComparisonResult,
  ItemComparisonResults,
} from '../../storage/comparison/types';
import { ComparisonItemCard } from './ComparisonItemCard';
import { EmptyState } from './EmptyState';
import { colors } from '../../constants/colors';

export interface ComparisonListProps {
  /** The comparison results to display */
  comparisonResults: ItemComparisonResults;

  /** Callback when an offer is pressed */
  onOfferPress?: (comparisonResult: ComparisonResult) => void;

  /** Callback when an offer is long pressed */
  onOfferLongPress?: (comparisonResult: ComparisonResult) => void;

  /** Show detailed comparison information */
  showComparisonDetails?: boolean;

  /** Show price trend information */
  showPriceTrend?: boolean;

  /** Custom container style */
  containerStyle?: ViewStyle;

  /** Enable pull-to-refresh */
  refreshing?: boolean;

  /** Callback when refresh is triggered */
  onRefresh?: () => void;

  /** Test ID for testing */
  testID?: string;
}

export const ComparisonList: React.FC<ComparisonListProps> = ({
  comparisonResults,
  onOfferPress,
  onOfferLongPress,
  showComparisonDetails = false,
  showPriceTrend = true,
  containerStyle,
  refreshing = false,
  onRefresh,
  testID,
}) => {
  // Memoize the sorted results to avoid unnecessary re-sorting
  const sortedResults = useMemo(() => {
    if (!comparisonResults.results || comparisonResults.results.length === 0) {
      return [];
    }

    // Sort by score (lower is better for price-based comparisons)
    return [...comparisonResults.results].sort((a, b) => a.score - b.score);
  }, [comparisonResults.results]);

  // Determine which offers are best/tied
  const bestOfferInfo = useMemo(() => {
    if (sortedResults.length === 0) {
      return { bestScore: null, isBestOffer: {}, isTiedForBest: {} };
    }

    const bestScore = sortedResults[0].score;
    const bestOffers = sortedResults.filter(
      result => result.score === bestScore
    );
    const isTied = bestOffers.length > 1;

    const isBestOffer: Record<string, boolean> = {};
    const isTiedForBest: Record<string, boolean> = {};

    sortedResults.forEach(result => {
      const isBest = result.score === bestScore;
      isBestOffer[result.offer.id] = isBest;
      isTiedForBest[result.offer.id] = isBest && isTied;
    });

    return { bestScore, isBestOffer, isTiedForBest };
  }, [sortedResults]);

  // Render individual comparison item
  const renderItem: ListRenderItem<ComparisonResult> = useCallback(
    ({ item, index }) => {
      const isBestOffer = bestOfferInfo.isBestOffer[item.offer.id] || false;
      const isTiedForBest = bestOfferInfo.isTiedForBest[item.offer.id] || false;

      return (
        <ComparisonItemCard
          comparisonResult={item}
          isBestOffer={isBestOffer}
          isTiedForBest={isTiedForBest}
          onPress={() => onOfferPress?.(item)}
          onLongPress={() => onOfferLongPress?.(item)}
          showComparisonDetails={showComparisonDetails}
          showPriceTrend={showPriceTrend}
          testID={`${testID}-item-${index}`}
        />
      );
    },
    [
      bestOfferInfo.isBestOffer,
      bestOfferInfo.isTiedForBest,
      onOfferPress,
      onOfferLongPress,
      showComparisonDetails,
      showPriceTrend,
      testID,
    ]
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback(
    (item: ComparisonResult) => item.offer.id,
    []
  );

  // Get item layout for better performance (optional optimization)
  const getItemLayout = useCallback(
    (_: ComparisonResult[] | null | undefined, index: number) => ({
      length: 200, // Approximate height of each item
      offset: 200 * index,
      index,
    }),
    []
  );

  // Render empty state
  const renderEmptyComponent = useCallback(() => {
    if (comparisonResults.results.length === 0) {
      return (
        <EmptyState
          icon="📊"
          title="No offers found"
          subtitle="No offers are available for this item yet. Add some offers to see comparisons."
        />
      );
    }

    return null;
  }, [comparisonResults.results.length]);

  // Render list header with summary information
  const renderListHeader = useCallback(() => {
    if (sortedResults.length === 0) {
      return null;
    }

    const totalOffers = sortedResults.length;
    const bestOffer = sortedResults[0];
    const priceRange =
      sortedResults.length > 1
        ? sortedResults[sortedResults.length - 1].offer
            .effectivePricePerCanonical
        : bestOffer.offer.effectivePricePerCanonical;

    return (
      <ComparisonListHeader
        inventoryItem={comparisonResults.inventoryItem}
        totalOffers={totalOffers}
        bestPrice={bestOffer.offer.effectivePricePerCanonical}
        priceRange={priceRange}
        currency={bestOffer.offer.currency}
        canonicalUnit={comparisonResults.inventoryItem.canonicalUnit}
      />
    );
  }, [sortedResults, comparisonResults.inventoryItem]);

  return (
    <FlatList
      data={sortedResults}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      ListHeaderComponent={renderListHeader}
      ListEmptyComponent={renderEmptyComponent}
      contentContainerStyle={[styles.container, containerStyle]}
      style={styles.list}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        ) : undefined
      }
      testID={testID}
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={5}
      windowSize={10}
    />
  );
};

// Simple header component for the comparison list
interface ComparisonListHeaderProps {
  inventoryItem: { name: string; canonicalUnit: string }; // Will be properly typed when we integrate with the comparison engine
  totalOffers: number;
  bestPrice: number;
  priceRange: number;
  currency: string;
  canonicalUnit: string;
}

const ComparisonListHeader: React.FC<ComparisonListHeaderProps> = ({
  inventoryItem,
  totalOffers,
  bestPrice,
  priceRange,
  currency,
  canonicalUnit,
}) => {
  const formatPrice = (price: number, currency: string): string => {
    if (typeof price !== 'number' || isNaN(price)) {
      return `${currency} 0.00`;
    }
    return `${currency} ${price.toFixed(2)}`;
  };

  const priceSavings = priceRange - bestPrice;
  const savingsPercentage =
    priceRange > 0 ? (priceSavings / priceRange) * 100 : 0;

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.itemName}>{inventoryItem.name}</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {totalOffers} offer{totalOffers !== 1 ? 's' : ''} found
          </Text>
          {priceSavings > 0 && (
            <Text style={styles.savingsText}>
              Save up to {formatPrice(priceSavings, currency)} (
              {savingsPercentage.toFixed(0)}%)
            </Text>
          )}
        </View>
        <View style={styles.priceSummary}>
          <Text style={styles.bestPriceLabel}>Best price:</Text>
          <Text style={styles.bestPriceValue}>
            {formatPrice(bestPrice, currency)} per {canonicalUnit}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  list: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.lightBackground,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.lightBorder,
  },
  headerContent: {
    // Container for header content
  },
  itemName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: colors.grayText,
  },
  savingsText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
  },
  priceSummary: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bestPriceLabel: {
    fontSize: 14,
    color: colors.grayText,
    marginRight: 8,
  },
  bestPriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
});
