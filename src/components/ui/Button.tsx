import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../constants/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getButtonStyle = (): ViewStyle[] => {
    const baseStyle = [styles.button];

    // Size styles
    if (size === 'small') baseStyle.push(styles.buttonSmall);
    else if (size === 'large') baseStyle.push(styles.buttonLarge);
    else baseStyle.push(styles.buttonMedium);

    if (fullWidth) {
      baseStyle.push(styles.buttonFullWidth);
    }

    // Variant styles
    if (disabled || loading) {
      if (variant === 'primary') baseStyle.push(styles.buttonPrimaryDisabled);
      else if (variant === 'secondary')
        baseStyle.push(styles.buttonSecondaryDisabled);
      else if (variant === 'danger')
        baseStyle.push(styles.buttonDangerDisabled);
      else baseStyle.push(styles.buttonGhostDisabled);
    } else {
      if (variant === 'primary') baseStyle.push(styles.buttonPrimary);
      else if (variant === 'secondary') baseStyle.push(styles.buttonSecondary);
      else if (variant === 'danger') baseStyle.push(styles.buttonDanger);
      else baseStyle.push(styles.buttonGhost);
    }

    if (style) {
      baseStyle.push(style);
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle[] => {
    const baseStyle = [styles.buttonText];

    // Size styles
    if (size === 'small') baseStyle.push(styles.buttonTextSmall);
    else if (size === 'large') baseStyle.push(styles.buttonTextLarge);
    else baseStyle.push(styles.buttonTextMedium);

    // Variant styles
    if (disabled || loading) {
      if (variant === 'primary')
        baseStyle.push(styles.buttonTextPrimaryDisabled);
      else if (variant === 'secondary')
        baseStyle.push(styles.buttonTextSecondaryDisabled);
      else if (variant === 'danger')
        baseStyle.push(styles.buttonTextDangerDisabled);
      else baseStyle.push(styles.buttonTextGhostDisabled);
    } else {
      if (variant === 'primary') baseStyle.push(styles.buttonTextPrimary);
      else if (variant === 'secondary')
        baseStyle.push(styles.buttonTextSecondary);
      else if (variant === 'danger') baseStyle.push(styles.buttonTextDanger);
      else baseStyle.push(styles.buttonTextGhost);
    }

    if (textStyle) {
      baseStyle.push(textStyle);
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.white : colors.primary}
        />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonFullWidth: {
    flex: 1,
  },

  // Sizes
  buttonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buttonMedium: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  buttonLarge: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },

  // Primary variant
  buttonPrimary: {
    backgroundColor: '#007AFF',
    boxShadow: '0px 3px 6px rgba(0, 122, 255, 0.3)',
    elevation: 4,
  },
  buttonPrimaryDisabled: {
    backgroundColor: '#C7C7CC',
    boxShadow: '0px 1px 2px rgba(199, 199, 204, 0.1)',
  },

  // Secondary variant
  buttonSecondary: {
    backgroundColor: '#F8FBFF',
    borderWidth: 2,
    borderColor: '#E8F4FD',
    boxShadow: '0px 1px 3px rgba(0, 122, 255, 0.05)',
    elevation: 1,
  },
  buttonSecondaryDisabled: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E8E8E8',
    boxShadow: 'none',
  },

  // Danger variant
  buttonDanger: {
    backgroundColor: colors.error,
    boxShadow: '0px 3px 6px rgba(255, 59, 48, 0.3)',
    elevation: 4,
  },
  buttonDangerDisabled: {
    backgroundColor: '#FFB3B3',
    boxShadow: '0px 1px 2px rgba(255, 179, 179, 0.1)',
  },

  // Ghost variant
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonGhostDisabled: {
    backgroundColor: 'transparent',
  },

  // Text styles
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },

  // Text sizes
  buttonTextSmall: {
    fontSize: 14,
  },
  buttonTextMedium: {
    fontSize: 16,
  },
  buttonTextLarge: {
    fontSize: 18,
  },

  // Text variants
  buttonTextPrimary: {
    color: colors.white,
  },
  buttonTextPrimaryDisabled: {
    color: colors.white,
  },
  buttonTextSecondary: {
    color: '#007AFF',
  },
  buttonTextSecondaryDisabled: {
    color: colors.grayText,
  },
  buttonTextDanger: {
    color: colors.white,
  },
  buttonTextDangerDisabled: {
    color: colors.white,
  },
  buttonTextGhost: {
    color: colors.primary,
  },
  buttonTextGhostDisabled: {
    color: colors.grayText,
  },
});
