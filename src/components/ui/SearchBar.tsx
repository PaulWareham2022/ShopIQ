import React from 'react';
import {
  View,
  Text,
  TextInput,
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
}

export const SearchBar: React.FC<SearchBarProps> = ({
  containerStyle,
  inputStyle,
  icon = '🔍',
  placeholder = 'Search...',
  ...textInputProps
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.inputContainer}>
        <Text style={styles.icon}>{icon}</Text>
        <TextInput
          style={[styles.input, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={colors.grayText}
          {...textInputProps}
        />
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
  },
});
