import type { ExpoConfig } from 'expo/config';

import { loadEnv } from '@financeapp/config';

type AppEnvironment = 'development' | 'preview' | 'production';

const EAS_PROJECT_ID = 'de64cde1-0152-4944-9f4d-0350b2b3bdf0';

const BASE_CONFIG: ExpoConfig = {
  name: 'FinanceApp',
  slug: 'financeapp',
  owner: 'denifirdaus',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  plugins: ['expo-router'],
  ios: {
    supportsTablet: true,
    config: {
      usesNonExemptEncryption: false,
    },
  },
};

const APP_VARIANTS: Record<
  AppEnvironment,
  {
    scheme: string;
    applicationId: string;
  }
> = {
  development: {
    scheme: 'financeapp-dev',
    applicationId: 'id.financeapp.mobile.dev',
  },
  preview: {
    scheme: 'financeapp-preview',
    applicationId: 'id.financeapp.mobile.preview',
  },
  production: {
    scheme: 'financeapp',
    applicationId: 'id.financeapp.mobile',
  },
};

export default (): ExpoConfig => {
  const base = BASE_CONFIG;
  let publicEnv;
  try {
    publicEnv = loadEnv(process.env);
  } catch (error) {
    const appEnv = process.env.EXPO_PUBLIC_APP_ENV;
    if (appEnv === 'production' || appEnv === 'preview') {
      throw error;
    }
    publicEnv = null;
  }
  const appEnv: AppEnvironment = publicEnv?.appEnv ?? 'development';
  const variant = APP_VARIANTS[appEnv];
  const otaUpdatesEnabled = appEnv !== 'development';
  return {
    ...base,
    scheme: variant.scheme,
    runtimeVersion: otaUpdatesEnabled ? { policy: 'fingerprint' } : undefined,
    updates: {
      ...base.updates,
      enabled: otaUpdatesEnabled,
      checkAutomatically: otaUpdatesEnabled ? 'ON_LOAD' : 'NEVER',
      fallbackToCacheTimeout: 0,
      url: otaUpdatesEnabled ? `https://u.expo.dev/${EAS_PROJECT_ID}` : undefined,
    },
    plugins: [...(base.plugins ?? []), 'expo-apple-authentication'],
    ios: {
      ...base.ios,
      bundleIdentifier: variant.applicationId,
      usesAppleSignIn: true,
    },
    android: {
      ...base.android,
      package: variant.applicationId,
    },
    extra: {
      ...base.extra,
      appEnv,
      supabaseUrl: publicEnv?.supabaseUrl,
      supabaseAnonKey: publicEnv?.supabaseAnonKey,
      easUpdateChannel: publicEnv?.easUpdateChannel ?? 'development',
      authRedirectUrl: `${variant.scheme}://auth/callback`,
      e2eSessionOverride: appEnv === 'development' ? process.env.E2E_SESSION_OVERRIDE : undefined,
      eas: {
        projectId: EAS_PROJECT_ID,
      },
    },
  };
};
