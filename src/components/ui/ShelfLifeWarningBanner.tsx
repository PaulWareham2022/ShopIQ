import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

export interface ShelfLifeWarningBannerProps {
  /** The warning message to display */
  message: string;

  /** The severity level of the warning */
  severity: 'info' | 'warning' | 'high';

  /** Whether to show the warning banner */
  visible?: boolean;

  /** Custom container style */
  style?: ViewStyle;

  /** Test ID for testing */
  testID?: string;
}

export const ShelfLifeWarningBanner: React.FC<ShelfLifeWarningBannerProps> = ({
  message,
  severity,
  visible = true,
  style,
  testID,
}) => {
  if (!visible) {
    return null;
  }

  const getContainerStyle = () => {
    switch (severity) {
      case 'high':
        return styles.containerHigh;
      case 'warning':
        return styles.containerWarning;
      case 'info':
      default:
        return styles.containerInfo;
    }
  };

  const getTextStyle = () => {
    switch (severity) {
      case 'high':
        return styles.textHigh;
      case 'warning':
        return styles.textWarning;
      case 'info':
      default:
        return styles.textInfo;
    }
  };

  const getIcon = () => {
    switch (severity) {
      case 'high':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <View
      style={[styles.container, getContainerStyle(), style]}
      testID={testID}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{getIcon()}</Text>
        <Text style={[styles.message, getTextStyle()]}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
  },
  containerInfo: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  containerWarning: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  containerHigh: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  textInfo: {
    color: '#1976D2',
  },
  textWarning: {
    color: '#F57C00',
  },
  textHigh: {
    color: '#D32F2F',
  },
});
