import { initializeDatabase, executeSql } from './sqlite/database';
import { appStorageWrapper, STORAGE_KEYS } from './mmkv/storage';
import { Platform } from 'react-native';

// Test function to verify both storage systems are working
export const testStorageIntegration = async (): Promise<void> => {
  // Early return in production builds to avoid unnecessary I/O
  if (!__DEV__) return;

  console.log('🔧 Testing storage integration...');
  console.log(`Platform: ${Platform.OS}`);

  try {
    // Test SQLite
    console.log('📊 Testing SQLite...');
    await initializeDatabase();

    // Test basic SQLite query
    const testResult = await executeSql(
      'SELECT name FROM sqlite_master WHERE type="table"'
    );
    console.log(`✅ SQLite initialized with ${testResult.rows.length} tables`);

    // Test MMKV
    console.log('🗄️ Testing MMKV...');

    // Test basic MMKV operations
    const testKeys = ['test_key_basic', 'test_object_json'];

    appStorageWrapper.set(testKeys[0], 'test_value');
    const testValue = appStorageWrapper.getString(testKeys[0]);

    if (testValue === 'test_value') {
      console.log('✅ MMKV basic operations working');
    } else {
      throw new Error('MMKV test failed');
    }

    // Test JSON storage
    const testObject = { test: true, timestamp: new Date().toISOString() };
    appStorageWrapper.setObject(testKeys[1], testObject);
    const retrievedObject = appStorageWrapper.getObject(testKeys[1]);

    if (retrievedObject && retrievedObject.test === true) {
      console.log('✅ MMKV JSON operations working');
    } else {
      throw new Error('MMKV JSON test failed');
    }

    // Test storage constants (without touching the real app key)
    const testFirstLaunchKey = `${STORAGE_KEYS.FIRST_LAUNCH}_test`;
    appStorageWrapper.set(testFirstLaunchKey, 'false');
    const firstLaunch = appStorageWrapper.getString(testFirstLaunchKey);

    if (firstLaunch === 'false') {
      console.log('✅ Storage constants working');
    }

    // Clean up all test keys
    const allTestKeys = [...testKeys, testFirstLaunchKey];
    if (appStorageWrapper.delete) {
      allTestKeys.forEach(key => {
        try {
          appStorageWrapper.delete(key);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup test key: ${key}`, cleanupError);
        }
      });
      console.log('🧹 Test keys cleaned up');
    }

    console.log('🎉 Storage integration test completed successfully');
  } catch (error) {
    console.error('❌ Storage integration test failed:', error);
    throw error;
  }
};
