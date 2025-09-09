import React, { forwardRef, useImperativeHandle, useRef } from 'react';
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

interface InputProps extends Omit<RNTextInputProps, 'style' | 'onFocus' | 'onKeyPress'> {
  label?: string;
  error?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  helpText?: string;
  fieldName?: string;
  onKeyPress?: (event: any, fieldName: string) => void;
  onFocus?: (fieldName: string) => void;
  autoFocusNext?: boolean;
  // Mobile-specific props
  mobileKeyboardType?: 'numeric' | 'email-address' | 'phone-pad' | 'default';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
}

export interface InputRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
}

export const Input = forwardRef<InputRef, InputProps>(({
  label,
  error,
  required = false,
  containerStyle,
  inputStyle,
  labelStyle,
  helpText,
  fieldName,
  onKeyPress,
  onFocus,
  autoFocusNext = false,
  mobileKeyboardType,
  autoCapitalize = 'sentences',
  autoCorrect = true,
  ...textInputProps
}, ref) => {
  const inputRef = useRef<RNTextInput>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    clear: () => inputRef.current?.clear(),
  }));

  const handleKeyPress = (event: any) => {
    if (onKeyPress && fieldName) {
      onKeyPress(event, fieldName);
    }
  };

  const handleFocus = () => {
    if (onFocus && fieldName) {
      onFocus(fieldName);
    }
  };

  const handleSubmitEditing = () => {
    if (autoFocusNext && onKeyPress && fieldName) {
      // Simulate Enter key press for auto-focus next
      onKeyPress({ nativeEvent: { key: 'Enter' } }, fieldName);
    }
  };

  // Mobile-optimized keyboard type selection
  const getKeyboardType = () => {
    if (mobileKeyboardType) {
      return mobileKeyboardType;
    }
    // Auto-detect based on field name for common patterns
    if (fieldName?.includes('price') || fieldName?.includes('amount') || fieldName?.includes('rate')) {
      return 'numeric';
    }
    if (fieldName?.includes('url') || fieldName?.includes('email')) {
      return 'email-address';
    }
    return 'default';
  };

  // Mobile-optimized auto-capitalization
  const getAutoCapitalize = () => {
    if (fieldName?.includes('unit') || fieldName?.includes('code') || fieldName?.includes('currency')) {
      return 'characters';
    }
    if (fieldName?.includes('url') || fieldName?.includes('email')) {
      return 'none';
    }
    return autoCapitalize;
  };

  // Mobile-optimized auto-correction
  const getAutoCorrect = () => {
    if (fieldName?.includes('unit') || fieldName?.includes('code') || fieldName?.includes('url')) {
      return false;
    }
    return autoCorrect;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <RNTextInput
        ref={inputRef}
        style={[styles.input, error && styles.inputError, inputStyle]}
        placeholderTextColor={colors.grayText}
        onKeyPress={handleKeyPress}
        onFocus={handleFocus}
        onSubmitEditing={handleSubmitEditing}
        returnKeyType={autoFocusNext ? 'next' : 'done'}
        keyboardType={getKeyboardType()}
        autoCapitalize={getAutoCapitalize()}
        autoCorrect={getAutoCorrect()}
        {...textInputProps}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}
      {helpText && !error && <Text style={styles.helpText}>{helpText}</Text>}
    </View>
  );
});

Input.displayName = 'Input';

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
