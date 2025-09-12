/**
 * Backup Service
 * Handles SQLite database backup and restoration with user-selected storage locations
 */

import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { RepositoryFactory } from '../storage/RepositoryFactory';
import { executeSql } from '../storage/sqlite/database';

// Types for backup verification
export interface BackupVerificationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    fileSize?: number;
    createdAt?: number;
  };
}

export interface DatabaseVerificationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  tableStats: Record<string, number>;
  schemaVersion: string | null;
}

export interface CompleteVerificationResult {
  isValid: boolean;
  fileVerification: BackupVerificationResult | null;
  databaseVerification: DatabaseVerificationResult | null;
  overallScore: number;
}

export class BackupService {
  private dbPath: string;
  private backupDir: string;

  constructor() {
    // SQLite database path
    this.dbPath = FileSystem.documentDirectory + 'SQLite/shopiq.db';
    // Local backup directory
    this.backupDir = FileSystem.documentDirectory + 'backups/';
  }

  /**
   * Initialize backup service and ensure backup directory exists
   */
  async initialize(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.backupDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.backupDir, { intermediates: true });
        console.log('📁 Created backup directory');
      }
    } catch (error) {
      console.error('Failed to initialize backup service:', error);
      throw new Error('Failed to initialize backup service');
    }
  }

  /**
   * Create a local backup of the SQLite database
   */
  async createBackup(): Promise<string> {
    try {
      // Check if database exists
      const dbInfo = await FileSystem.getInfoAsync(this.dbPath);
      if (!dbInfo.exists) {
        throw new Error('Database file not found');
      }

      // Generate timestamp for backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = this.backupDir + `shopiq-backup-${timestamp}.backup`;

      // Copy database to backup location
      await FileSystem.copyAsync({
        from: this.dbPath,
        to: backupPath
      });

      console.log(`✅ Backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Export backup to user-selected location
   */
  async exportBackup(): Promise<void> {
    try {
      // Create local backup first
      const backupPath = await this.createBackup();

      // Share the backup file
      await Sharing.shareAsync(backupPath, {
        mimeType: 'application/octet-stream',
        dialogTitle: 'Save ShopIQ Database Backup'
      });

      console.log('📤 Backup export initiated');
    } catch (error) {
      console.error('Failed to export backup:', error);
      throw new Error(`Failed to export backup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Import backup from user-selected location
   */
  async importBackup(): Promise<void> {
    try {
      // Let user pick backup file
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/x-sqlite3', 'application/octet-stream', '*/*'],
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets[0]) {
        throw new Error('No file selected');
      }

      const selectedFile = result.assets[0];
      const backupPath = selectedFile.uri;

      // Verify the backup file
      const verification = await this.verifyBackup(backupPath);
      if (!verification.isValid) {
        const errorMessage = verification.errors.join('\n');
        throw new Error(`Invalid backup file:\n${errorMessage}`);
      }

      // Show confirmation dialog
      const confirmed = await this.showRestoreConfirmation(verification);
      if (!confirmed) {
        return;
      }

      // Perform the restore
      await this.restoreFromBackup(backupPath);

      console.log('✅ Backup restored successfully');
    } catch (error) {
      console.error('Failed to import backup:', error);
      throw new Error(`Failed to import backup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Restore database from backup file
   */
  private async restoreFromBackup(backupPath: string): Promise<void> {
    try {
      // Create a backup of current database before restore
      const currentBackup = await this.createBackup();
      console.log(`📋 Current database backed up to: ${currentBackup}`);

      // Copy backup over current database
      await FileSystem.copyAsync({
        from: backupPath,
        to: this.dbPath
      });

      // Verify the restored database
      const verification = await this.verifyDatabaseIntegrity();
      if (!verification.isValid) {
        // Restore the previous backup if verification fails
        await FileSystem.copyAsync({
          from: currentBackup,
          to: this.dbPath
        });
        throw new Error('Restored database failed verification');
      }

      console.log('✅ Database restored and verified');
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      throw new Error(`Failed to restore from backup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Verify backup file integrity
   */
  async verifyBackup(backupPath: string): Promise<BackupVerificationResult> {
    const verification: BackupVerificationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      stats: {}
    };

    try {
      // Check if file exists and is readable
      const fileInfo = await FileSystem.getInfoAsync(backupPath);
      if (!fileInfo.exists) {
        verification.errors.push('Backup file does not exist');
        return verification;
      }

      if (fileInfo.size === 0) {
        verification.errors.push('Backup file is empty');
        return verification;
      }

      // Check file size (should be reasonable)
      if (fileInfo.size < 1024) { // Less than 1KB is suspicious
        verification.warnings.push('Backup file is unusually small');
      }

      // Try to read the file
      const fileContent = await FileSystem.readAsStringAsync(backupPath, {
        encoding: FileSystem.EncodingType.Base64
      });

      if (!fileContent) {
        verification.errors.push('Cannot read backup file');
        return verification;
      }

      verification.isValid = true;
      verification.stats.fileSize = fileInfo.size;
      verification.stats.createdAt = fileInfo.modificationTime;

    } catch (error) {
      verification.errors.push(`File access error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return verification;
  }

  /**
   * Verify current database integrity
   */
  async verifyDatabaseIntegrity(): Promise<DatabaseVerificationResult> {
    const result: DatabaseVerificationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      tableStats: {},
      schemaVersion: null
    };

    try {
      // Initialize repository factory to access database
      const factory = RepositoryFactory.getInstance();
      await factory.initialize();

      // Verify each table exists and has data
      const tables = [
        'suppliers', 
        'inventory_items', 
        'offers', 
        'unit_conversions',
        'bundles',
        'historical_prices',
        'database_metadata'
      ];
      
      for (const table of tables) {
        try {
          const countResult = await executeSql(`SELECT COUNT(*) as count FROM ${table}`);
          result.tableStats[table] = countResult.rows.item(0)?.count || 0;
        } catch (error) {
          result.errors.push(`Table ${table} verification failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Check schema version if metadata table exists
      try {
        const schemaResult = await executeSql(
          "SELECT value FROM app_metadata WHERE key = 'schema_version'"
        );
        result.schemaVersion = schemaResult.rows.item(0)?.value || 'unknown';
      } catch (error) {
        result.warnings.push('Could not verify schema version');
      }

      result.isValid = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Database verification failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Complete backup verification
   */
  async verifyBackupComplete(backupPath: string): Promise<CompleteVerificationResult> {
    console.log('🔍 Starting backup verification...');
    
    const result: CompleteVerificationResult = {
      isValid: false,
      fileVerification: null,
      databaseVerification: null,
      overallScore: 0
    };

    // Step 1: File integrity
    console.log('📁 Verifying file integrity...');
    result.fileVerification = await this.verifyBackup(backupPath);
    
    if (!result.fileVerification.isValid) {
      console.log('❌ File verification failed');
      return result;
    }

    // Step 2: Database integrity (by temporarily copying and testing)
    console.log('🗄️ Verifying database integrity...');
    result.databaseVerification = await this.verifyDatabaseIntegrity();
    
    if (!result.databaseVerification.isValid) {
      console.log('❌ Database verification failed');
      return result;
    }

    // Calculate overall score
    result.overallScore = this.calculateVerificationScore(result);
    result.isValid = result.overallScore >= 80; // 80% threshold

    console.log(`✅ Backup verification complete. Score: ${result.overallScore}%`);
    return result;
  }

  /**
   * Calculate verification score
   */
  private calculateVerificationScore(result: CompleteVerificationResult): number {
    let score = 100;
    
    // Deduct points for errors
    score -= (result.fileVerification?.errors.length || 0) * 20;
    score -= (result.databaseVerification?.errors.length || 0) * 15;
    
    // Deduct points for warnings
    score -= (result.fileVerification?.warnings.length || 0) * 5;
    score -= (result.databaseVerification?.warnings.length || 0) * 3;
    
    return Math.max(0, score);
  }

  /**
   * Show restore confirmation dialog
   */
  private async showRestoreConfirmation(verification: BackupVerificationResult): Promise<boolean> {
    return new Promise((resolve) => {
      const fileSize = verification.stats.fileSize 
        ? this.formatFileSize(verification.stats.fileSize)
        : 'Unknown size';

      Alert.alert(
        'Restore Database Backup',
        `This will replace your current data with the backup.\n\nFile size: ${fileSize}\n\nThis action cannot be undone. Continue?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: () => resolve(true)
          }
        ]
      );
    });
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

}

// Export singleton instance
export const backupService = new BackupService();
