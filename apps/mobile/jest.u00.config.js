const base = require('./jest.config');
const path = require('node:path');

module.exports = {
  ...base,
  preset: path.dirname(require.resolve('jest-expo/package.json')),
  rootDir: '../..',
  testMatch: ['<rootDir>/apps/mobile/src/storybook/u00-components.test.tsx'],
  moduleNameMapper: {
    '^@financeapp/ui$': '<rootDir>/packages/ui/src/index.ts',
  },
  collectCoverageFrom: ['packages/ui/src/**/*.{ts,tsx}', '!packages/ui/src/**/index.ts'],
  forceCoverageMatch: ['packages/ui/src/**/*.{ts,tsx}'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
