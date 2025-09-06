import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert, Text } from 'react-native';
import { colors } from '../../constants/colors';
import { InventoryItem, Offer, ComparisonResult } from '../../storage/types';
import { RepositoryFactory } from '../../storage/RepositoryFactory';
import { ComparisonEngine, ComparisonConfig, ItemComparisonResults } from '../../storage/comparison';
import {
  Screen,
  Header,
  SearchBar,
  OfferCard,
  EmptyState,
  FloatingActionButton,
} from '../../components/ui';

interface OfferListScreenProps {
  /** The inventory item to show offers for */
  inventoryItem: InventoryItem;
  
  /** Callback when back button is pressed */
  onBack: () => void;
  
  /** Callback when add offer button is pressed */
  onAddOffer: () => void;
  
  /** Callback when an offer is pressed */
  onOfferPress?: (offer: Offer) => void;
}

export const OfferListScreen: React.FC<OfferListScreenProps> = ({
  inventoryItem,
  onBack,
  onAddOffer,
  onOfferPress,
}) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  const [comparisonResults, setComparisonResults] = useState<ItemComparisonResults | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Comparison configuration
  const [comparisonConfig] = useState<ComparisonConfig>({
    primaryStrategy: 'pricePerCanonical',
    strategyOptions: {
      includeShipping: true,
      includeTax: true,
      useEffectivePrice: true,
      applyEquivalenceFactors: true,
    },
    globalOptions: {
      includeDeleted: false,
      maxResults: 100,
      sortDirection: 'asc',
      minConfidence: 0.5,
      includeIncomplete: true,
      applyEquivalenceFactors: true,
    },
  });

  const loadOffers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const repositoryFactory = RepositoryFactory.getInstance();
      await repositoryFactory.initialize();
      
      const offerRepo = await repositoryFactory.getOfferRepository();
      const allOffers = await offerRepo.findWhere(
        { inventory_item_id: inventoryItem.id },
        { 
          includeDeleted: false,
          orderBy: 'observed_at',
          orderDirection: 'DESC',
        }
      );
      
      setOffers(allOffers);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load offers';
      setError(errorMessage);
      console.error('Error loading offers:', err);
    } finally {
      setLoading(false);
    }
  }, [inventoryItem.id]);

  const performComparison = useCallback(async () => {
    if (offers.length === 0) {
      setComparisonResults(null);
      return;
    }

    try {
      setComparisonLoading(true);
      
      const repositoryFactory = RepositoryFactory.getInstance();
      const comparisonEngine = new ComparisonEngine(repositoryFactory);
      
      const results = await comparisonEngine.compareOffers(
        inventoryItem.id,
        comparisonConfig
      );
      
      setComparisonResults(results);
    } catch (err) {
      console.error('Error performing comparison:', err);
      // Don't show error to user for comparison failures, just log it
      setComparisonResults(null);
    } finally {
      setComparisonLoading(false);
    }
  }, [offers, inventoryItem.id, comparisonConfig]);

  const filterOffers = useCallback(
    (query?: string) => {
      const searchTerm = query !== undefined ? query : searchQuery;
      if (!searchTerm.trim()) {
        setFilteredOffers(offers);
        return;
      }

      const filtered = offers.filter(offer =>
        offer.supplierNameSnapshot?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.sourceType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.currency?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOffers(filtered);
    },
    [offers, searchQuery]
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      filterOffers(query);
    },
    [filterOffers]
  );

  // Load offers when component mounts
  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  // Filter offers when offers or search query changes
  useEffect(() => {
    filterOffers();
  }, [filterOffers]);

  // Perform comparison when offers change
  useEffect(() => {
    performComparison();
  }, [performComparison]);

  // Helper function to determine if an offer is the best
  const isBestOffer = (offer: Offer): boolean => {
    return comparisonResults?.bestOffer?.offer.id === offer.id;
  };

  // Helper function to determine if an offer is tied for best
  const isTiedForBest = (offer: Offer): boolean => {
    if (!comparisonResults?.results || comparisonResults.results.length < 2) {
      return false;
    }
    
    const bestScore = comparisonResults.results[0].score;
    const offerResult = comparisonResults.results.find(r => r.offer.id === offer.id);
    
    // Handle edge case where offer result might not be found
    if (!offerResult) {
      return false;
    }
    
    // Use a small epsilon for floating point comparison
    const epsilon = 0.0001;
    return Math.abs(offerResult.score - bestScore) < epsilon;
  };

  // Helper function to get comparison result for an offer
  const getComparisonResult = (offer: Offer): ComparisonResult | undefined => {
    return comparisonResults?.results.find(r => r.offer.id === offer.id);
  };

  const renderOffer = ({ item: offer }: { item: Offer }) => {
    const comparisonResult = getComparisonResult(offer);
    const isBest = isBestOffer(offer);
    const isTied = isTiedForBest(offer);

    return (
      <OfferCard
        offer={offer}
        comparisonResult={comparisonResult}
        isBestOffer={isBest}
        isTiedForBest={isTied}
        onPress={() => onOfferPress?.(offer)}
        showComparisonDetails={true}
        showPriceBreakdown={false}
      />
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <EmptyState
          icon="⏳"
          title="Loading offers..."
          subtitle="Please wait while we fetch the offers for this item"
        />
      );
    }

    if (error) {
      return (
        <EmptyState
          icon="❌"
          title="Error loading offers"
          subtitle={error}
          actionTitle="Retry"
          onAction={loadOffers}
        />
      );
    }

    if (offers.length === 0) {
      return (
        <EmptyState
          icon="📦"
          title="No offers yet"
          subtitle={`No offers have been added for "${inventoryItem.name}" yet`}
          actionTitle="Add First Offer"
          onAction={onAddOffer}
        />
      );
    }

    // If there are offers but search returned no results
    return (
      <EmptyState
        icon="🔍"
        title="No matching offers"
        subtitle="Try adjusting your search terms"
      />
    );
  };

  const renderHeader = () => {
    if (comparisonLoading) {
      return (
        <View style={styles.comparisonHeader}>
          <Text style={styles.comparisonHeaderText}>
            🔄 Analyzing offers...
          </Text>
        </View>
      );
    }

    if (comparisonResults && comparisonResults.results.length > 0) {
      const bestOffer = comparisonResults.bestOffer;
      const totalOffers = comparisonResults.metadata.totalOffers;
      const strategyUsed = comparisonResults.metadata.strategyUsed;

      return (
        <View style={styles.comparisonHeader}>
          <Text style={styles.comparisonHeaderText}>
            🏆 Best offer: {bestOffer?.offer.supplierNameSnapshot} - {bestOffer?.offer.currency} {bestOffer?.offer.totalPrice.toFixed(2)}
          </Text>
          <Text style={styles.comparisonSubtext}>
            {totalOffers} offers analyzed using {strategyUsed} strategy
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <Screen backgroundColor="#F2F2F7">
      <Header 
        title={`Offers for ${inventoryItem.name}`}
        onBack={onBack}
      />

      <SearchBar
        placeholder="Search offers by supplier, source, or currency..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSearch={handleSearch}
      />

      {renderHeader()}

      <FlatList
        data={filteredOffers}
        renderItem={renderOffer}
        keyExtractor={offer => offer.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadOffers}
      />

      <FloatingActionButton onPress={onAddOffer} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for FAB
  },
  comparisonHeader: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  comparisonHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 4,
  },
  comparisonSubtext: {
    fontSize: 14,
    color: colors.grayText,
  },
});
