/**
 * Backup Service Tests
 * Tests for SQLite database backup and restore functionality
 */

import { BackupService } from '../BackupService';
import * as FileSystem from 'expo-file-system';

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  EncodingType: {
    Base64: 'base64'
  }
}));

// Mock expo-document-picker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn()
}));

// Mock expo-sharing
jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn()
}));

// Mock RepositoryFactory
jest.mock('../../storage/RepositoryFactory', () => ({
  RepositoryFactory: {
    getInstance: jest.fn(() => ({
      initialize: jest.fn(),
      executeSql: jest.fn()
    }))
  }
}));

describe('BackupService', () => {
  let backupService: BackupService;
  const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

  beforeEach(() => {
    backupService = new BackupService();
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should create backup directory if it does not exist', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false } as any);
      mockFileSystem.makeDirectoryAsync.mockResolvedValue(undefined);

      await backupService.initialize();

      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith('/mock/documents/backups/');
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith('/mock/documents/backups/', { intermediates: true });
    });

    it('should not create backup directory if it already exists', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true } as any);

      await backupService.initialize();

      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith('/mock/documents/backups/');
      expect(mockFileSystem.makeDirectoryAsync).not.toHaveBeenCalled();
    });
  });

  describe('createBackup', () => {
    it('should create a backup of the database file', async () => {
      const mockDbInfo = { exists: true, size: 1024 };
      
      mockFileSystem.getInfoAsync.mockResolvedValue(mockDbInfo as any);
      mockFileSystem.copyAsync.mockResolvedValue(undefined);

      const result = await backupService.createBackup();

      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith('/mock/documents/SQLite/shopiq.db');
      expect(mockFileSystem.copyAsync).toHaveBeenCalledWith({
        from: '/mock/documents/SQLite/shopiq.db',
        to: expect.stringMatching(/\/mock\/documents\/backups\/shopiq-backup-.*\.backup/)
      });
      expect(result).toMatch(/\/mock\/documents\/backups\/shopiq-backup-.*\.backup/);
    });

    it('should throw error if database file does not exist', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false } as any);

      await expect(backupService.createBackup()).rejects.toThrow('Database file not found');
    });
  });

  describe('verifyBackup', () => {
    it('should return valid result for good backup file', async () => {
      const mockFileInfo = { exists: true, size: 1024, modificationTime: Date.now() };
      const mockFileContent = 'base64encodedcontent';
      
      mockFileSystem.getInfoAsync.mockResolvedValue(mockFileInfo as any);
      mockFileSystem.readAsStringAsync.mockResolvedValue(mockFileContent);

      const result = await backupService.verifyBackup('/mock/backup.db');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.fileSize).toBe(1024);
    });

    it('should return invalid result for non-existent file', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false } as any);

      const result = await backupService.verifyBackup('/mock/nonexistent.db');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Backup file does not exist');
    });

    it('should return invalid result for empty file', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true, size: 0 } as any);

      const result = await backupService.verifyBackup('/mock/empty.db');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Backup file is empty');
    });

    it('should warn about unusually small files', async () => {
      const mockFileInfo = { exists: true, size: 512, modificationTime: Date.now() };
      const mockFileContent = 'base64encodedcontent';
      
      mockFileSystem.getInfoAsync.mockResolvedValue(mockFileInfo as any);
      mockFileSystem.readAsStringAsync.mockResolvedValue(mockFileContent);

      const result = await backupService.verifyBackup('/mock/small.db');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Backup file is unusually small');
    });
  });

});
