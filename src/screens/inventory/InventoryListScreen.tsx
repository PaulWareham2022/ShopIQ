import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, Alert, Animated } from 'react-native';
import { InventoryItemRepository } from '../../storage/repositories/InventoryItemRepository';
import { InventoryItem } from '../../storage/types';
import {
  Screen,
  Header,
  SearchBar,
  ItemCard,
  EmptyState,
  FloatingActionButton,
} from '../../components/ui';

interface InventoryListScreenProps {
  onItemPress: (item: InventoryItem) => void;
  onAddItem: () => void;
  onBack: () => void;
}

export const InventoryListScreen: React.FC<InventoryListScreenProps> = ({
  onItemPress,
  onAddItem,
  onBack,
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [repository] = useState(() => new InventoryItemRepository());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadItems = useCallback(async () => {
    try {
      // Only show loading if data takes longer than 100ms to load
      const loadingTimeout = setTimeout(() => {
        setLoading(true);
      }, 100);

      const allItems = await repository.findAll();
      clearTimeout(loadingTimeout);

      setItems(allItems);
      // Set filtered items immediately after loading items
      setFilteredItems(allItems);
      setDataLoaded(true);

      // Fade in the content smoothly
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } catch {
      // Error handling is done via Alert.alert
      Alert.alert('Error', 'Failed to load inventory items');
      setDataLoaded(true); // Still mark as loaded even on error
    } finally {
      setLoading(false);
    }
  }, [repository]);

  const filterItems = useCallback(
    (query?: string) => {
      const searchTerm = query !== undefined ? query : searchQuery;
      if (!searchTerm.trim()) {
        setFilteredItems(items);
        return;
      }

      const filtered = items.filter(
        item =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.notes &&
            item.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredItems(filtered);
    },
    [items, searchQuery]
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      filterItems(query);
    },
    [filterItems]
  );

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    filterItems();
  }, [filterItems]);

  const handleDeleteItem = async (item: InventoryItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await repository.delete(item.id);
              // Update local state immediately for better UX
              setItems(currentItems =>
                currentItems.filter(i => i.id !== item.id)
              );
              setFilteredItems(currentItems =>
                currentItems.filter(i => i.id !== item.id)
              );
            } catch {
              // Failed to delete item - error handled via Alert
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const chips = [
      { label: item.canonicalUnit, variant: 'primary' as const },
      ...(item.shelfLifeSensitive
        ? [{ label: '⏰ Expires', variant: 'warning' as const }]
        : []),
    ];

    return (
      <ItemCard
        title={item.name}
        chips={chips}
        notes={item.notes}
        onPress={() => onItemPress(item)}
        onLongPress={() => handleDeleteItem(item)}
      />
    );
  };

  const renderEmptyState = () => {
    // If there are no items at all in the system, show the "add first item" state
    if (items.length === 0) {
      return (
        <EmptyState
          icon="📦"
          title="No items yet"
          subtitle="Tap the + button to add your first inventory item"
          actionTitle="Add First Item"
          onAction={onAddItem}
        />
      );
    }

    // If there are items but search returned no results, show search empty state
    return (
      <EmptyState
        icon="🔍"
        title="No matching items"
        subtitle="Try adjusting your search or add a new item"
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
            title="Loading inventory..."
            subtitle="Please wait while we fetch your items"
          />
        </View>
      </Screen>
    );
  }

  // Don't render the main content until data is loaded to prevent flicker
  if (!dataLoaded) {
    return (
      <Screen backgroundColor="#F2F2F7">
        <Header title="Inventory" onBack={onBack} />
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="#F2F2F7">
      <Header title="Inventory" onBack={onBack} />

      <Animated.View style={{ opacity: fadeAnim }}>
        <SearchBar
          placeholder="Search items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSearch={handleSearch}
        />

        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      <FloatingActionButton onPress={onAddItem} />
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
