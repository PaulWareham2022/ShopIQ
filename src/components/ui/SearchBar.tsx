import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { colors } from '../../constants/colors';

interface SearchBarProps extends Omit<TextInputProps, 'style'> {
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  icon?: string;
  onSearch?: (query: string) => void;
  showSearchButton?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  containerStyle,
  inputStyle,
  icon = '🔍',
  placeholder = 'Search...',
  onSearch,
  showSearchButton = true,
  value,
  onChangeText,
  ...textInputProps
}) => {
  const [internalValue, setInternalValue] = useState('');
  const currentValue = value !== undefined ? value : internalValue;
  const currentOnChangeText = onChangeText || setInternalValue;

  const handleSearch = () => {
    if (onSearch) {
      onSearch(currentValue);
    }
  };

  const handleClear = () => {
    currentOnChangeText('');
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.inputContainer}>
        <Text style={styles.icon}>{icon}</Text>
        <TextInput
          style={[styles.input, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={colors.grayText}
          value={currentValue}
          onChangeText={currentOnChangeText}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          {...textInputProps}
        />
        {currentValue.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
        {showSearchButton && (
          <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  inputContainer: {
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
  icon: {
    fontSize: 16,
    marginRight: 8,
    color: colors.grayText,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.darkText,
    marginRight: 8,
  },
  clearButton: {
    padding: 4,
    marginRight: 8,
  },
  clearIcon: {
    fontSize: 16,
    color: colors.grayText,
    fontWeight: 'bold',
  },
  searchButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  searchButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
