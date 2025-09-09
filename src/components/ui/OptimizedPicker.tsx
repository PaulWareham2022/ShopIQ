import React, { memo, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Searchbar, HelperText } from 'react-native-paper';
import { colors } from '../../constants/colors';

export interface OptimizedPickerItem {
  id: string;
  label: string;
  subtitle?: string;
}

interface OptimizedPickerProps {
  label?: string;
  required?: boolean;
  value?: string;
  onValueChange: (value: string) => void;
  items: OptimizedPickerItem[];
  placeholder?: string;
  error?: string;
  containerStyle?: ViewStyle;
  disabled?: boolean;
  searchable?: boolean;
  emptyText?: string;
  testID?: string;
}

export const OptimizedPicker = memo<OptimizedPickerProps>(({
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
  testID,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Find selected item
  const selectedItem = useMemo(() => 
    items.find(item => item.id === value), 
    [items, value]
  );

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchable || !searchQuery.trim()) {
      return items;
    }
    
    const query = searchQuery.toLowerCase();
    return items.filter(
      item =>
        item.label.toLowerCase().includes(query) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(query))
    );
  }, [items, searchQuery, searchable]);

  const handleSelect = useCallback((itemId: string) => {
    onValueChange(itemId);
    setIsVisible(false);
    setSearchQuery('');
  }, [onValueChange]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setSearchQuery('');
  }, []);

  const handleOpen = useCallback(() => {
    if (!disabled) {
      setIsVisible(true);
    }
  }, [disabled]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const renderItem = useCallback(({ item }: { item: OptimizedPickerItem }) => (
    <TouchableOpacity
      style={[
        styles.modalItem,
        item.id === value && styles.modalItemSelected,
      ]}
      onPress={() => handleSelect(item.id)}
      testID={`${testID}-item-${item.id}`}
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
  ), [value, handleSelect, testID]);

  const keyExtractor = useCallback((item: OptimizedPickerItem) => item.id, []);

  const hasError = Boolean(error);

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        style={[
          styles.selector,
          hasError && styles.selectorError,
          disabled && styles.selectorDisabled,
        ]}
        onPress={handleOpen}
        disabled={disabled}
        testID={testID}
      >
        <View style={styles.selectorContent}>
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
        </View>
      </TouchableOpacity>

      {hasError && (
        <HelperText type="error" visible={hasError} style={styles.errorText}>
          {error}
        </HelperText>
      )}

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
              <Text style={styles.modalTitle}>
                {label ? `${label}${required ? ' *' : ''}` : 'Select Option'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                testID={`${testID}-close`}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {searchable && (
              <Searchbar
                placeholder="Search..."
                onChangeText={handleSearchChange}
                value={searchQuery}
                style={styles.searchContainer}
                inputStyle={styles.searchInput}
                testID={`${testID}-search`}
              />
            )}

            <FlatList
              data={filteredItems}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              style={styles.modalList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{emptyText}</Text>
                </View>
              }
              testID={`${testID}-list`}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

OptimizedPicker.displayName = 'OptimizedPicker';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  selector: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.lightGray,
    minHeight: 48,
  },
  selectorError: {
    borderColor: colors.error,
  },
  selectorDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  searchInput: {
    fontSize: 16,
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
