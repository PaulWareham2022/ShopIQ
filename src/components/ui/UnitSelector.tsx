import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Chip, ChipVariant } from './Chip';
import { Input } from './Input';

export interface UnitGroup {
  variant: ChipVariant;
  units: string[];
}

interface UnitSelectorProps {
  value: string;
  onValueChange: (unit: string) => void;
  unitGroups: UnitGroup[];
  customInputPlaceholder?: string;
  containerStyle?: ViewStyle;
  error?: string;
  label?: string;
  required?: boolean;
}

const DEFAULT_UNIT_GROUPS: UnitGroup[] = [
  { variant: 'weight', units: ['kg', 'g', 'lb', 'oz'] },
  { variant: 'volume', units: ['L', 'ml', 'gal', 'fl oz'] },
  { variant: 'count', units: ['unit', 'piece', 'dozen', 'pack'] },
  { variant: 'length', units: ['m', 'cm', 'ft', 'in', 'inches'] },
  { variant: 'area', units: ['m²', 'cm²', 'ft²', 'in²'] },
];

export const UnitSelector: React.FC<UnitSelectorProps> = ({
  value,
  onValueChange,
  unitGroups = DEFAULT_UNIT_GROUPS,
  customInputPlaceholder = 'Or search',
  containerStyle,
  error,
  label,
  required = false,
}) => {
  // Get all predefined units for checking if current value is custom
  const allPredefinedUnits = unitGroups.flatMap(group => group.units);
  const isCustomUnit = value.length > 0 && !allPredefinedUnits.includes(value);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Input
          label={label}
          required={required}
          value="" // We don't show the selected value in the input
          style={styles.hiddenInput}
          editable={false}
        />
      )}

      <View style={styles.chipContainer}>
        {unitGroups.map(group =>
          group.units.map(unit => (
            <Chip
              key={unit}
              label={unit}
              variant={group.variant}
              selected={value === unit}
              onPress={() => onValueChange(unit)}
            />
          ))
        )}
      </View>

      <Input
        value={value}
        onChangeText={onValueChange}
        placeholder={customInputPlaceholder}
        inputStyle={[
          styles.customInput,
          !isCustomUnit && styles.predefinedUnitInput,
        ]}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="default"
        textContentType="none"
        spellCheck={false}
        clearButtonMode="while-editing"
        error={error}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  hiddenInput: {
    height: 0,
    marginBottom: 0,
    opacity: 0,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  customInput: {
    fontStyle: 'italic',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
  },
  predefinedUnitInput: {
    backgroundColor: '#F5F5F5',
    fontStyle: 'normal',
    color: '#666',
  },
});
