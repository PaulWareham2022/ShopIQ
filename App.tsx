import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { testStorageIntegration } from './src/storage/test-storage';
import { colors } from './src/constants/colors';

export default function App() {
  const [storageStatus, setStorageStatus] = useState<
    'testing' | 'success' | 'error'
  >('testing');

  useEffect(() => {
    const initStorage = async () => {
      try {
        await testStorageIntegration();
        setStorageStatus('success');
      } catch (error) {
        if (__DEV__) {
          console.error('Storage initialization failed:', error);
        }
        setStorageStatus('error');
      }
    };

    initStorage();
  }, []);

  return (
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
      <StatusBar style="auto" />
    </View>
  );
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
});
