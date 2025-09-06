import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { Platform } from 'react-native';
import { colors } from '../../constants/colors';
import { InventoryItemRepository } from '../../storage/repositories/InventoryItemRepository';
import { InventoryItem } from '../../storage/types';
import { InventoryItemForm } from '../../components/forms/InventoryItemForm';
import { ValidatedInventoryItem } from '../../storage/validation/schemas';
import { Screen, Header, Button } from '../../components/ui';

interface InventoryItemDetailScreenProps {
  itemId?: string;
  onBack: () => void;
  onItemSaved: () => void;
}

export const InventoryItemDetailScreen: React.FC<
  InventoryItemDetailScreenProps
> = ({ itemId, onBack, onItemSaved }) => {
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [isEditing, setIsEditing] = useState(!itemId); // New item if no ID provided
  const [loading, setLoading] = useState(!!itemId); // Only load if editing existing item
  const [repository] = useState(() => new InventoryItemRepository());

  // Debug logging (remove before release)

  const loadItem = useCallback(async () => {
    try {
      setLoading(true);
      const foundItem = await repository.findById(itemId!);
      if (foundItem) {
        setItem(foundItem);
      } else {
        Alert.alert('Error', 'Item not found');
        onBack();
      }
    } catch {
      // Error handling is done via Alert.alert
      Alert.alert('Error', 'Failed to load inventory item');
      onBack();
    } finally {
      setLoading(false);
    }
  }, [itemId, repository, onBack]);

  useEffect(() => {
    if (itemId) {
      loadItem();
    }
  }, [itemId, loadItem]);

  const handleSave = async (values: ValidatedInventoryItem) => {
    try {
      const itemData = {
        name: values.name,
        category: values.category,
        canonicalDimension: values.canonicalDimension,
        canonicalUnit: values.canonicalUnit,
        shelfLifeSensitive: values.shelfLifeSensitive,
        shelfLifeDays: values.shelfLifeDays,
        usageRatePerDay: values.usageRatePerDay,
        notes: values.notes,
      };

      if (itemId) {
        await repository.update(itemId, itemData);
        Alert.alert('Success', 'Item updated successfully!');
      } else {
        await repository.create(itemData);
        Alert.alert('Success', 'Item created successfully!');
      }
      onItemSaved();
    } catch {
      Alert.alert('Error', 'Failed to save inventory item');
    }
  };

  const handleDelete = () => {
    if (!item) return;

    // React Native Web's Alert has limited button support. Use confirm() on web.
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Delete "${item.name}"? This action cannot be undone.`
      );
      if (!confirmed) return;
      (async () => {
        try {
          await repository.delete(item.id);
          onItemSaved();
        } catch {
          Alert.alert('Error', 'Failed to delete item');
        }
      })();
      return;
    }

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
              onItemSaved();
            } catch {
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <Screen>
        <Header title="Loading..." onBack={onBack} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading item...</Text>
        </View>
      </Screen>
    );
  }

  if (isEditing) {
    return (
      <Screen>
        <Header 
          title={itemId ? 'Edit Item' : 'Add New Item'} 
          onBack={onBack} 
        />
        <InventoryItemForm
          initialValues={item || undefined}
          onSubmit={handleSave}
          onCancel={onBack}
          submitButtonText={itemId ? 'Update Item' : 'Add Item'}
        />
      </Screen>
    );
  }

  // View mode
  return (
    <Screen scrollable>
      <Header 
        title="Item Details" 
        onBack={onBack}
        actionTitle="Edit"
        onAction={() => setIsEditing(true)}
      />

      <View style={styles.content}>
        <View style={styles.detailCard}>
          <Text style={styles.itemName}>{item?.name}</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Canonical Unit:</Text>
            <Text style={styles.detailValue}>{item?.canonicalUnit}</Text>
          </View>

          {item?.category && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category:</Text>
              <Text style={styles.detailValue}>{item.category}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Shelf-life Sensitive:</Text>
            <Text style={styles.detailValue}>
              {item?.shelfLifeSensitive ? 'Yes' : 'No'}
            </Text>
          </View>

          {item?.notes && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Notes:</Text>
              <Text style={styles.detailValue}>{item.notes}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created:</Text>
            <Text style={styles.detailValue}>
              {item?.created_at
                ? new Date(item.created_at).toLocaleDateString()
                : 'Unknown'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Updated:</Text>
            <Text style={styles.detailValue}>
              {item?.updated_at
                ? new Date(item.updated_at).toLocaleDateString()
                : 'Unknown'}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <Button
            title="Delete Item"
            variant="danger"
            onPress={handleDelete}
            style={styles.deleteButton}
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.grayText,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  itemName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.darkText,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.grayText,
    width: 120,
  },
  detailValue: {
    fontSize: 16,
    color: colors.darkText,
    flex: 1,
  },
  actionButtons: {
    marginTop: 20,
  },
  deleteButton: {
    marginTop: 0,
  },
});
