import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors } from '../../constants/colors';
import { SearchBar } from './SearchBar';

export interface PickerItem {
  id: string;
  label: string;
  subtitle?: string;
}

interface PickerProps {
  label?: string;
  required?: boolean;
  value?: string;
  onValueChange: (value: string) => void;
  items: PickerItem[];
  placeholder?: string;
  error?: string;
  containerStyle?: ViewStyle;
  disabled?: boolean;
  searchable?: boolean;
  emptyText?: string;
}

export const Picker: React.FC<PickerProps> = ({
  label,
  required = false,
  value,
  onValueChange,
  items,
  placeholder = 'Select an option...',
  error,
  containerStyle,
  disabled = false,
  searchable = true,
  emptyText = 'No items available',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Find selected item
  const selectedItem = items.find(item => item.id === value);

  // Filter items based on search query
  const filteredItems = searchable
    ? items.filter(
        item =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.subtitle &&
            item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : items;

  const handleSelect = (itemId: string) => {
    onValueChange(itemId);
    setIsVisible(false);
    setSearchQuery('');
  };

  const handleClose = () => {
    setIsVisible(false);
    setSearchQuery('');
  };

  const renderItem = ({ item }: { item: PickerItem }) => (
    <TouchableOpacity
      style={[styles.modalItem, item.id === value && styles.modalItemSelected]}
      onPress={() => handleSelect(item.id)}
    >
      <Text
        style={[
          styles.modalItemText,
          item.id === value && styles.modalItemTextSelected,
        ]}
      >
        {item.label}
      </Text>
      {item.subtitle && (
        <Text
          style={[
            styles.modalItemSubtitle,
            item.id === value && styles.modalItemSubtitleSelected,
          ]}
        >
          {item.subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.selector,
          error && styles.selectorError,
          disabled && styles.selectorDisabled,
        ]}
        onPress={() => !disabled && setIsVisible(true)}
        disabled={disabled}
      >
        <Text
          style={[
            styles.selectorText,
            !selectedItem && styles.selectorPlaceholder,
            disabled && styles.selectorTextDisabled,
          ]}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <Text style={[styles.chevron, disabled && styles.chevronDisabled]}>
          ▼
        </Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || 'Select Option'}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {searchable && (
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search..."
                containerStyle={styles.searchContainer}
              />
            )}

            <FlatList
              data={filteredItems}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              style={styles.modalList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{emptyText}</Text>
                </View>
              }
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 6,
  },
  required: {
    color: colors.error,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F4FD',
    minHeight: 48,
  },
  selectorError: {
    borderColor: colors.error,
  },
  selectorDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    color: colors.darkText,
  },
  selectorPlaceholder: {
    color: colors.grayText,
    fontStyle: 'italic',
  },
  selectorTextDisabled: {
    color: colors.grayText,
  },
  chevron: {
    fontSize: 12,
    color: colors.grayText,
    marginLeft: 8,
  },
  chevronDisabled: {
    color: '#C0C0C0',
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F4FD',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkText,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.grayText,
    fontWeight: '600',
  },
  searchContainer: {
    margin: 16,
    marginBottom: 8,
  },
  modalList: {
    maxHeight: 300,
  },
  modalItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalItemSelected: {
    backgroundColor: '#E8F4FD',
  },
  modalItemText: {
    fontSize: 16,
    color: colors.darkText,
    fontWeight: '500',
  },
  modalItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalItemSubtitle: {
    fontSize: 14,
    color: colors.grayText,
    marginTop: 2,
  },
  modalItemSubtitleSelected: {
    color: colors.primary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.grayText,
    fontStyle: 'italic',
  },
});
