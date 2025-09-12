/**
 * CSV Backup Card Component
 * 
 * Reusable card component for CSV backup actions with loading states
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface CSVBackupCardProps {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export const CSVBackupCard: React.FC<CSVBackupCardProps> = ({
  title,
  subtitle,
  icon,
  onPress,
  loading = false,
  disabled = false
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, disabled && styles.disabledCard]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {loading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <MaterialIcons 
            name={icon} 
            size={24} 
            color={disabled ? '#999' : '#007AFF'} 
          />
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.title, disabled && styles.disabledText]}>
          {title}
        </Text>
        <Text style={[styles.subtitle, disabled && styles.disabledText]}>
          {subtitle}
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
    backgroundColor: '#f0f8ff',
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
  subtitle: {
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
