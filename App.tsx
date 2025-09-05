import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { testStorageIntegration } from './src/storage/test-storage';
import { initializeDatabase } from './src/storage/sqlite/database';
import { colors } from './src/constants/colors';
import { InventoryListScreen } from './src/screens/inventory/InventoryListScreen';
import { InventoryItemDetailScreen } from './src/screens/inventory/InventoryItemDetailScreen';
import { InventoryItem } from './src/storage/repositories/InventoryItemRepository';

type Screen = 'home' | 'inventory-list' | 'inventory-detail' | 'inventory-add';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [storageStatus, setStorageStatus] = useState<
    'testing' | 'success' | 'error'
  >('testing');

  useEffect(() => {
    const initStorage = async () => {
      try {
        if (__DEV__) {
          await testStorageIntegration();
        } else {
          await initializeDatabase();
        }
        setStorageStatus('success');
      } catch {
        // Error handling is done via UI state
        setStorageStatus('error');
      }
    };

    initStorage();
  }, []);

  const handleItemPress = (item: InventoryItem) => {
    setSelectedItem(item);
    setCurrentScreen('inventory-detail');
  };

  const handleAddItem = () => {
    setSelectedItem(null);
    setCurrentScreen('inventory-add');
  };

  const handleBackToList = () => {
    setCurrentScreen('inventory-list');
    setSelectedItem(null);
  };

  const handleItemSaved = () => {
    setCurrentScreen('inventory-list');
    setSelectedItem(null);
  };

  const renderHomeScreen = () => (
    <View style={styles.container}>
      <Text style={styles.title}>ShopIQ</Text>
      <Text style={styles.subtitle}>Smart grocery price comparison app</Text>
      <Text style={styles.info}>Expo SDK 53 + New Architecture ✅</Text>
      <Text
        style={[
          styles.info,
          storageStatus === 'success' && styles.success,
          storageStatus === 'error' && styles.error,
        ]}
      >
        SQLite & MMKV{' '}
        {storageStatus === 'testing'
          ? '🔧'
          : storageStatus === 'success'
            ? '✅'
            : '❌'}
      </Text>

      {storageStatus === 'success' && (
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setCurrentScreen('inventory-list')}
          >
            <Text style={styles.menuButtonText}>📦 Inventory Management</Text>
          </TouchableOpacity>
        </View>
      )}

      <StatusBar style="auto" />
    </View>
  );

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'home':
        return renderHomeScreen();
      case 'inventory-list':
        return (
          <InventoryListScreen
            onItemPress={handleItemPress}
            onAddItem={handleAddItem}
          />
        );
      case 'inventory-detail':
        return (
          <InventoryItemDetailScreen
            itemId={selectedItem?.id}
            onBack={handleBackToList}
            onItemSaved={handleItemSaved}
          />
        );
      case 'inventory-add':
        return (
          <InventoryItemDetailScreen
            onBack={handleBackToList}
            onItemSaved={handleItemSaved}
          />
        );
      default:
        return renderHomeScreen();
    }
  };

  return renderCurrentScreen();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.darkText,
  },
  subtitle: {
    fontSize: 16,
    color: colors.grayText,
    marginBottom: 24,
    textAlign: 'center',
  },
  info: {
    fontSize: 14,
    color: colors.success,
    marginBottom: 8,
  },
  success: {
    color: colors.success,
  },
  error: {
    color: colors.error,
  },
  menuContainer: {
    marginTop: 40,
    width: '100%',
    maxWidth: 300,
  },
  menuButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  menuButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
