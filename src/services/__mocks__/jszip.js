module.exports = jest.fn(() => ({
  file: jest.fn(),
  generateAsync: jest.fn(),
  loadAsync: jest.fn()
}));
