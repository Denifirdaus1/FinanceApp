export const AUTH_PROVIDERS = ['google', 'apple'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export const AUTH_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  contentMaxWidth: 480,
} as const;

export const AUTH_PROVIDER_LABELS: Record<AuthProvider, string> = {
  google: 'Google',
  apple: 'Apple',
};

export type AuthFixtureOutcome =
  'success' | 'cancelled' | 'provider-error' | 'offline' | 'malformed-callback';

export type AuthSessionOutcome = 'valid' | 'offline' | 'revoked' | 'expired' | 'error';

export interface AuthFixtureScenario {
  google?: AuthFixtureOutcome | readonly AuthFixtureOutcome[];
  apple?: AuthFixtureOutcome | readonly AuthFixtureOutcome[];
  session?: AuthSessionOutcome | readonly AuthSessionOutcome[];
}

export interface FixtureUser {
  id: string;
  displayName: string;
  provider: AuthProvider;
}

export interface AccountBootstrapInput {
  displayName: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  locale: string;
  currency: string;
  timezone: string;
}

export const DEFAULT_ACCOUNT_BOOTSTRAP_INPUT: AccountBootstrapInput = {
  displayName: '',
  termsAccepted: false,
  privacyAccepted: false,
  locale: 'id-ID',
  currency: 'IDR',
  timezone: 'Asia/Jakarta',
};

export const FIXTURE_USERS: Record<AuthProvider, FixtureUser> = {
  google: { id: 'fixture-google-user', displayName: 'Google fixture', provider: 'google' },
  apple: { id: 'fixture-apple-user', displayName: 'Apple fixture', provider: 'apple' },
};

export type AuthCallbackResult =
  { kind: 'accepted'; provider: AuthProvider } | { kind: 'rejected'; code: 'malformed-callback' };

export interface AuthCallbackParams {
  provider?: string | string[];
  state?: string | string[];
  [key: string]: string | string[] | undefined;
}

export type AuthStartResult =
  | { kind: 'callback'; provider: AuthProvider; callbackUrl: string }
  | { kind: 'cancelled'; provider: AuthProvider }
  | { kind: 'provider-error'; provider: AuthProvider }
  | { kind: 'offline'; provider: AuthProvider };

export type AuthSessionResult =
  | { kind: 'valid'; user: FixtureUser }
  | { kind: 'offline' }
  | { kind: 'revoked' }
  | { kind: 'expired' }
  | { kind: 'error' };

export type AccountBootstrapResult =
  | { kind: 'success'; displayName: string; provider: AuthProvider; locale: 'id-ID' }
  | { kind: 'validation-error'; fields: AccountValidationField[] };

export type AccountValidationField =
  'displayName' | 'termsAccepted' | 'privacyAccepted' | 'locale' | 'currency' | 'timezone';

export interface AuthFixture {
  startSignIn(provider: AuthProvider): Promise<AuthStartResult>;
  resolveCallback(value: string): AuthCallbackResult;
  resolveCallbackParams(params: AuthCallbackParams): AuthCallbackResult;
  bootstrapSession(provider: AuthProvider): Promise<AuthSessionResult>;
  bootstrapAccount(
    input: AccountBootstrapInput,
    user: FixtureUser,
  ): Promise<AccountBootstrapResult>;
}

function nextOutcome<T extends string>(value: T | readonly T[] | undefined, fallback: T): T {
  if (Array.isArray(value)) {
    return value.length > 0 ? (value[0] as T) : fallback;
  }
  return (value as T | undefined) ?? fallback;
}

function consumeOutcome<T extends string>(
  value: T | readonly T[] | undefined,
  fallback: T,
): { value: T; next: T | readonly T[] | undefined } {
  if (!Array.isArray(value)) {
    return { value: (value as T | undefined) ?? fallback, next: value };
  }
  return { value: nextOutcome(value, fallback), next: value.slice(1) };
}

export function createFixtureCallbackUrl(provider: AuthProvider): string {
  return `financeapp://auth/callback?provider=${provider}&state=fixture-success`;
}

export function parseAuthCallback(value: string): AuthCallbackResult {
  if (typeof value !== 'string' || value.length === 0 || value.length > 256) {
    return { kind: 'rejected', code: 'malformed-callback' };
  }

  try {
    const parsed = new URL(value);
    const keys = [...new Set([...parsed.searchParams.keys()])];
    const provider = parsed.searchParams.get('provider');
    const state = parsed.searchParams.get('state');
    if (
      parsed.protocol !== 'financeapp:' ||
      parsed.hostname !== 'auth' ||
      parsed.pathname !== '/callback' ||
      parsed.hash ||
      keys.length !== 2 ||
      !keys.includes('provider') ||
      !keys.includes('state') ||
      !AUTH_PROVIDERS.includes(provider as AuthProvider) ||
      state !== 'fixture-success'
    ) {
      return { kind: 'rejected', code: 'malformed-callback' };
    }
    return { kind: 'accepted', provider: provider as AuthProvider };
  } catch {
    return { kind: 'rejected', code: 'malformed-callback' };
  }
}

function getSingleParam(params: AuthCallbackParams, key: string): string | null {
  const value = params[key];
  return typeof value === 'string' ? value : null;
}

export function parseAuthCallbackParams(params: AuthCallbackParams): AuthCallbackResult {
  const provider = getSingleParam(params, 'provider');
  const state = getSingleParam(params, 'state');
  const keys = Object.keys(params).filter((key) => params[key] !== undefined);
  if (
    keys.length !== 2 ||
    !keys.includes('provider') ||
    !keys.includes('state') ||
    !AUTH_PROVIDERS.includes(provider as AuthProvider) ||
    state !== 'fixture-success'
  ) {
    return { kind: 'rejected', code: 'malformed-callback' };
  }
  return { kind: 'accepted', provider: provider as AuthProvider };
}

export function validateAccountBootstrap(input: AccountBootstrapInput): AccountValidationField[] {
  const fields: AccountValidationField[] = [];
  if (input.displayName.trim().length === 0) fields.push('displayName');
  if (!input.termsAccepted) fields.push('termsAccepted');
  if (!input.privacyAccepted) fields.push('privacyAccepted');
  if (input.locale !== 'id-ID') fields.push('locale');
  if (input.currency !== 'IDR') fields.push('currency');
  if (input.timezone !== 'Asia/Jakarta') fields.push('timezone');
  return fields;
}

export function createAuthFixture(scenario: AuthFixtureScenario = {}): AuthFixture {
  let providerOutcomes = {
    google: scenario.google,
    apple: scenario.apple,
  };
  let sessionOutcomes = scenario.session;

  return {
    async startSignIn(provider) {
      const consumed = consumeOutcome(providerOutcomes[provider], 'success');
      providerOutcomes = { ...providerOutcomes, [provider]: consumed.next };
      switch (consumed.value) {
        case 'cancelled':
          return { kind: 'cancelled', provider };
        case 'provider-error':
          return { kind: 'provider-error', provider };
        case 'offline':
          return { kind: 'offline', provider };
        case 'malformed-callback':
          return {
            kind: 'callback',
            provider,
            callbackUrl: `financeapp://auth/callback?provider=${provider}&state=fixture-invalid`,
          };
        case 'success':
        default:
          return { kind: 'callback', provider, callbackUrl: createFixtureCallbackUrl(provider) };
      }
    },
    resolveCallback: parseAuthCallback,
    resolveCallbackParams: parseAuthCallbackParams,
    async bootstrapSession(provider) {
      const consumed = consumeOutcome(sessionOutcomes, 'valid');
      sessionOutcomes = consumed.next;
      switch (consumed.value) {
        case 'offline':
          return { kind: 'offline' };
        case 'revoked':
          return { kind: 'revoked' };
        case 'expired':
          return { kind: 'expired' };
        case 'error':
          return { kind: 'error' };
        case 'valid':
        default:
          return { kind: 'valid', user: FIXTURE_USERS[provider] };
      }
    },
    async bootstrapAccount(input, user) {
      const fields = validateAccountBootstrap(input);
      if (fields.length > 0) return { kind: 'validation-error', fields };
      return {
        kind: 'success',
        displayName: input.displayName.trim(),
        provider: user.provider,
        locale: 'id-ID',
      };
    },
  };
}
