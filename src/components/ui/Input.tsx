import React from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps as RNTextInputProps,
} from 'react-native';
import { colors } from '../../constants/colors';

interface InputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  helpText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  required = false,
  containerStyle,
  inputStyle,
  labelStyle,
  helpText,
  ...textInputProps
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <RNTextInput
        style={[
          styles.input,
          error && styles.inputError,
          inputStyle,
        ]}
        placeholderTextColor={colors.grayText}
        {...textInputProps}
      />
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      {helpText && !error && <Text style={styles.helpText}>{helpText}</Text>}
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
  input: {
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.darkText,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: colors.darkText,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 4,
  },
  helpText: {
    fontSize: 14,
    color: colors.grayText,
    marginTop: 4,
  },
});
