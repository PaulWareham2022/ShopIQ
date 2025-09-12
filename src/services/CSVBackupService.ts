/**
 * CSV Backup Service
 * 
 * Handles export and import of database data in CSV format with ZIP packaging.
 * Supports complete data backup with relationships preserved.
 */

import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { executeSql } from '../storage/sqlite/database';

// Database tables to export/import
const EXPORT_TABLES = [
  'suppliers',
  'inventory_items', 
  'offers',
  'unit_conversions',
  'bundles',
  'historical_prices',
  'database_metadata'
];

// Metadata interface for backup files
interface BackupMetadata {
  version: string;
  appVersion: string;
  schemaVersion: string;
  exportType: 'csv-zip';
  timestamp: string;
  tableCount: number;
  recordCounts: Record<string, number>;
}

export class CSVBackupService {
  private tempDir: string;
  private schemaCache: Record<string, Record<string, { type: string; notnull: number; dflt_value: any }>> = {};

  constructor() {
    this.tempDir = FileSystem.cacheDirectory + 'csv-backups/';
  }

  /**
   * Initialize the service and create temp directory
   */
  async initialize(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.tempDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.tempDir, { intermediates: true });
      }
    } catch (error) {
      console.error('Failed to initialize CSV backup service:', error);
      throw new Error(`Failed to initialize CSV backup service: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Export all database tables to a ZIP file containing CSV files
   */
  async exportToZIP(): Promise<void> {
    try {
      await this.initialize();

      console.log('📦 Starting CSV ZIP export...');

      // Create new ZIP instance
      const zip = new JSZip();

      // Generate metadata
      const metadata = await this.generateMetadata();
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));

      // Export each table to CSV
      for (const tableName of EXPORT_TABLES) {
        console.log(`📊 Exporting table: ${tableName}`);
        const csvContent = await this.generateCSV(tableName);
        zip.file(`${tableName}.csv`, csvContent);
      }

      // Generate ZIP file
      console.log('🗜️ Generating ZIP file...');
      const zipArrayBuffer = await zip.generateAsync({ 
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // Save ZIP to temp location
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const zipFileName = `shopiq-csv-backup-${timestamp}.zip`;
      const zipPath = this.tempDir + zipFileName;

      // Convert ArrayBuffer to base64 and save
      const base64Data = this.arrayBufferToBase64(zipArrayBuffer);
      await FileSystem.writeAsStringAsync(zipPath, base64Data, {
        encoding: FileSystem.EncodingType.Base64
      });

      // Share the ZIP file
      await Sharing.shareAsync(zipPath, {
        mimeType: 'application/zip',
        dialogTitle: 'Save ShopIQ CSV Backup'
      });

      console.log('✅ CSV ZIP export completed successfully');
    } catch (error) {
      console.error('Failed to export CSV ZIP:', error);
      throw new Error(`Failed to export CSV ZIP: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Import data from a ZIP file containing CSV files
   */
  async importFromZIP(): Promise<void> {
    try {
      await this.initialize();

      console.log('📦 Starting CSV ZIP import...');

      // Let user pick ZIP file
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'application/octet-stream', '*/*'],
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets[0]) {
        throw new Error('No ZIP file selected');
      }

      const zipFile = result.assets[0];
      console.log(`📁 Selected ZIP file: ${zipFile.name}`);

      // Read ZIP file
      const zipData = await FileSystem.readAsStringAsync(zipFile.uri, {
        encoding: FileSystem.EncodingType.Base64
      });

      // Load ZIP
      const zip = new JSZip();
      await zip.loadAsync(zipData, { base64: true });

      // Read and validate metadata
      const metadataFile = zip.file('metadata.json');
      if (!metadataFile) {
        throw new Error('Invalid backup file: missing metadata.json');
      }

      const metadataContent = await metadataFile.async('text');
      const metadata: BackupMetadata = JSON.parse(metadataContent);
      
      console.log('📋 Backup metadata:', metadata);

      // Validate backup type
      if (metadata.exportType !== 'csv-zip') {
        throw new Error(`Unsupported backup type: ${metadata.exportType}`);
      }

      // Import each table
      for (const tableName of EXPORT_TABLES) {
        const csvFile = zip.file(`${tableName}.csv`);
        if (csvFile) {
          console.log(`📊 Importing table: ${tableName}`);
          const csvContent = await csvFile.async('text');
          await this.importCSV(tableName, csvContent);
        } else {
          console.warn(`⚠️ Table ${tableName} not found in backup`);
        }
      }

      console.log('✅ CSV ZIP import completed successfully');
    } catch (error) {
      console.error('Failed to import CSV ZIP:', error);
      throw new Error(`Failed to import CSV ZIP: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate CSV content for a specific table
   */
  private async generateCSV(tableName: string): Promise<string> {
    try {
      // Get all data from table
      const result = await executeSql(`SELECT * FROM ${tableName}`);
      
      if (result.rows.length === 0) {
        // Return empty CSV with headers only
        const headers = await this.getTableHeaders(tableName);
        return headers.join(',') + '\n';
      }

      // Get headers from first row
      const firstRow = result.rows.item ? result.rows.item(0) : result.rows[0];
      const headers = Object.keys(firstRow);

      // Generate CSV content
      const csvRows = [headers.join(',')]; // Header row

      // Add data rows
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item ? result.rows.item(i) : result.rows[i];
        const values = headers.map(header => {
          const value = row[header];
          // Escape CSV values
          if (value === null || value === undefined) {
            return '';
          }
          const stringValue = String(value);
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        });
        csvRows.push(values.join(','));
      }

      return csvRows.join('\n');
    } catch (error) {
      console.error(`Failed to generate CSV for table ${tableName}:`, error);
      throw new Error(`Failed to generate CSV for table ${tableName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Import CSV data into a specific table
   */
  private async importCSV(tableName: string, csvContent: string): Promise<void> {
    try {
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        console.log(`📊 Table ${tableName} is empty, skipping import`);
        return;
      }

      // Clear schema cache for this table to ensure fresh schema info
      delete this.schemaCache[tableName];

      // Parse headers
      const headers = this.parseCSVLine(lines[0]);
      console.log(`📊 Importing ${lines.length - 1} records into ${tableName}`);
      console.log(`📊 Headers: ${headers.join(', ')}`);
      

      // Clear existing data (optional - you might want to merge instead)
      await executeSql(`DELETE FROM ${tableName}`);

      // Prepare insert statement
      const placeholders = headers.map(() => '?').join(',');
      const insertSQL = `INSERT INTO ${tableName} (${headers.join(',')}) VALUES (${placeholders})`;

      // Import each row
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        
        try {
          // Validate and convert values based on table schema
          const processedValues = await this.validateAndConvertValues(tableName, headers, values);


          await executeSql(insertSQL, processedValues);
        } catch (rowError) {
          console.error(`Failed to import row ${i} for table ${tableName}:`, rowError);
          console.error(`Row data:`, values);
          throw rowError;
        }
      }

      console.log(`✅ Imported ${lines.length - 1} records into ${tableName}`);
    } catch (error) {
      console.error(`Failed to import CSV for table ${tableName}:`, error);
      throw new Error(`Failed to import CSV for table ${tableName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create fallback schema when PRAGMA table_info fails
   */
  private createFallbackSchema(tableName: string): void {
    console.log(`Creating fallback schema for ${tableName}`);
    
    // Known schemas for our tables
    const knownSchemas: Record<string, Record<string, { type: string; notnull: number; dflt_value: any }>> = {
      suppliers: {
        id: { type: 'TEXT', notnull: 1, dflt_value: null },
        name: { type: 'TEXT', notnull: 1, dflt_value: null },
        country_code: { type: 'TEXT', notnull: 1, dflt_value: null },
        region_code: { type: 'TEXT', notnull: 0, dflt_value: null },
        store_code: { type: 'TEXT', notnull: 0, dflt_value: null },
        default_currency: { type: 'TEXT', notnull: 1, dflt_value: null },
        membership_required: { type: 'INTEGER', notnull: 1, dflt_value: 0 },
        membership_type: { type: 'TEXT', notnull: 0, dflt_value: null },
        shipping_policy: { type: 'TEXT', notnull: 0, dflt_value: null },
        url_patterns: { type: 'TEXT', notnull: 0, dflt_value: null },
        notes: { type: 'TEXT', notnull: 0, dflt_value: null },
        rating: { type: 'INTEGER', notnull: 0, dflt_value: null },
        created_at: { type: 'TEXT', notnull: 1, dflt_value: null },
        updated_at: { type: 'TEXT', notnull: 1, dflt_value: null },
        deleted_at: { type: 'TEXT', notnull: 0, dflt_value: null }
      },
      inventory_items: {
        id: { type: 'TEXT', notnull: 1, dflt_value: null },
        name: { type: 'TEXT', notnull: 1, dflt_value: null },
        category: { type: 'TEXT', notnull: 0, dflt_value: null },
        canonical_dimension: { type: 'TEXT', notnull: 0, dflt_value: null },
        canonical_unit: { type: 'TEXT', notnull: 0, dflt_value: null },
        shelf_life_sensitive: { type: 'INTEGER', notnull: 1, dflt_value: 0 },
        shelf_life_days: { type: 'INTEGER', notnull: 0, dflt_value: null },
        usage_rate_per_day: { type: 'REAL', notnull: 0, dflt_value: null },
        attributes: { type: 'TEXT', notnull: 0, dflt_value: null },
        equivalence_factor: { type: 'REAL', notnull: 0, dflt_value: null },
        notes: { type: 'TEXT', notnull: 0, dflt_value: null },
        created_at: { type: 'TEXT', notnull: 1, dflt_value: null },
        updated_at: { type: 'TEXT', notnull: 1, dflt_value: null },
        deleted_at: { type: 'TEXT', notnull: 0, dflt_value: null }
      }
    };
    
    if (knownSchemas[tableName]) {
      this.schemaCache[tableName] = knownSchemas[tableName];
      console.log(`✅ Created fallback schema for ${tableName}`);
    } else {
      console.warn(`No fallback schema available for ${tableName}`);
    }
  }

  /**
   * Validate and convert CSV values based on table schema
   */
  private async validateAndConvertValues(tableName: string, headers: string[], values: string[]): Promise<(string | number)[]> {
    try {
      // Get table schema information (cache it to avoid multiple PRAGMA calls)
      if (!this.schemaCache[tableName]) {
        this.schemaCache[tableName] = {};
        try {
          const schemaResult = await executeSql(`PRAGMA table_info(${tableName})`);
          
          if (schemaResult && schemaResult.rows && schemaResult.rows.length > 0) {
            for (let i = 0; i < schemaResult.rows.length; i++) {
              const row = schemaResult.rows.item ? schemaResult.rows.item(i) : schemaResult.rows[i];
              this.schemaCache[tableName][row.name] = {
                type: row.type,
                notnull: row.notnull,
                dflt_value: row.dflt_value
              };
            }
          } else {
            console.warn(`Empty schema result for ${tableName}, using fallback`);
            this.createFallbackSchema(tableName);
          }
        } catch (schemaError) {
          console.error(`Failed to get schema for ${tableName}:`, schemaError);
          // Fallback: create a basic schema based on known tables
          this.createFallbackSchema(tableName);
        }
      }
      
      const schema = this.schemaCache[tableName];
      

      return values.map((value, index) => {
        const header = headers[index];
        const columnSchema = schema[header];
        
        if (!columnSchema) {
          return value === '' ? '' : value;
        }

        // Handle empty values and null-like strings
        if (value === '' || value === 'null' || value === 'NULL' || value === 'undefined') {
          if (columnSchema.notnull) {
            // Use default value if column is not null
            return columnSchema.dflt_value || '';
          }
          return null;
        }

        // Type conversion based on column type
        const columnType = columnSchema.type.toLowerCase();
        
        if (columnType.includes('integer') || columnType.includes('int')) {
          const numValue = parseInt(value, 10);
          if (isNaN(numValue)) {
            console.warn(`Invalid integer value '${value}' for column '${header}', using 0`);
            return 0;
          }
          
          // Special validation for rating column
          if (header === 'rating') {
            if (isNaN(numValue) || numValue < 0 || numValue > 5) {
              console.warn(`Invalid rating value '${value}' for column '${header}', using null`);
              return null;
            }
          }
          
          return numValue;
        }
        
        if (columnType.includes('real') || columnType.includes('float') || columnType.includes('double')) {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            console.warn(`Invalid float value '${value}' for column '${header}', using 0`);
            return 0;
          }
          return numValue;
        }
        
        if (columnType.includes('boolean') || columnType.includes('bool')) {
          return value.toLowerCase() === 'true' || value === '1' ? 1 : 0;
        }
        
        // For text/varchar columns, return as string
        return value;
      });
    } catch (error) {
      console.error(`Failed to validate values for table ${tableName}:`, error);
      // Fallback to original values if validation fails
      return values.map(value => value === '' ? '' : value);
    }
  }

  /**
   * Parse a CSV line, handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current);
    
    return result;
  }

  /**
   * Get table headers for empty tables
   */
  private async getTableHeaders(tableName: string): Promise<string[]> {
    try {
      const result = await executeSql(`PRAGMA table_info(${tableName})`);
      const headers: string[] = [];
      
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item ? result.rows.item(i) : result.rows[i];
        headers.push(row.name);
      }
      
      return headers;
    } catch (error) {
      console.error(`Failed to get headers for table ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Generate metadata for the backup
   */
  private async generateMetadata(): Promise<BackupMetadata> {
    const recordCounts: Record<string, number> = {};
    
    // Count records in each table
    for (const tableName of EXPORT_TABLES) {
      try {
        const result = await executeSql(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = result.rows.item ? result.rows.item(0).count : result.rows[0].count;
        recordCounts[tableName] = count;
      } catch (error) {
        console.warn(`Failed to count records in ${tableName}:`, error);
        recordCounts[tableName] = 0;
      }
    }

    return {
      version: '1.0.0',
      appVersion: '1.0.0', // You might want to get this from app.json
      schemaVersion: '1.0.0', // You might want to get this from schemas.ts
      exportType: 'csv-zip',
      timestamp: new Date().toISOString(),
      tableCount: EXPORT_TABLES.length,
      recordCounts
    };
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

}

// Export singleton instance
export const csvBackupService = new CSVBackupService();
