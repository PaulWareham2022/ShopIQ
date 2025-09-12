module.exports = {
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
  cacheDirectory: '/mock/cache/',
  EncodingType: {
    Base64: 'base64',
    UTF8: 'utf8'
  }
};
