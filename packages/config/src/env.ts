import { z } from 'zod';

export const APP_ENV_VALUES = ['development', 'preview', 'production'] as const;

export type AppEnv = (typeof APP_ENV_VALUES)[number];

export interface PublicEnvConfig {
  appEnv: AppEnv;
  supabaseUrl: string;
  supabaseAnonKey: string;
  easUpdateChannel: string;
}

export interface EnvIssue {
  path: string;
  message: string;
}

export class EnvValidationError extends Error {
  readonly issues: readonly EnvIssue[];

  constructor(issues: readonly EnvIssue[]) {
    super(`Invalid environment configuration (${issues.length} issue(s))`);
    this.name = 'EnvValidationError';
    this.issues = issues;
  }
}

export const ALLOWED_PUBLIC_ENV_KEYS = [
  'EXPO_PUBLIC_APP_ENV',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_EAS_UPDATE_CHANNEL',
] as const;

const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function isPublicUrl(value: string, appEnv: AppEnv): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol === 'https:') {
    return true;
  }
  return url.protocol === 'http:' && appEnv === 'development' && LOCALHOST_HOSTS.has(url.hostname);
}

function jwtRole(value: string): string | undefined {
  const parts = value.split('.');
  if (parts.length !== 3) {
    return undefined;
  }
  try {
    const payload = JSON.parse(globalThis.atob(parts[1] ?? '')) as { role?: unknown };
    return typeof payload.role === 'string' ? payload.role : undefined;
  } catch {
    return undefined;
  }
}

function isPublishableAnonKey(value: string): boolean {
  if (value.startsWith('sb_publishable_')) {
    return true;
  }
  if (value.startsWith('sb_secret_')) {
    return false;
  }
  return jwtRole(value) === 'anon';
}

const envSchema = z
  .object({
    EXPO_PUBLIC_APP_ENV: z.enum(APP_ENV_VALUES),
    EXPO_PUBLIC_SUPABASE_URL: z.string().min(1),
    EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    EXPO_PUBLIC_EAS_UPDATE_CHANNEL: z.string().min(1),
  })
  .superRefine((env, ctx) => {
    if (
      env.EXPO_PUBLIC_SUPABASE_URL &&
      !isPublicUrl(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_APP_ENV)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['EXPO_PUBLIC_SUPABASE_URL'],
        message: 'must be a valid HTTPS URL (HTTP is allowed only for localhost in development)',
      });
    }
    if (
      env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
      !isPublishableAnonKey(env.EXPO_PUBLIC_SUPABASE_ANON_KEY)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['EXPO_PUBLIC_SUPABASE_ANON_KEY'],
        message:
          'must be a Supabase publishable/anon key (service-role and secret keys are rejected)',
      });
    }
    if (
      env.EXPO_PUBLIC_APP_ENV &&
      env.EXPO_PUBLIC_EAS_UPDATE_CHANNEL &&
      env.EXPO_PUBLIC_EAS_UPDATE_CHANNEL !== env.EXPO_PUBLIC_APP_ENV
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['EXPO_PUBLIC_EAS_UPDATE_CHANNEL'],
        message: 'must match EXPO_PUBLIC_APP_ENV',
      });
    }
  });

export function parseEnv(source: Record<string, string | undefined>): PublicEnvConfig {
  const raw = {} as Record<(typeof ALLOWED_PUBLIC_ENV_KEYS)[number], string | undefined>;
  for (const key of ALLOWED_PUBLIC_ENV_KEYS) {
    raw[key] = source[key];
  }

  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }

  return {
    appEnv: result.data.EXPO_PUBLIC_APP_ENV,
    supabaseUrl: result.data.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: result.data.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    easUpdateChannel: result.data.EXPO_PUBLIC_EAS_UPDATE_CHANNEL,
  };
}

export function loadEnv(source: Record<string, string | undefined> = process.env): PublicEnvConfig {
  return parseEnv(source);
}
