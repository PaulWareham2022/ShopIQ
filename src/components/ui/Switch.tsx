import React from 'react';
import {
  View,
  Text,
  Switch as RNSwitch,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../constants/colors';

interface SwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  helpText?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  label,
  value,
  onValueChange,
  disabled = false,
  containerStyle,
  labelStyle,
  helpText,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.switchContainer}>
        <Text style={[styles.label, disabled && styles.labelDisabled, labelStyle]}>
          {label}
        </Text>
        <RNSwitch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{
            false: colors.lightGray,
            true: colors.primary,
          }}
          thumbColor={value ? colors.white : colors.grayText}
        />
      </View>
      {helpText && <Text style={styles.helpText}>{helpText}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkText,
    flex: 1,
    marginRight: 16,
  },
  labelDisabled: {
    color: colors.grayText,
  },
  helpText: {
    fontSize: 14,
    color: colors.grayText,
    marginTop: 4,
  },
});
