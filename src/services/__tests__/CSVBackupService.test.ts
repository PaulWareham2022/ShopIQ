/**
 * CSVBackupService Tests
 * 
 * Tests for CSV backup and restore functionality
 */

import { CSVBackupService } from '../CSVBackupService';
import { executeSql } from '../../storage/sqlite/database';

// Mock dependencies
jest.mock('expo-file-system');
jest.mock('expo-document-picker');
jest.mock('expo-sharing');
jest.mock('jszip');
jest.mock('../../storage/sqlite/database');

const mockFileSystem = require('expo-file-system');
const mockDocumentPicker = require('expo-document-picker');
const mockSharing = require('expo-sharing');
const mockJSZip = require('jszip');

describe('CSVBackupService', () => {
  let csvBackupService: CSVBackupService;

  beforeEach(() => {
    csvBackupService = new CSVBackupService();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false });
    mockFileSystem.makeDirectoryAsync.mockResolvedValue(undefined);
    mockFileSystem.writeAsStringAsync.mockResolvedValue(undefined);
    mockFileSystem.readAsStringAsync.mockResolvedValue('mock-zip-data');
    mockFileSystem.readDirectoryAsync.mockResolvedValue([]);
    mockFileSystem.deleteAsync.mockResolvedValue(undefined);
    
    mockSharing.shareAsync.mockResolvedValue(undefined);
    
    mockDocumentPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'mock-file-uri', name: 'test-backup.zip' }]
    });

    // Mock JSZip
    const mockZipInstance = {
      file: jest.fn(),
      generateAsync: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      loadAsync: jest.fn().mockResolvedValue(undefined)
    };
    mockJSZip.mockImplementation(() => mockZipInstance);
  });

  describe('initialize', () => {
    it('should create temp directory if it does not exist', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false });

      await csvBackupService.initialize();

      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        expect.stringContaining('csv-backups'),
        { intermediates: true }
      );
    });

    it('should not create temp directory if it already exists', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true });

      await csvBackupService.initialize();

      expect(mockFileSystem.makeDirectoryAsync).not.toHaveBeenCalled();
    });
  });

  describe('generateCSV', () => {
    it('should generate CSV with headers and data', async () => {
      const mockData = [
        { id: '1', name: 'Test Item', quantity: 10 },
        { id: '2', name: 'Another Item', quantity: 5 }
      ];

      (executeSql as jest.Mock).mockResolvedValue({
        rows: {
          length: 2,
          item: (index: number) => mockData[index]
        }
      });

      const csvContent = await (csvBackupService as any).generateCSV('inventory_items');

      expect(csvContent).toContain('id,name,quantity');
      expect(csvContent).toContain('1,Test Item,10');
      expect(csvContent).toContain('2,Another Item,5');
    });

    it('should handle empty tables', async () => {
      // Mock getTableData (empty) - this is called first
      (executeSql as jest.Mock).mockResolvedValueOnce({
        rows: { length: 0 }
      });

      // Mock getTableHeaders (PRAGMA table_info)
      (executeSql as jest.Mock).mockResolvedValueOnce({
        rows: {
          length: 2,
          item: (index: number) => [
            { name: 'id' },
            { name: 'name' }
          ][index]
        }
      });

      const csvContent = await (csvBackupService as any).generateCSV('empty_table');

      expect(csvContent).toBe('id,name\n');
    });

    it('should escape CSV values properly', async () => {
      const mockData = [
        { id: '1', name: 'Item with "quotes"', description: 'Item with, comma' }
      ];

      (executeSql as jest.Mock).mockResolvedValue({
        rows: {
          length: 1,
          item: (index: number) => mockData[index]
        }
      });

      const csvContent = await (csvBackupService as any).generateCSV('test_table');

      // The actual escaping logic wraps values in quotes and escapes internal quotes
      expect(csvContent).toContain('"Item with ""quotes"""');
      expect(csvContent).toContain('"Item with, comma"');
    });
  });

  describe('parseCSVLine', () => {
    it('should parse simple CSV line', () => {
      const result = (csvBackupService as any).parseCSVLine('id,name,quantity');
      expect(result).toEqual(['id', 'name', 'quantity']);
    });

    it('should handle quoted values', () => {
      const result = (csvBackupService as any).parseCSVLine('"1","Test Item","10"');
      expect(result).toEqual(['1', 'Test Item', '10']);
    });

    it('should handle escaped quotes', () => {
      const result = (csvBackupService as any).parseCSVLine('"1","Item with ""quotes""","10"');
      expect(result).toEqual(['1', 'Item with "quotes"', '10']);
    });

    it('should handle mixed quoted and unquoted values', () => {
      const result = (csvBackupService as any).parseCSVLine('1,"Test Item",10');
      expect(result).toEqual(['1', 'Test Item', '10']);
    });
  });

  describe('importCSV', () => {
    it('should import CSV data correctly', async () => {
      const csvContent = 'id,name,quantity\n1,Test Item,10\n2,Another Item,5';
      
      // Mock schema info for validation
      const mockSchemaResult = {
        rows: {
          length: 3,
          item: (index: number) => [
            { name: 'id', type: 'TEXT', notnull: 1, dflt_value: null },
            { name: 'name', type: 'TEXT', notnull: 1, dflt_value: null },
            { name: 'quantity', type: 'INTEGER', notnull: 0, dflt_value: null }
          ][index]
        }
      };

      (executeSql as jest.Mock)
        .mockResolvedValueOnce(undefined) // DELETE call
        .mockResolvedValueOnce(mockSchemaResult) // PRAGMA table_info call
        .mockResolvedValueOnce(undefined) // First INSERT call
        .mockResolvedValueOnce(undefined); // Second INSERT call

      await (csvBackupService as any).importCSV('inventory_items', csvContent);

      expect(executeSql).toHaveBeenCalledWith('DELETE FROM inventory_items');
      expect(executeSql).toHaveBeenCalledWith(
        'INSERT INTO inventory_items (id,name,quantity) VALUES (?,?,?)',
        ['1', 'Test Item', 10]
      );
      expect(executeSql).toHaveBeenCalledWith(
        'INSERT INTO inventory_items (id,name,quantity) VALUES (?,?,?)',
        ['2', 'Another Item', 5]
      );
    });

    it('should handle empty CSV files', async () => {
      const csvContent = 'id,name,quantity\n';
      
      (executeSql as jest.Mock).mockResolvedValue(undefined);
      
      await (csvBackupService as any).importCSV('inventory_items', csvContent);

      // For empty CSV (only headers), the method returns early without calling executeSql
      expect(executeSql).not.toHaveBeenCalled();
    });

    it('should convert empty strings to empty string', async () => {
      const csvContent = 'id,name,quantity\n1,,10\n2,Test Item,';
      
      // Mock schema info for validation
      const mockSchemaResult = {
        rows: {
          length: 3,
          item: (index: number) => [
            { name: 'id', type: 'TEXT', notnull: 1, dflt_value: null },
            { name: 'name', type: 'TEXT', notnull: 0, dflt_value: null },
            { name: 'quantity', type: 'INTEGER', notnull: 0, dflt_value: null }
          ][index]
        }
      };

      (executeSql as jest.Mock)
        .mockResolvedValueOnce(undefined) // DELETE call
        .mockResolvedValueOnce(mockSchemaResult) // PRAGMA table_info call
        .mockResolvedValueOnce(undefined) // First INSERT call
        .mockResolvedValueOnce(undefined); // Second INSERT call

      await (csvBackupService as any).importCSV('inventory_items', csvContent);

      expect(executeSql).toHaveBeenCalledWith(
        'INSERT INTO inventory_items (id,name,quantity) VALUES (?,?,?)',
        ['1', null, 10]
      );
      expect(executeSql).toHaveBeenCalledWith(
        'INSERT INTO inventory_items (id,name,quantity) VALUES (?,?,?)',
        ['2', 'Test Item', null]
      );
    });

    it('should handle invalid quality_rating values by converting them to null', async () => {
      const csvContent = 'id,quality_rating\n1,0\n2,6\n3,3';
      
      // Mock schema info for validation - simulate PRAGMA table_info failure
      const mockSchemaResult = {
        rows: {
          length: 0 // Simulate empty result to trigger fallback schema
        }
      };

      (executeSql as jest.Mock)
        .mockResolvedValueOnce(undefined) // DELETE call
        .mockResolvedValueOnce(mockSchemaResult) // PRAGMA table_info call (fails, triggers fallback)
        .mockResolvedValueOnce(undefined) // First INSERT call
        .mockResolvedValueOnce(undefined) // Second INSERT call
        .mockResolvedValueOnce(undefined); // Third INSERT call

      await (csvBackupService as any).importCSV('offers', csvContent);

      // Invalid values (0 and 6) should be converted to null
      expect(executeSql).toHaveBeenCalledWith(
        'INSERT INTO offers (id,quality_rating) VALUES (?,?)',
        ['1', null]
      );
      expect(executeSql).toHaveBeenCalledWith(
        'INSERT INTO offers (id,quality_rating) VALUES (?,?)',
        ['2', null]
      );
      // Valid value (3) should remain as is
      expect(executeSql).toHaveBeenCalledWith(
        'INSERT INTO offers (id,quality_rating) VALUES (?,?)',
        ['3', 3]
      );
    });
  });

  describe('generateMetadata', () => {
    it('should generate correct metadata', async () => {
      (executeSql as jest.Mock).mockResolvedValue({
        rows: {
          length: 1,
          item: () => ({ count: 5 })
        }
      });

      const metadata = await (csvBackupService as any).generateMetadata();

      expect(metadata).toMatchObject({
        version: '1.0.0',
        appVersion: '1.0.0',
        schemaVersion: '1.0.0',
        exportType: 'csv-zip',
        tableCount: 7,
        recordCounts: expect.any(Object)
      });
      expect(metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('exportToZIP', () => {
    it('should create ZIP with all tables and metadata', async () => {
      const mockZipInstance = {
        file: jest.fn(),
        generateAsync: jest.fn().mockResolvedValue(new ArrayBuffer(8))
      };
      mockJSZip.mockImplementation(() => mockZipInstance);

      // Mock generateCSV for each table
      (csvBackupService as any).generateCSV = jest.fn().mockResolvedValue('mock-csv-content');
      (csvBackupService as any).generateMetadata = jest.fn().mockResolvedValue({
        version: '1.0.0',
        exportType: 'csv-zip'
      });

      // Mock blobToBase64
      (csvBackupService as any).blobToBase64 = jest.fn().mockResolvedValue('mock-base64-data');

      await csvBackupService.exportToZIP();

      expect(mockZipInstance.file).toHaveBeenCalledWith('metadata.json', expect.any(String));
      expect(mockZipInstance.file).toHaveBeenCalledWith('suppliers.csv', 'mock-csv-content');
      expect(mockZipInstance.file).toHaveBeenCalledWith('inventory_items.csv', 'mock-csv-content');
      expect(mockZipInstance.file).toHaveBeenCalledWith('offers.csv', 'mock-csv-content');
      expect(mockZipInstance.file).toHaveBeenCalledWith('unit_conversions.csv', 'mock-csv-content');
      expect(mockZipInstance.file).toHaveBeenCalledWith('bundles.csv', 'mock-csv-content');
      expect(mockZipInstance.file).toHaveBeenCalledWith('historical_prices.csv', 'mock-csv-content');
      expect(mockZipInstance.file).toHaveBeenCalledWith('database_metadata.csv', 'mock-csv-content');

      expect(mockSharing.shareAsync).toHaveBeenCalled();
    });
  });

  describe('importFromZIP', () => {
    it('should import ZIP file correctly', async () => {
      const mockZipInstance = {
        file: jest.fn().mockReturnValue({
          async: jest.fn().mockResolvedValue('mock-content')
        }),
        loadAsync: jest.fn().mockResolvedValue(undefined)
      };
      mockJSZip.mockImplementation(() => mockZipInstance);

      // Mock metadata
      mockZipInstance.file.mockReturnValueOnce({
        async: jest.fn().mockResolvedValue(JSON.stringify({
          exportType: 'csv-zip',
          version: '1.0.0'
        }))
      });

      // Mock CSV files
      mockZipInstance.file.mockReturnValue({
        async: jest.fn().mockResolvedValue('id,name\n1,Test')
      });

      (csvBackupService as any).importCSV = jest.fn().mockResolvedValue(undefined);

      await csvBackupService.importFromZIP();

      expect(mockDocumentPicker.getDocumentAsync).toHaveBeenCalled();
      expect(mockZipInstance.loadAsync).toHaveBeenCalled();
      expect((csvBackupService as any).importCSV).toHaveBeenCalled();
    });

    it('should throw error for invalid backup type', async () => {
      const mockZipInstance = {
        file: jest.fn().mockReturnValue({
          async: jest.fn().mockResolvedValue(JSON.stringify({
            exportType: 'invalid-type'
          }))
        }),
        loadAsync: jest.fn().mockResolvedValue(undefined)
      };
      mockJSZip.mockImplementation(() => mockZipInstance);

      await expect(csvBackupService.importFromZIP()).rejects.toThrow('Unsupported backup type: invalid-type');
    });
  });

});
