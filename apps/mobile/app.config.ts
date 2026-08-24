import type { ExpoConfig } from 'expo/config';

import appJson from './app.json';
import { loadEnv } from '@financeapp/config';

export default (): ExpoConfig => {
  const base = appJson.expo as ExpoConfig;
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
  const appEnv = publicEnv?.appEnv ?? 'development';
  return {
    ...base,
    extra: {
      ...base.extra,
      appEnv,
      supabaseUrl: publicEnv?.supabaseUrl,
      supabaseAnonKey: publicEnv?.supabaseAnonKey,
      easUpdateChannel: publicEnv?.easUpdateChannel ?? 'development',
      e2eSessionOverride: appEnv === 'development' ? process.env.E2E_SESSION_OVERRIDE : undefined,
    },
  };
};
