/**
 * Backup Card Component
 * Displays backup information and actions
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface BackupCardProps {
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'warning';
}

export const BackupCard: React.FC<BackupCardProps> = ({
  title,
  description,
  icon,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary'
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          iconColor: '#FF9800',
          iconBackground: '#FFF3E0',
          textColor: '#333'
        };
      case 'secondary':
        return {
          iconColor: '#757575',
          iconBackground: '#F5F5F5',
          textColor: '#333'
        };
      default:
        return {
          iconColor: '#007AFF',
          iconBackground: '#f0f8ff',
          textColor: '#333'
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <TouchableOpacity
      style={[styles.card, disabled && styles.disabledCard]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: variantStyles.iconBackground }]}>
        {loading ? (
          <ActivityIndicator size="small" color={variantStyles.iconColor} />
        ) : (
          <MaterialIcons 
            name={icon} 
            size={24} 
            color={disabled ? '#999' : variantStyles.iconColor} 
          />
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.title, disabled && styles.disabledText]}>
          {title}
        </Text>
        <Text style={[styles.description, disabled && styles.disabledText]}>
          {description}
        </Text>
      </View>
      
      <View style={styles.arrowContainer}>
        <MaterialIcons 
          name="chevron-right" 
          size={20} 
          color={disabled ? '#999' : '#666'} 
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  disabledCard: {
    backgroundColor: '#f5f5f5',
    shadowOpacity: 0.05,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  disabledText: {
    color: '#999',
  },
  arrowContainer: {
    marginLeft: 8,
  },
});
