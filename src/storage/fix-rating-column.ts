/**
 * Manual fix for the rating column issue
 * This can be called from the app to add the rating column if it's missing
 */

import { executeSql } from './sqlite/database';

export async function fixRatingColumn(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔧 Attempting to fix rating column...');
    
    // Check if rating column already exists
    const checkResult = await executeSql("PRAGMA table_info(suppliers)");
    const columns = [];
    for (let i = 0; i < checkResult.rows.length; i++) {
      columns.push(checkResult.rows.item(i).name);
    }
    
    console.log('Current columns:', columns);
    
    if (columns.includes('rating')) {
      console.log('✅ Rating column already exists');
      return { success: true, message: 'Rating column already exists' };
    }
    
    // Add the rating column
    console.log('Adding rating column...');
    const result = await executeSql(
      'ALTER TABLE suppliers ADD COLUMN rating INTEGER CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));'
    );
    
    console.log('✅ Successfully added rating column');
    console.log('Result:', result);
    
    // Verify the column was added
    const verifyResult = await executeSql("PRAGMA table_info(suppliers)");
    const newColumns = [];
    for (let i = 0; i < verifyResult.rows.length; i++) {
      newColumns.push(verifyResult.rows.item(i).name);
    }
    
    console.log('Updated columns:', newColumns);
    
    if (newColumns.includes('rating')) {
      console.log('✅ Rating column successfully added and verified');
      return { success: true, message: 'Rating column successfully added' };
    } else {
      console.log('❌ Rating column was not added properly');
      return { success: false, message: 'Rating column was not added properly' };
    }
    
  } catch (error) {
    console.error('❌ Failed to add rating column:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    return { 
      success: false, 
      message: `Failed to add rating column: ${error.message}` 
    };
  }
}
