export class AnalyticsPolicyError extends Error {
  constructor() {
    super('Analytics event rejected by privacy policy');
    this.name = 'AnalyticsPolicyError';
  }
}

type PropertyValidator = (value: unknown) => boolean;

const oneOf = <T extends string>(values: readonly T[]): PropertyValidator => {
  const allowed = new Set<unknown>(values);
  return (value: unknown): boolean => allowed.has(value);
};

const EVENT_POLICIES = Object.freeze({
  app_boot_completed: Object.freeze({
    offline: (value: unknown) => typeof value === 'boolean',
    recovery: oneOf(['none', 'key_loss', 'database_corrupted'] as const),
  }),
  local_database_recovered: Object.freeze({
    reason: oneOf(['key_loss', 'database_corrupted'] as const),
  }),
  privacy_mode_changed: Object.freeze({
    enabled: (value: unknown) => typeof value === 'boolean',
  }),
  session_state_changed: Object.freeze({
    state: oneOf(['signed_out', 'signed_in', 'revoked', 'error'] as const),
  }),
  outbox_health_observed: Object.freeze({
    ageBucket: oneOf(['empty', 'fresh', 'stale', 'critical'] as const),
    queueSizeBucket: oneOf(['empty', 'small', 'medium', 'large'] as const),
  }),
});

export type AnalyticsEventName = keyof typeof EVENT_POLICIES;

export interface AnalyticsEvent {
  readonly name: AnalyticsEventName;
  readonly properties: Readonly<Record<string, boolean | string>>;
}

const SENSITIVE_KEY =
  /(amount|balance|merchant|payee|note|memo|description|receipt|image|audio|voice|transcript|ocr|token|secret|password|email|phone|card|iban|accountnumber)/i;
const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const SENSITIVE_STRING = /(sb_secret_|service_role|bearer\s+[a-z0-9._-]+|eyJ[a-z0-9_-]{8,}\.)/i;
const SAFE_DIAGNOSTIC_KEYS = new Set([
  'route',
  'safecode',
  'errorcode',
  'state',
  'status',
  'reason',
  'platform',
  'buildversion',
  'recovery',
  'offline',
]);

function normalizeKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(normalizeKey(key));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertNoSensitiveFields(value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value !== 'object') {
    return;
  }
  if (seen.has(value)) {
    throw new AnalyticsPolicyError();
  }
  seen.add(value);
  for (const [key, item] of Object.entries(value)) {
    if (isSensitiveKey(key) || UNSAFE_OBJECT_KEYS.has(key)) {
      throw new AnalyticsPolicyError();
    }
    assertNoSensitiveFields(item, seen);
  }
  seen.delete(value);
}

export function createAnalyticsEvent(name: string, properties: unknown): AnalyticsEvent {
  assertNoSensitiveFields(properties);
  if (!(name in EVENT_POLICIES) || !isPlainObject(properties)) {
    throw new AnalyticsPolicyError();
  }
  const eventName = name as AnalyticsEventName;
  const policy = EVENT_POLICIES[eventName] as Readonly<Record<string, PropertyValidator>>;
  const propertyKeys = Object.keys(properties);
  const expectedKeys = Object.keys(policy);
  if (
    propertyKeys.length !== expectedKeys.length ||
    propertyKeys.some((key) => !Object.prototype.hasOwnProperty.call(policy, key))
  ) {
    throw new AnalyticsPolicyError();
  }
  for (const key of expectedKeys) {
    if (!policy[key]?.(properties[key])) {
      throw new AnalyticsPolicyError();
    }
  }
  return Object.freeze({
    name: eventName,
    properties: Object.freeze({ ...(properties as Record<string, boolean | string>) }),
  });
}

export function redactDiagnosticContext(value: unknown): unknown {
  return redactValue(value, new WeakSet<object>());
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') {
    return SENSITIVE_STRING.test(value) ? '[REDACTED]' : value.replace(/[\r\n]/g, ' ');
  }
  if (value === null || typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }
  if (typeof value !== 'object' || seen.has(value)) {
    return '[REDACTED]';
  }
  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.map((item) => redactValue(item, seen));
    seen.delete(value);
    return result;
  }
  if (!isPlainObject(value)) {
    seen.delete(value);
    return '[REDACTED]';
  }
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (UNSAFE_OBJECT_KEYS.has(key)) {
      continue;
    }
    const normalizedKey = normalizeKey(key);
    if (isSensitiveKey(key)) {
      result[key] = '[REDACTED]';
    } else if (item !== null && typeof item === 'object') {
      result[key] = redactValue(item, seen);
    } else {
      result[key] = SAFE_DIAGNOSTIC_KEYS.has(normalizedKey)
        ? redactValue(item, seen)
        : '[REDACTED]';
    }
  }
  seen.delete(value);
  return result;
}
