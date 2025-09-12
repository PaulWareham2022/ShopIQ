/**
 * Backup Screen
 * Provides backup and restore functionality for the ShopIQ database
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Surface, Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

import { Screen } from '../components/ui/Screen';
import { Header } from '../components/ui/Header';
import { BackupCard } from '../components/ui/BackupCard';
import { CSVBackupCard } from '../components/ui/CSVBackupCard';
import { backupService, CompleteVerificationResult } from '../services/BackupService';
import { csvBackupService } from '../services/CSVBackupService';

interface BackupScreenProps {
  onBack?: () => void;
}

export const BackupScreen: React.FC<BackupScreenProps> = ({ onBack }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCSVExporting, setIsCSVExporting] = useState(false);
  const [isCSVImporting, setIsCSVImporting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<CompleteVerificationResult | null>(null);

  useEffect(() => {
    initializeBackupService();
  }, []);

  const initializeBackupService = async () => {
    try {
      await backupService.initialize();
      await csvBackupService.initialize();
    } catch (error) {
      console.error('Failed to initialize backup service:', error);
      Alert.alert('Error', 'Failed to initialize backup service');
    }
  };


  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      await backupService.exportBackup();
      Alert.alert(
        'Success',
        'Backup exported successfully! You can now save it to your preferred location.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert(
        'Export Failed',
        error instanceof Error ? error.message : 'Failed to export backup. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async () => {
    setIsImporting(true);
    try {
      await backupService.importBackup();
      Alert.alert(
        'Success',
        'Database restored successfully! Please restart the app to see your restored data.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Import failed:', error);
      Alert.alert(
        'Import Failed',
        error instanceof Error ? error.message : 'Failed to import backup. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleVerifyDatabase = async () => {
    setIsVerifying(true);
    try {
      const result = await backupService.verifyDatabaseIntegrity();
      setVerificationResult({
        isValid: result.isValid,
        fileVerification: null,
        databaseVerification: result,
        overallScore: result.isValid ? 100 : 50
      });

      if (result.isValid) {
        Alert.alert(
          '✅ Database Verified',
          `Database integrity check passed!\n\nTables found: ${Object.keys(result.tableStats).length}\nTotal records: ${Object.values(result.tableStats).reduce((sum, count) => sum + count, 0)}`,
          [{ text: 'OK' }]
        );
      } else {
        const errorMessage = result.errors.join('\n');
        Alert.alert(
          '❌ Database Issues Found',
          `The following issues were detected:\n\n${errorMessage}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Verification failed:', error);
      Alert.alert(
        'Verification Failed',
        error instanceof Error ? error.message : 'Failed to verify database. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCSVExport = async () => {
    setIsCSVExporting(true);
    try {
      await csvBackupService.exportToZIP();
      Alert.alert(
        'Success',
        'CSV backup exported successfully! You can now save the ZIP file to your preferred location.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('CSV Export failed:', error);
      Alert.alert(
        'Export Failed',
        error instanceof Error ? error.message : 'Failed to export CSV backup. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCSVExporting(false);
    }
  };

  const handleCSVImport = async () => {
    setIsCSVImporting(true);
    try {
      await csvBackupService.importFromZIP();
      Alert.alert(
        'Success',
        'CSV backup imported successfully! Your data has been restored.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('CSV Import failed:', error);
      Alert.alert(
        'Import Failed',
        error instanceof Error ? error.message : 'Failed to import CSV backup. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCSVImporting(false);
    }
  };


  return (
    <Screen>
      <Header title="Backup & Restore" onBack={onBack} />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* CSV Backup Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CSV Backup (For Schema Changes)</Text>
          
          <CSVBackupCard
            title="Export CSV Backup"
            subtitle="Export all data as CSV files in a ZIP package. Perfect for major database changes and data migration."
            icon="table-chart"
            onPress={handleCSVExport}
            loading={isCSVExporting}
          />

          <CSVBackupCard
            title="Import CSV Backup"
            subtitle="Import data from CSV files. Use this when you've made major changes to your database structure."
            icon="upload-file"
            onPress={handleCSVImport}
            loading={isCSVImporting}
          />
        </View>

        <Divider style={styles.divider} />

        {/* Backup Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup Actions</Text>
          
          <BackupCard
            title="Export Backup"
            description="Create a backup of your database and save it to your preferred location (iCloud, Google Drive, etc.)"
            icon="cloud-upload"
            onPress={handleExportBackup}
            loading={isExporting}
          />

          <BackupCard
            title="Import Backup"
            description="Restore your database from a previously saved backup file"
            icon="cloud-download"
            onPress={handleImportBackup}
            loading={isImporting}
            variant="secondary"
          />

          <BackupCard
            title="Verify Database"
            description="Check the integrity of your current database"
            icon="verified-user"
            onPress={handleVerifyDatabase}
            loading={isVerifying}
            variant="secondary"
          />
        </View>

        <Divider style={styles.divider} />

        {/* Verification Results */}
        {verificationResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Last Verification</Text>
            <Surface style={[
              styles.verificationResult,
              verificationResult.isValid ? styles.verificationSuccess : styles.verificationError
            ]}>
              <View style={styles.verificationHeader}>
                <MaterialIcons 
                  name={verificationResult.isValid ? "check-circle" : "error"} 
                  size={24} 
                  color={verificationResult.isValid ? "#4CAF50" : "#F44336"} 
                />
                <Text style={styles.verificationTitle}>
                  {verificationResult.isValid ? 'Database Healthy' : 'Issues Found'}
                </Text>
              </View>
              <Text style={styles.verificationScore}>
                Score: {verificationResult.overallScore}%
              </Text>
              {verificationResult.databaseVerification && (
                <View style={styles.tableStats}>
                  {Object.entries(verificationResult.databaseVerification.tableStats).map(([table, count]) => (
                    <Text key={table} style={styles.tableStat}>
                      {table.replace('_', ' ')}: {count} records
                    </Text>
                  ))}
                </View>
              )}
            </Surface>
          </View>
        )}

        {/* Help Text */}
        <View style={styles.section}>
          <Surface style={styles.helpCard}>
            <View style={styles.helpHeader}>
              <MaterialIcons name="help" size={20} color="#2196F3" />
              <Text style={styles.helpTitle}>How it works</Text>
            </View>
            <Text style={styles.helpText}>
              • SQLite Export: Fast, complete database backup{'\n'}
              • CSV Export: Flexible backup for major schema changes{'\n'}
              • Import replaces your current data with the backup{'\n'}
              • Backups can be saved to your preferred location{'\n'}
              • Always verify backups before restoring{'\n'}
              • Keep multiple backups for safety
            </Text>
          </Surface>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  verificationResult: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  verificationSuccess: {
    backgroundColor: '#E8F5E8',
  },
  verificationError: {
    backgroundColor: '#FFEBEE',
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  verificationScore: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  tableStats: {
    marginTop: 8,
  },
  tableStat: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  helpCard: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
});
