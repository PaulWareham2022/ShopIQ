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
import { InventoryItem } from '../../storage/repositories/InventoryItemRepository';

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
      style={styles.itemContainer}
      onPress={() => onItemPress(item)}
      onLongPress={() => handleDeleteItem(item)}
    >
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemUnit}>Unit: {item.canonical_unit}</Text>
        {item.shelf_life_sensitive && (
          <View style={styles.shelfLifeBadge}>
            <Text style={styles.shelfLifeText}>Shelf-life sensitive</Text>
          </View>
        )}
        {item.notes && (
          <Text style={styles.itemNotes} numberOfLines={2}>
            {item.notes}
          </Text>
        )}
      </View>
      <View style={styles.itemActions}>
        <Text style={styles.editText}>Edit</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No inventory items</Text>
      <Text style={styles.emptyStateSubtitle}>
        Add your first item to get started
      </Text>
    </View>
  );

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
        <TouchableOpacity style={styles.addButton} onPress={onAddItem}>
          <Text style={styles.addButtonText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.grayText}
        />
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
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
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.darkText,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
  },
  searchInput: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.darkText,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  itemContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.lightGray,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 4,
  },
  itemUnit: {
    fontSize: 14,
    color: colors.grayText,
    marginBottom: 8,
  },
  shelfLifeBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  shelfLifeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  itemNotes: {
    fontSize: 14,
    color: colors.grayText,
    fontStyle: 'italic',
  },
  itemActions: {
    marginLeft: 16,
  },
  editText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: colors.grayText,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.grayText,
    textAlign: 'center',
    marginTop: 60,
  },
});
