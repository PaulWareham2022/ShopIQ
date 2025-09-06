import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../constants/colors';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
  style?: ViewStyle;
  iconStyle?: TextStyle;
  size?: 'small' | 'medium' | 'large';
  backgroundColor?: string;
  iconColor?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon = '+',
  disabled = false,
  style,
  iconStyle,
  size = 'medium',
  backgroundColor = colors.primary,
  iconColor = colors.white,
}) => {
  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.small;
      case 'large':
        return styles.large;
      default:
        return styles.medium;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return styles.iconSmall;
      case 'large':
        return styles.iconLarge;
      default:
        return styles.iconMedium;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        getSizeStyle(),
        { backgroundColor },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text
        style={[styles.icon, getIconSize(), { color: iconColor }, iconStyle]}
      >
        {icon}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  small: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  medium: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  large: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  icon: {
    fontWeight: '300',
    textAlign: 'center',
  },
  iconSmall: {
    fontSize: 20,
  },
  iconMedium: {
    fontSize: 24,
  },
  iconLarge: {
    fontSize: 28,
  },
  disabled: {
    opacity: 0.6,
  },
});
