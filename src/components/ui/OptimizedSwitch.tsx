import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Switch as PaperSwitch } from 'react-native-paper';
import { colors } from '../../constants/colors';

interface OptimizedSwitchProps {
  label?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  testID?: string;
}

export const OptimizedSwitch = memo<OptimizedSwitchProps>(({
  label,
  value,
  onValueChange,
  disabled = false,
  containerStyle,
  testID,
}) => {
  const handleValueChange = useCallback((newValue: boolean) => {
    onValueChange(newValue);
  }, [onValueChange]);

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.switchContainer}>
        {label && (
          <Text style={styles.label}>{label}</Text>
        )}
        <PaperSwitch
          value={value}
          onValueChange={handleValueChange}
          disabled={disabled}
          testID={testID}
          theme={{
            colors: {
              primary: colors.primary,
              surface: colors.white,
              onSurface: colors.darkText,
            },
          }}
        />
      </View>
    </View>
  );
});

OptimizedSwitch.displayName = 'OptimizedSwitch';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.darkText,
    flex: 1,
    marginRight: 16,
  },
});
