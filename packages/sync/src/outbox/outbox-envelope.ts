import type { PurgeDirective } from '../db/local-database-contract';

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface OutboxScope {
  readonly type: 'user' | 'household';
  readonly id: string;
}

export interface OutboxEntity {
  readonly type: string;
  readonly id: string;
  readonly version: number;
}

export interface OutboxTombstone {
  readonly deletedAt: string;
}

export interface OutboxEnvelope<TPayload extends JsonValue = JsonValue> {
  readonly envelopeVersion: 1;
  readonly operationId: string;
  readonly idempotencyKey: string;
  readonly scope: Readonly<OutboxScope>;
  readonly entity: Readonly<OutboxEntity>;
  readonly command: string;
  readonly payload: TPayload;
  readonly tombstone: Readonly<OutboxTombstone> | null;
  readonly purge: PurgeDirective | null;
  readonly createdAt: string;
}

export interface OutboxEnvelopeDependencies {
  createOperationId(): string;
  now(): string;
}

const SAFE_IDENTIFIER = /^[A-Za-z0-9._-]+$/;
const SAFE_COMMAND = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PURGE_REASONS = new Set([
  'logout',
  'account_deleted',
  'session_revoked',
  'access_revoked',
  'key_lost',
  'database_corrupted',
]);

function requireIdentifier(value: string, field: string): string {
  const normalized = value.trim();
  if (!SAFE_IDENTIFIER.test(normalized) || normalized.length > 128) {
    throw new TypeError(`${field} must be a safe non-empty identifier`);
  }
  return normalized;
}

function normalizePurgeDirective(input: PurgeDirective): PurgeDirective {
  if (
    input.directiveVersion !== 1 ||
    !PURGE_REASONS.has(input.reason) ||
    (input.scope.type !== 'user' && input.scope.type !== 'household')
  ) {
    throw new TypeError('purge directive is invalid');
  }
  const scope = Object.freeze({
    type: input.scope.type,
    id: requireIdentifier(input.scope.id, 'purge scope id'),
  });
  return Object.freeze({
    directiveVersion: 1 as const,
    reason: input.reason,
    scope,
    requestedAt: requireTimestamp(input.requestedAt, 'purge requestedAt'),
  });
}

function requireTimestamp(value: string, field: string): string {
  if (!Number.isFinite(Date.parse(value)) || !value.endsWith('Z')) {
    throw new TypeError(`${field} must be an ISO-8601 UTC timestamp`);
  }
  return value;
}

function cloneJson(value: unknown, seen = new WeakSet<object>()): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('payload contains a non-finite number');
    }
    return value;
  }
  if (typeof value !== 'object') {
    throw new TypeError('payload must be JSON-safe');
  }
  if (seen.has(value)) {
    throw new TypeError('payload must not contain cycles');
  }
  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.map((item) => cloneJson(item, seen));
    seen.delete(value);
    return Object.freeze(result) as unknown as JsonValue;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('payload must contain plain objects only');
  }
  const result: Record<string, JsonValue> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
      throw new TypeError('payload contains an unsafe key');
    }
    result[key] = cloneJson(item, seen);
  }
  seen.delete(value);
  return Object.freeze(result);
}

export function createOutboxEnvelope<TPayload extends JsonValue>(
  input: {
    scope: OutboxScope;
    entity: OutboxEntity;
    command: string;
    payload: TPayload;
    tombstone?: OutboxTombstone;
    purge?: PurgeDirective;
  },
  dependencies: OutboxEnvelopeDependencies,
): OutboxEnvelope<TPayload> {
  const operationId = dependencies.createOperationId();
  if (!UUID_V4.test(operationId)) {
    throw new TypeError('operation id must be a UUID v4');
  }
  if (!Number.isSafeInteger(input.entity.version) || input.entity.version < 1) {
    throw new TypeError('entity version must be a positive safe integer');
  }
  if (!SAFE_COMMAND.test(input.command)) {
    throw new TypeError('command must use a namespaced safe identifier');
  }

  const scope = Object.freeze({
    type: input.scope.type,
    id: requireIdentifier(input.scope.id, 'scope id'),
  });
  const entity = Object.freeze({
    type: requireIdentifier(input.entity.type, 'entity type'),
    id: requireIdentifier(input.entity.id, 'entity id'),
    version: input.entity.version,
  });
  const purge = input.purge ? normalizePurgeDirective(input.purge) : null;
  if (purge && (purge.scope.type !== scope.type || purge.scope.id !== scope.id)) {
    throw new TypeError('purge scope must match envelope scope');
  }
  if (input.tombstone && !input.command.endsWith('.delete')) {
    throw new TypeError('tombstone requires a delete command');
  }
  const tombstone = input.tombstone
    ? Object.freeze({ deletedAt: requireTimestamp(input.tombstone.deletedAt, 'deletedAt') })
    : null;
  const createdAt = requireTimestamp(dependencies.now(), 'createdAt');

  return Object.freeze({
    envelopeVersion: 1 as const,
    operationId,
    idempotencyKey: `${scope.type}:${scope.id}:${entity.type}:${entity.id}:${entity.version}:${operationId}`,
    scope,
    entity,
    command: input.command,
    payload: cloneJson(input.payload) as TPayload,
    tombstone,
    purge,
    createdAt,
  });
}
