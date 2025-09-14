module.exports = {
  preset: 'ts-jest',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.(ts|tsx|js)', '**/*.(test|spec).(ts|tsx|js)'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/types.ts',
    '!src/**/test-*.ts',
  ],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/storage/__tests__/setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native-svg$': '<rootDir>/src/__mocks__/react-native-svg.js',
    '^react-native-star-rating-widget$': '<rootDir>/src/__mocks__/react-native-star-rating-widget.js',
    '^expo-file-system$': '<rootDir>/src/services/__mocks__/expo-file-system.js',
    '^expo-document-picker$': '<rootDir>/src/services/__mocks__/expo-document-picker.js',
    '^expo-sharing$': '<rootDir>/src/services/__mocks__/expo-sharing.js',
    '^expo-secure-store$': '<rootDir>/src/__mocks__/expo-secure-store.js',
    '^jszip$': '<rootDir>/src/services/__mocks__/jszip.js',
  },
  globals: {
    __DEV__: false,
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|expo-modules-core|react-native-mmkv|expo-sqlite|expo-file-system|expo-document-picker|expo-sharing|jszip|@testing-library)/)',
  ],
  testTimeout: 30000,
};
