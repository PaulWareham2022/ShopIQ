import React, { memo, useCallback } from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { TextInput as PaperTextInput, HelperText } from 'react-native-paper';
import { colors } from '../../constants/colors';

interface OptimizedInputProps {
  label?: string;
  value: string | undefined;
  onChangeText: (text: string) => void;
  onBlur?: (e?: unknown) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  _labelStyle?: TextStyle;
  helpText?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'url';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  editable?: boolean;
  secureTextEntry?: boolean;
  testID?: string;
  _fieldName?: string;
  onKeyPress?: (e: unknown) => void;
  onFocus?: (e: unknown) => void;
  onSubmitEditing?: (e: unknown) => void;
  returnKeyType?: 'done' | 'next' | 'search' | 'send' | 'go' | 'default';
}

export const OptimizedInput = memo<OptimizedInputProps>(({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  required = false,
  containerStyle,
  inputStyle,
  _labelStyle,
  helpText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  editable = true,
  secureTextEntry = false,
  testID,
  _fieldName,
  onKeyPress,
  onFocus,
  onSubmitEditing,
  returnKeyType = 'default',
}) => {

  const handleChangeText = useCallback((text: string) => {
    onChangeText(text);
  }, [onChangeText]);

  const handleBlur = useCallback((e: unknown) => {
    onBlur?.(e as any);
  }, [onBlur]);

  const handleKeyPress = useCallback((e: unknown) => {
    onKeyPress?.(e);
  }, [onKeyPress]);

  const handleFocus = useCallback((e: unknown) => {
    onFocus?.(e);
  }, [onFocus]);

  const handleSubmitEditing = useCallback((e: unknown) => {
    onSubmitEditing?.(e);
  }, [onSubmitEditing]);

  const hasError = Boolean(error);

  return (
    <View style={[styles.container, containerStyle]}>
      <PaperTextInput
        label={label ? `${label}${required ? ' *' : ''}` : undefined}
        value={value || ''}
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyPress={handleKeyPress}
        onSubmitEditing={handleSubmitEditing}
        placeholder={placeholder}
        mode="outlined"
        error={hasError}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={maxLength}
        editable={editable}
        secureTextEntry={secureTextEntry}
        returnKeyType={returnKeyType}
        testID={testID}
        style={[styles.input, inputStyle]}
        contentStyle={styles.inputContent}
        outlineStyle={[
          styles.outline,
          hasError && styles.outlineError,
        ]}
        theme={{
          colors: {
            primary: colors.primary,
            error: colors.error,
            surface: colors.white,
            onSurface: colors.darkText,
            outline: hasError ? colors.error : colors.lightGray,
            onSurfaceVariant: colors.grayText,
          },
        }}
      />
      
      {hasError && (
        <HelperText type="error" visible={hasError} style={styles.errorText}>
          {error}
        </HelperText>
      )}
      
      {helpText && !hasError && (
        <HelperText type="info" visible={true} style={styles.helpText}>
          {helpText}
        </HelperText>
      )}
    </View>
  );
});

OptimizedInput.displayName = 'OptimizedInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.white,
  },
  inputContent: {
    fontSize: 16,
    color: colors.darkText,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  outlineError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: colors.grayText,
    marginTop: 4,
  },
});
