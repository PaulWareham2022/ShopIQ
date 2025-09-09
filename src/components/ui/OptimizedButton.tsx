import React, { memo, useCallback } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';
import { colors } from '../../constants/colors';

export type OptimizedButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type OptimizedButtonSize = 'small' | 'medium' | 'large';

interface OptimizedButtonProps {
  title: string;
  onPress: () => void;
  variant?: OptimizedButtonVariant;
  size?: OptimizedButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
  testID?: string;
}

export const OptimizedButton = memo<OptimizedButtonProps>(({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  fullWidth = false,
  testID,
}) => {
  const handlePress = useCallback(() => {
    if (!disabled && !loading) {
      onPress();
    }
  }, [onPress, disabled, loading]);

  const getButtonMode = () => {
    switch (variant) {
      case 'primary':
        return 'contained';
      case 'secondary':
        return 'outlined';
      case 'danger':
        return 'contained';
      case 'ghost':
        return 'text';
      default:
        return 'contained';
    }
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 25,
    };

    if (fullWidth) {
      baseStyle.flex = 1;
    }

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.paddingVertical = 8;
        baseStyle.paddingHorizontal = 16;
        break;
      case 'large':
        baseStyle.paddingVertical = 16;
        baseStyle.paddingHorizontal = 24;
        break;
      default: // medium
        baseStyle.paddingVertical = 12;
        baseStyle.paddingHorizontal = 20;
        break;
    }

    return baseStyle;
  };

  const getButtonTheme = () => {
    const baseTheme = {
      colors: {
        primary: colors.primary,
        error: colors.error,
        surface: colors.white,
        onSurface: colors.darkText,
        outline: colors.lightGray,
      },
    };

    switch (variant) {
      case 'danger':
        return {
          ...baseTheme,
          colors: {
            ...baseTheme.colors,
            primary: colors.error,
          },
        };
      case 'secondary':
        return {
          ...baseTheme,
          colors: {
            ...baseTheme.colors,
            primary: colors.primary,
            surface: colors.white,
            outline: colors.primary,
          },
        };
      case 'ghost':
        return {
          ...baseTheme,
          colors: {
            ...baseTheme.colors,
            primary: colors.primary,
            surface: 'transparent',
          },
        };
      default:
        return baseTheme;
    }
  };

  const getTextColor = () => {
    if (disabled || loading) {
      return colors.grayText;
    }

    switch (variant) {
      case 'primary':
      case 'danger':
        return colors.white;
      case 'secondary':
        return colors.primary;
      case 'ghost':
        return colors.primary;
      default:
        return colors.white;
    }
  };

  return (
    <View style={[getButtonStyle(), style]}>
      <PaperButton
        mode={getButtonMode()}
        onPress={handlePress}
        disabled={disabled || loading}
        loading={loading}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={[
          styles.buttonLabel,
          { color: getTextColor() },
          size === 'small' && styles.buttonLabelSmall,
          size === 'large' && styles.buttonLabelLarge,
        ]}
        theme={getButtonTheme()}
        testID={testID}
      >
        {title}
      </PaperButton>
    </View>
  );
});

OptimizedButton.displayName = 'OptimizedButton';

const styles = StyleSheet.create({
  button: {
    borderRadius: 25,
  },
  buttonContent: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonLabelSmall: {
    fontSize: 14,
  },
  buttonLabelLarge: {
    fontSize: 18,
  },
});
