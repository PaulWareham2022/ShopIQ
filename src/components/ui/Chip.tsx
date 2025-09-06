import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../constants/colors';

export type ChipVariant = 'weight' | 'volume' | 'count' | 'length' | 'area' | 'default';
export type ChipSize = 'small' | 'medium' | 'large';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  variant?: ChipVariant;
  size?: ChipSize;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  variant = 'default',
  size = 'medium',
  disabled = false,
  style,
  textStyle,
}) => {
  const getChipStyle = (): ViewStyle[] => {
    const baseStyle = [styles.chip];
    
    // Size styles
    if (size === 'small') baseStyle.push(styles.chipSmall);
    else if (size === 'large') baseStyle.push(styles.chipLarge);
    else baseStyle.push(styles.chipMedium);
    
    // Variant styles
    if (variant === 'weight') baseStyle.push(styles.chipWeight);
    else if (variant === 'volume') baseStyle.push(styles.chipVolume);
    else if (variant === 'count') baseStyle.push(styles.chipCount);
    else if (variant === 'length') baseStyle.push(styles.chipLength);
    else if (variant === 'area') baseStyle.push(styles.chipArea);
    else baseStyle.push(styles.chipDefault);
    
    if (selected) {
      baseStyle.push(styles.chipSelected);
    }
    
    if (disabled) {
      baseStyle.push(styles.chipDisabled);
    }
    
    if (style) {
      baseStyle.push(style);
    }
    
    return baseStyle;
  };

  const getTextStyle = (): TextStyle[] => {
    const baseStyle = [styles.chipText];
    
    // Size styles
    if (size === 'small') baseStyle.push(styles.chipTextSmall);
    else if (size === 'large') baseStyle.push(styles.chipTextLarge);
    else baseStyle.push(styles.chipTextMedium);
    
    if (selected) {
      baseStyle.push(styles.chipTextSelected);
    }
    
    if (disabled) {
      baseStyle.push(styles.chipTextDisabled);
    }
    
    if (textStyle) {
      baseStyle.push(textStyle);
    }
    
    return baseStyle;
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={getChipStyle()}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={getTextStyle()}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={getChipStyle()} disabled>
      <Text style={getTextStyle()}>{label}</Text>
    </TouchableOpacity>
  );
};


const styles = StyleSheet.create({
  chip: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 6,
  },
  
  // Sizes
  chipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    minWidth: 32,
  },
  chipMedium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    minWidth: 44,
  },
  chipLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    minWidth: 56,
  },
  
  // Variants
  chipDefault: {
    backgroundColor: '#F0F0F0',
    borderColor: '#D0D0D0',
  },
  chipWeight: {
    backgroundColor: '#FFF0F0',
    borderColor: '#FF9999',
  },
  chipVolume: {
    backgroundColor: '#E6F3FF',
    borderColor: '#99CCFF',
  },
  chipCount: {
    backgroundColor: '#E8F5E8',
    borderColor: '#99E699',
  },
  chipLength: {
    backgroundColor: '#FFF4E6',
    borderColor: '#FFB366',
  },
  chipArea: {
    backgroundColor: '#F3E8FF',
    borderColor: '#CC99FF',
  },
  
  // States
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  chipDisabled: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E8E8E8',
    opacity: 0.6,
  },
  
  // Text styles
  chipText: {
    fontWeight: '600',
    textAlign: 'center',
    color: colors.darkText,
  },
  
  // Text sizes
  chipTextSmall: {
    fontSize: 11,
  },
  chipTextMedium: {
    fontSize: 13,
  },
  chipTextLarge: {
    fontSize: 15,
  },
  
  // Text states
  chipTextSelected: {
    color: colors.white,
  },
  chipTextDisabled: {
    color: colors.grayText,
  },
});
