import Constants from 'expo-constants';

import type { SessionState } from './session-facade';

const VALID_OVERRIDES = new Set(['loading', 'signedOut', 'signedIn', 'revoked', 'error']);

export function getE2eSessionOverride(): SessionState | null {
  const override = Constants.expoConfig?.extra?.e2eSessionOverride;
  if (typeof override !== 'string' || !VALID_OVERRIDES.has(override)) {
    return null;
  }
  if (override === 'signedIn') {
    return {
      status: 'signedIn',
      user: { id: 'e2e-user', displayName: 'Pengguna Uji' },
      offline: false,
    };
  }
  return { status: override as SessionState['status'], user: null, offline: false };
}
