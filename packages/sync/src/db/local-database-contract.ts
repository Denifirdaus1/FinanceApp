export type LocalSqlValue = null | string | number | Uint8Array;

export interface LocalTransaction {
  execute(sql: string, parameters?: readonly LocalSqlValue[]): Promise<void>;
  first<T>(sql: string, parameters?: readonly LocalSqlValue[]): Promise<T | null>;
  all<T>(sql: string, parameters?: readonly LocalSqlValue[]): Promise<readonly T[]>;
}

export interface LocalTransactionBoundary {
  withExclusiveTransaction<T>(work: (transaction: LocalTransaction) => Promise<T>): Promise<T>;
}

export type PurgeReason =
  | 'logout'
  | 'account_deleted'
  | 'session_revoked'
  | 'access_revoked'
  | 'key_lost'
  | 'database_corrupted';

export type PurgeScope =
  | Readonly<{ type: 'database'; id: 'local' }>
  | Readonly<{ type: 'user'; id: string }>
  | Readonly<{ type: 'household'; id: string }>
  | Readonly<{ type: 'entity'; id: string }>;

export interface PurgeDirective {
  readonly directiveVersion: 1;
  readonly reason: PurgeReason;
  readonly scope: PurgeScope;
  readonly requestedAt: string;
}

export interface LocalRepository<TEntity> {
  findById(transaction: LocalTransaction, id: string): Promise<TEntity | null>;
  upsert(transaction: LocalTransaction, entity: TEntity): Promise<void>;
  tombstone(
    transaction: LocalTransaction,
    id: string,
    version: number,
    deletedAt: string,
  ): Promise<void>;
  purge(transaction: LocalTransaction, directive: PurgeDirective): Promise<void>;
}

const PURGE_REASONS = new Set<PurgeReason>([
  'logout',
  'account_deleted',
  'session_revoked',
  'access_revoked',
  'key_lost',
  'database_corrupted',
]);
const PURGE_SCOPE_TYPES = new Set<PurgeScope['type']>(['database', 'user', 'household', 'entity']);

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new TypeError(`${field} must be non-empty`);
  }
  return normalized;
}

function requireIsoTimestamp(value: string, field: string): string {
  if (!Number.isFinite(Date.parse(value)) || !value.endsWith('Z')) {
    throw new TypeError(`${field} must be an ISO-8601 UTC timestamp`);
  }
  return value;
}

export function createPurgeDirective(input: {
  reason: PurgeReason;
  scope: PurgeScope;
  requestedAt: string;
}): PurgeDirective {
  if (!PURGE_REASONS.has(input.reason) || !PURGE_SCOPE_TYPES.has(input.scope.type)) {
    throw new TypeError('purge directive contains an unsupported value');
  }
  const scope = Object.freeze({
    type: input.scope.type,
    id: requireNonEmpty(input.scope.id, 'scope id'),
  }) as PurgeScope;
  return Object.freeze({
    directiveVersion: 1 as const,
    reason: input.reason,
    scope,
    requestedAt: requireIsoTimestamp(input.requestedAt, 'requestedAt'),
  });
}

export function runInLocalTransaction<T>(
  boundary: LocalTransactionBoundary,
  work: (transaction: LocalTransaction) => Promise<T>,
): Promise<T> {
  return boundary.withExclusiveTransaction(work);
}
