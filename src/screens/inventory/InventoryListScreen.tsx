import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { colors } from '../../constants/colors';
import { InventoryItemRepository } from '../../storage/repositories/InventoryItemRepository';
import { InventoryItem } from '../../storage/types';

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
  const [loading, setLoading] = useState(true);
  const [repository] = useState(() => new InventoryItemRepository());

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const allItems = await repository.findAll();
      setItems(allItems);
    } catch {
      // Error handling is done via Alert.alert
      Alert.alert('Error', 'Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  }, [repository]);

  const filterItems = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
      return;
    }

    const filtered = items.filter(
      item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.notes &&
          item.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredItems(filtered);
  }, [items, searchQuery]);

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

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => onItemPress(item)}
      onLongPress={() => handleDeleteItem(item)}
      activeOpacity={0.7}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemIcon}>
          <Text style={styles.itemIconText}>📦</Text>
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.itemMetaRow}>
            <View style={styles.unitChip}>
              <Text style={styles.unitChipText}>{item.canonicalUnit}</Text>
            </View>
            {item.shelfLifeSensitive && (
              <View style={styles.shelfLifeChip}>
                <Text style={styles.shelfLifeChipText}>⏰ Expires</Text>
              </View>
            )}
          </View>
          {item.notes && (
            <Text style={styles.itemNotes} numberOfLines={2}>
              {item.notes}
            </Text>
          )}
        </View>
        <View style={styles.itemActions}>
          <Text style={styles.chevronIcon}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    // If there are no items at all in the system, show the "add first item" state
    if (items.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}>
            <Text style={styles.emptyStateIconText}>📦</Text>
          </View>
          <Text style={styles.emptyStateTitle}>No items yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            Tap the + button to add your first inventory item
          </Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={onAddItem}>
            <Text style={styles.emptyStateButtonText}>Add First Item</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // If there are items but search returned no results, show search empty state
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyStateIcon}>
          <Text style={styles.emptyStateIconText}>🔍</Text>
        </View>
        <Text style={styles.emptyStateTitle}>No matching items</Text>
        <Text style={styles.emptyStateSubtitle}>
          Try adjusting your search or add a new item
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Inventory</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.grayText}
          />
        </View>
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={onAddItem}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7', // iOS system background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    backgroundColor: '#F2F2F7',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: colors.darkText,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60, // Balance the back button
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#F2F2F7',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: colors.grayText,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.darkText,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for FAB
  },
  itemCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  itemIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemIconText: {
    fontSize: 20,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 8,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  unitChip: {
    backgroundColor: '#E5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  shelfLifeChip: {
    backgroundColor: '#FFF4E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  shelfLifeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9500',
  },
  itemNotes: {
    fontSize: 14,
    color: colors.grayText,
    fontStyle: 'italic',
  },
  itemActions: {
    marginLeft: 16,
  },
  chevronIcon: {
    fontSize: 20,
    color: colors.grayText,
    fontWeight: '300',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 24,
    color: colors.white,
    fontWeight: '300',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateIconText: {
    fontSize: 32,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.darkText,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: colors.grayText,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyStateButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 18,
    color: colors.grayText,
    textAlign: 'center',
    marginTop: 60,
  },
});
