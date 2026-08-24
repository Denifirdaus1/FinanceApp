import type { ExpoConfig } from 'expo/config';

import appJson from './app.json';
import { loadEnv } from '@financeapp/config';

export default (): ExpoConfig => {
  const base = appJson.expo as ExpoConfig;
  let publicEnv;
  try {
    publicEnv = loadEnv(process.env);
  } catch (error) {
    if (process.env.EXPO_PUBLIC_APP_ENV === 'production') {
      throw error;
    }
    publicEnv = null;
  }
  return {
    ...base,
    extra: {
      ...base.extra,
      appEnv: publicEnv?.appEnv ?? 'development',
      supabaseUrl: publicEnv?.supabaseUrl,
      supabaseAnonKey: publicEnv?.supabaseAnonKey,
      easUpdateChannel: publicEnv?.easUpdateChannel ?? 'development',
    },
  };
};
