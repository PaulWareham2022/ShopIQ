import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { InventoryItem } from '../../storage/types';
import { Screen, Header, EmptyState } from '../../components/ui';
import { ComparisonList } from '../../components/ui/ComparisonList';
import { 
  createComparisonEngine, 
  ComparisonConfig,
  ItemComparisonResults 
} from '../../storage/comparison';
import { RepositoryFactory } from '../../storage/RepositoryFactory';

interface InventoryComparisonScreenProps {
  inventoryItem: InventoryItem;
  onBack: () => void;
  onAddOffer?: () => void;
}

export const InventoryComparisonScreen: React.FC<InventoryComparisonScreenProps> = ({
  inventoryItem,
  onBack,
  onAddOffer,
}) => {
  const [comparisonResults, setComparisonResults] = useState<ItemComparisonResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [repositoryFactory] = useState(() => RepositoryFactory.getInstance());
  const [comparisonEngine] = useState(() => createComparisonEngine(repositoryFactory));

  // Default comparison configuration for price-per-unit comparison
  const defaultConfig: ComparisonConfig = useMemo(() => ({
    primaryStrategy: 'pricePerCanonical',
    strategyOptions: {
      useEffectivePrice: true,
      useCanonicalUnit: true,
    },
    globalOptions: {
      includeDeleted: false,
      maxResults: 50,
      sortDirection: 'asc',
      minConfidence: 0.5,
      includeIncomplete: true,
      applyEquivalenceFactors: true,
    },
  }), []);

  const loadComparisonData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const results = await comparisonEngine.compareOffers(
        inventoryItem.id,
        defaultConfig
      );

      setComparisonResults(results);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error loading comparison data:', error);
      Alert.alert(
        'Error',
        'Failed to load comparison data. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [comparisonEngine, inventoryItem.id, defaultConfig]);

  useEffect(() => {
    loadComparisonData();
  }, [loadComparisonData]);

  const handleRefresh = useCallback(() => {
    loadComparisonData(true);
  }, [loadComparisonData]);


  const handleOfferPress = useCallback((comparisonResult: any) => {
    // Handle offer press - could open supplier URL or show more details
    if (comparisonResult.offer.supplierUrl) {
      // The ComparisonItemCard already handles URL opening
      // eslint-disable-next-line no-console
      console.log('Offer pressed:', comparisonResult.offer.id);
    } else {
      Alert.alert(
        'Offer Details',
        `Supplier: ${comparisonResult.offer.supplierNameSnapshot || 'Unknown'}\nPrice: ${comparisonResult.offer.currency} ${comparisonResult.offer.totalPrice}\nAmount: ${comparisonResult.offer.amount} ${comparisonResult.offer.amountUnit}`
      );
    }
  }, []);

  const handleOfferLongPress = useCallback((comparisonResult: any) => {
    // Handle long press - could show additional actions
    Alert.alert(
      'Offer Actions',
      'Long press detected - additional actions could be added here',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Details', onPress: () => handleOfferPress(comparisonResult) },
      ]
    );
  }, [handleOfferPress]);

  if (loading) {
    return (
      <Screen backgroundColor="#F2F2F7">
        <Header 
          title="Loading Comparison..." 
          onBack={onBack}
          actionTitle="Add Offer"
          onAction={onAddOffer}
        />
        <View style={styles.loadingContainer}>
          <EmptyState
            icon="⏳"
            title="Loading comparison data..."
            subtitle="Please wait while we analyze the offers"
          />
        </View>
      </Screen>
    );
  }

  if (!comparisonResults) {
    return (
      <Screen backgroundColor="#F2F2F7">
        <Header 
          title="Comparison Error" 
          onBack={onBack}
          actionTitle="Add Offer"
          onAction={onAddOffer}
        />
        <View style={styles.errorContainer}>
          <EmptyState
            icon="❌"
            title="Failed to load comparison"
            subtitle="There was an error loading the comparison data"
            actionTitle="Retry"
            onAction={() => loadComparisonData()}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="#F2F2F7">
        <Header 
          title={`Compare ${inventoryItem.name}`} 
          onBack={onBack}
        />
      
      <ComparisonList
        comparisonResults={comparisonResults}
        onOfferPress={handleOfferPress}
        onOfferLongPress={handleOfferLongPress}
        showComparisonDetails={false}
        showPriceTrend={true}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        testID="inventory-comparison-list"
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
  },
});
