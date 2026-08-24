const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier/flat');

const domainBoundaryRules = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        'react-native',
        'react-native/*',
        'expo',
        'expo/*',
        'expo-*',
        '@expo/*',
        '@supabase/*',
      ],
    },
  ],
};

module.exports = defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/.expo/**',
    '**/dist/**',
    '**/coverage/**',
    '**/*.tsbuildinfo',
    'apps/mobile/expo-env.d.ts',
  ]),
  ...expoConfig,
  {
    files: ['packages/domain/**/*.{ts,tsx}'],
    rules: domainBoundaryRules,
  },
  eslintConfigPrettier,
]);
