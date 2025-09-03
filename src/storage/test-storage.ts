import { initializeDatabase, executeSql } from './sqlite/database';
import { appStorageWrapper, STORAGE_KEYS } from './mmkv/storage';
import { Platform } from 'react-native';

// Test function to verify both storage systems are working
export const testStorageIntegration = async (): Promise<void> => {
  if (__DEV__) {
    console.log('🔧 Testing storage integration...');
    console.log(`Platform: ${Platform.OS}`);
  }

  try {
    // Test SQLite
    if (__DEV__) {
      console.log('📊 Testing SQLite...');
    }
    await initializeDatabase();

    // Test basic SQLite query
    const testResult = await executeSql(
      'SELECT name FROM sqlite_master WHERE type="table"'
    );
    if (__DEV__) {
      console.log(
        `✅ SQLite initialized with ${testResult.rows.length} tables`
      );
    }

    // Test MMKV
    if (__DEV__) {
      console.log('🗄️ Testing MMKV...');
    }

    // Test basic MMKV operations
    appStorageWrapper.set('test_key', 'test_value');
    const testValue = appStorageWrapper.getString('test_key');

    if (testValue === 'test_value') {
      if (__DEV__) {
        console.log('✅ MMKV basic operations working');
      }
    } else {
      throw new Error('MMKV test failed');
    }

    // Test JSON storage
    const testObject = { test: true, timestamp: new Date().toISOString() };
    appStorageWrapper.setObject('test_object', testObject);
    const retrievedObject = appStorageWrapper.getObject('test_object');

    if (retrievedObject && retrievedObject.test === true) {
      if (__DEV__) {
        console.log('✅ MMKV JSON operations working');
      }
    } else {
      throw new Error('MMKV JSON test failed');
    }

    // Test storage constants
    appStorageWrapper.set(STORAGE_KEYS.FIRST_LAUNCH, 'false');
    const firstLaunch = appStorageWrapper.getString(STORAGE_KEYS.FIRST_LAUNCH);

    if (firstLaunch === 'false') {
      if (__DEV__) {
        console.log('✅ Storage constants working');
      }
    }

    if (__DEV__) {
      console.log('🎉 Storage integration test completed successfully');
    }
  } catch (error) {
    if (__DEV__) {
      console.error('❌ Storage integration test failed:', error);
    }
    throw error;
  }
};
