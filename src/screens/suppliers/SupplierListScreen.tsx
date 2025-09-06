import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { SupplierRepository } from '../../storage/repositories/SupplierRepository';
import { Supplier } from '../../storage/types';
import {
  Screen,
  Header,
  SearchBar,
  ItemCard,
  EmptyState,
  FloatingActionButton,
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
  const [loading, setLoading] = useState(true);
  const [repository] = useState(() => new SupplierRepository());

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const allSuppliers = await repository.findAll();
      setSuppliers(allSuppliers);
    } catch {
      Alert.alert('Error', 'Failed to load suppliers');
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

    return (
      <ItemCard
        title={item.name}
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
          title="No suppliers yet"
          subtitle="Tap the + button to add your first supplier"
          actionTitle="Add First Supplier"
          onAction={onAddSupplier}
        />
      );
    }

    // If there are suppliers but search returned no results, show search empty state
    return (
      <EmptyState
        icon="🔍"
        title="No matching suppliers"
        subtitle="Try adjusting your search or add a new supplier"
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
            title="Loading suppliers..."
            subtitle="Please wait while we fetch your suppliers"
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="#F2F2F7">
      <Header title="Suppliers" onBack={onBack} />

      <SearchBar
        placeholder="Search suppliers..."
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
});
