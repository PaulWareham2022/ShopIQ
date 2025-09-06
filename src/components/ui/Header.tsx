import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../constants/colors';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  onAction?: () => void;
  actionTitle?: string;
  backTitle?: string;
  centerTitle?: boolean;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  backButtonStyle?: ViewStyle;
  actionButtonStyle?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onBack,
  onAction,
  actionTitle,
  backTitle = '← Back',
  centerTitle = true,
  containerStyle,
  titleStyle,
  backButtonStyle,
  actionButtonStyle,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {onBack ? (
        <TouchableOpacity 
          style={[styles.backButton, backButtonStyle]} 
          onPress={onBack}
        >
          <Text style={styles.backButtonText}>{backTitle}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}
      
      <Text style={[
        styles.title,
        centerTitle && styles.titleCentered,
        titleStyle
      ]}>
        {title}
      </Text>
      
      {onAction && actionTitle ? (
        <TouchableOpacity 
          style={[styles.actionButton, actionButtonStyle]} 
          onPress={onAction}
        >
          <Text style={styles.actionButtonText}>{actionTitle}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F4FD',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.darkText,
  },
  titleCentered: {
    flex: 1,
    textAlign: 'center',
  },
  actionButton: {
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  spacer: {
    width: 60, // Approximate width to balance the header
  },
});
