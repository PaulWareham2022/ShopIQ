import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, Alert, Animated } from 'react-native';
import { SupplierRepository } from '../../storage/repositories/SupplierRepository';
import { Supplier } from '../../storage/types';
import {
  Screen,
  Header,
  SearchBar,
  ItemCard,
  EmptyState,
  FloatingActionButton,
  SupplierRating,
} from '../../components/ui';

interface SupplierListScreenProps {
  onSupplierPress: (supplier: Supplier) => void;
  onAddSupplier: () => void;
  onBack: () => void;
}

export const SupplierListScreen: React.FC<SupplierListScreenProps> = ({
  onSupplierPress,
  onAddSupplier,
  onBack,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [repository] = useState(() => new SupplierRepository());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadSuppliers = useCallback(async () => {
    try {
      // Only show loading if data takes longer than 100ms to load
      const loadingTimeout = setTimeout(() => {
        setLoading(true);
      }, 100);

      const allSuppliers = await repository.findAll();
      clearTimeout(loadingTimeout);

      setSuppliers(allSuppliers);
      // Set filtered suppliers immediately after loading suppliers
      setFilteredSuppliers(allSuppliers);
      setDataLoaded(true);

      // Fade in the content smoothly
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } catch {
      Alert.alert('Error', 'Failed to load stores');
      setDataLoaded(true); // Still mark as loaded even on error
    } finally {
      setLoading(false);
    }
  }, [repository]);

  const filterSuppliers = useCallback(
    (query?: string) => {
      const searchTerm = query !== undefined ? query : searchQuery;
      if (!searchTerm.trim()) {
        setFilteredSuppliers(suppliers);
        return;
      }

      const filtered = suppliers.filter(
        supplier =>
          supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (supplier.notes &&
            supplier.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (supplier.storeCode &&
            supplier.storeCode.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredSuppliers(filtered);
    },
    [suppliers, searchQuery]
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      filterSuppliers(query);
    },
    [filterSuppliers]
  );

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    filterSuppliers();
  }, [filterSuppliers]);

  const handleDeleteSupplier = async (supplier: Supplier) => {
    Alert.alert(
      'Delete Supplier',
      `Are you sure you want to delete "${supplier.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await repository.delete(supplier.id);
              // Update local state immediately for better UX
              setSuppliers(currentSuppliers =>
                currentSuppliers.filter(s => s.id !== supplier.id)
              );
              setFilteredSuppliers(currentSuppliers =>
                currentSuppliers.filter(s => s.id !== supplier.id)
              );
            } catch {
              Alert.alert('Error', 'Failed to delete supplier');
            }
          },
        },
      ]
    );
  };

  const renderSupplier = ({ item }: { item: Supplier }) => {
    const chips = [
      { label: item.countryCode, variant: 'primary' as const },
      { label: item.defaultCurrency, variant: 'secondary' as const },
      ...(item.membershipRequired
        ? [{ label: '👤 Membership', variant: 'warning' as const }]
        : []),
    ];

    // Create subtitle with rating if available
    const subtitle = item.rating ? (
      <View style={styles.ratingContainer}>
        <SupplierRating
          rating={item.rating}
          starSize={16}
          showRatingNumber={true}
          testID={`supplier-${item.id}-rating`}
        />
      </View>
    ) : undefined;

    return (
      <ItemCard
        title={item.name}
        subtitle={subtitle}
        chips={chips}
        notes={item.notes}
        onPress={() => onSupplierPress(item)}
        onLongPress={() => handleDeleteSupplier(item)}
      />
    );
  };

  const renderEmptyState = () => {
    // If there are no suppliers at all in the system, show the "add first supplier" state
    if (suppliers.length === 0) {
      return (
        <EmptyState
          icon="🏪"
          title="No stores yet"
          subtitle="Tap the + button to add your first store"
          actionTitle="Add First Store"
          onAction={onAddSupplier}
        />
      );
    }

    // If there are suppliers but search returned no results, show search empty state
    return (
      <EmptyState
        icon="🔍"
        title="No matching stores"
        subtitle="Try adjusting your search or add a new store"
      />
    );
  };

  if (loading) {
    return (
      <Screen backgroundColor="#F2F2F7">
        <Header title="Loading..." onBack={onBack} />
        <View style={styles.loadingContainer}>
          <EmptyState
            icon="⏳"
            title="Loading stores..."
            subtitle="Please wait while we fetch your stores"
          />
        </View>
      </Screen>
    );
  }

  // Don't render the main content until data is loaded to prevent flicker
  if (!dataLoaded) {
    return (
      <Screen backgroundColor="#F2F2F7">
        <Header title="Stores" onBack={onBack} />
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="#F2F2F7">
      <Header title="Stores" onBack={onBack} />

      <Animated.View style={{ opacity: fadeAnim }}>
        <SearchBar
          placeholder="Search stores..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSearch={handleSearch}
        />

        <FlatList
          data={filteredSuppliers}
          renderItem={renderSupplier}
          keyExtractor={supplier => supplier.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      <FloatingActionButton onPress={onAddSupplier} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for FAB
  },
  ratingContainer: {
    marginTop: 4,
  },
});
