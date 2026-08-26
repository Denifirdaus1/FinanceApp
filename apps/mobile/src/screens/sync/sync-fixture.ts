export const SYNC_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  contentMaxWidth: 720,
} as const;

export const SAFE_ENTITY_TYPES = ['transaction', 'preference', 'category'] as const;
export type SafeEntityType = (typeof SAFE_ENTITY_TYPES)[number];

export type SyncScenario =
  | 'ready'
  | 'local_only'
  | 'loading'
  | 'empty'
  | 'offline'
  | 'needs_review'
  | 'failed'
  | 'schema_incompatible'
  | 'revoked'
  | 'kill_switch'
  | 'manual_only'
  | 'retry_401'
  | 'retry_403'
  | 'retry_409'
  | 'retry_429'
  | 'retry_5xx'
  | 'non_retryable'
  | 'auto_merge'
  | 'critical_conflict'
  | 'rollback';

export type SyncState =
  | 'stored_on_device'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'needs_review'
  | 'failed'
  | 'schema_incompatible'
  | 'manual_only'
  | 'revoked';

export interface SyncStatus {
  state: SyncState;
  queueCount: number;
  lastSuccess: 'today' | 'not_available';
  scopeLocked: boolean;
  pushBlocked: boolean;
  manualOnly: boolean;
}

export interface SafePendingMutationMetadata {
  entityType: SafeEntityType;
  status: 'pending' | 'blocked' | 'review';
  retryState: 'ready' | 'offline' | 'backoff' | 'blocked' | 'review';
  attempts: number;
  ageBucket: 'under_1h' | 'under_1d' | 'over_1d';
}

export interface RetryOutcome {
  kind:
    | 'success'
    | 'offline'
    | 'reauth_required'
    | 'access_revoked'
    | 'conflict_review'
    | 'retry_after'
    | 'backoff'
    | 'review_required'
    | 'schema_blocked'
    | 'manual_only'
    | 'aggregate_rollback';
  message: string;
  idempotent: true;
  queueCount: number;
}

export type ConflictChoice = 'device' | 'server' | 'merge';

export interface ConflictReview {
  fields: string[];
  criticalFields: string[];
  mergeAllowed: boolean;
  deviceSummary: string;
  serverSummary: string;
}

export type ConflictResolution =
  | { kind: 'auto_merged'; message: string }
  | { kind: 'review_required'; message: string }
  | { kind: 'resolved'; choice: Exclude<ConflictChoice, 'merge'>; message: string };

export type PurgeResult =
  | { kind: 'reauth_required'; actualDeletion: false; scopeLocked: true }
  | { kind: 'purge_queued'; actualDeletion: false; scopeLocked: true };

export type SchemaActionResult =
  | { kind: 'update_handoff'; message: string }
  | { kind: 'diagnostic_ready'; includesPayload: false; message: string };

function stateFor(scenario: SyncScenario): SyncState {
  if (scenario === 'loading') return 'syncing';
  if (scenario === 'offline') return 'offline';
  if (scenario === 'needs_review' || scenario === 'retry_409' || scenario === 'critical_conflict')
    return 'needs_review';
  if (scenario === 'failed' || scenario === 'retry_5xx' || scenario === 'rollback') return 'failed';
  if (scenario === 'schema_incompatible') return 'schema_incompatible';
  if (scenario === 'revoked' || scenario === 'retry_403') return 'revoked';
  if (scenario === 'kill_switch' || scenario === 'manual_only') return 'manual_only';
  if (scenario === 'retry_401') return 'syncing';
  if (scenario === 'local_only') return 'stored_on_device';
  return scenario === 'ready' || scenario === 'empty' || scenario === 'auto_merge'
    ? 'synced'
    : 'stored_on_device';
}

function retryOutcomeFor(scenario: SyncScenario): RetryOutcome['kind'] {
  if (scenario === 'offline') return 'offline';
  if (scenario === 'retry_401') return 'reauth_required';
  if (scenario === 'retry_403') return 'access_revoked';
  if (scenario === 'retry_409') return 'conflict_review';
  if (scenario === 'retry_429') return 'retry_after';
  if (scenario === 'retry_5xx' || scenario === 'failed') return 'backoff';
  if (scenario === 'non_retryable' || scenario === 'needs_review') return 'review_required';
  if (scenario === 'schema_incompatible') return 'schema_blocked';
  if (scenario === 'revoked') return 'access_revoked';
  if (scenario === 'kill_switch' || scenario === 'manual_only') return 'manual_only';
  if (scenario === 'rollback') return 'aggregate_rollback';
  return 'success';
}

function retryMessage(kind: RetryOutcome['kind']): string {
  if (kind === 'success') return 'Mutation fixture tersinkron tanpa membuat duplikat.';
  if (kind === 'offline') return 'Masih offline; mutation tetap aman di perangkat.';
  if (kind === 'reauth_required') return 'Sesi perlu autentikasi ulang sebelum retry.';
  if (kind === 'access_revoked') return 'Akses dicabut; scope dikunci dan perlu policy check.';
  if (kind === 'conflict_review') return 'Conflict perlu dipilih; tidak memakai last-write-wins.';
  if (kind === 'retry_after') return 'Server meminta retry-after; fixture menunggu jadwal aman.';
  if (kind === 'backoff') return 'Server error; exponential backoff fixture dipertahankan.';
  if (kind === 'review_required') return 'Mutation non-retryable masuk review manual.';
  if (kind === 'schema_blocked') return 'Schema tidak kompatibel; push diblokir.';
  if (kind === 'manual_only') return 'Mode manual-only aktif; tidak ada push otomatis.';
  return 'Aggregate di-rollback utuh; tidak ada mutation parsial.';
}

function safeQueueFor(scenario: SyncScenario): SafePendingMutationMetadata[] {
  if (scenario === 'empty') return [];
  const blocked = new Set<SyncScenario>([
    'schema_incompatible',
    'revoked',
    'retry_403',
    'kill_switch',
    'manual_only',
  ]);
  const review = new Set<SyncScenario>([
    'needs_review',
    'retry_409',
    'non_retryable',
    'critical_conflict',
  ]);
  return [
    {
      entityType: 'transaction',
      status: blocked.has(scenario) ? 'blocked' : review.has(scenario) ? 'review' : 'pending',
      retryState: blocked.has(scenario)
        ? 'blocked'
        : review.has(scenario)
          ? 'review'
          : scenario === 'offline' || scenario === 'retry_5xx'
            ? 'backoff'
            : 'ready',
      attempts: scenario === 'ready' ? 1 : 2,
      ageBucket: scenario === 'offline' ? 'over_1d' : 'under_1h',
    },
  ];
}

export function syncStateLabel(state: SyncState): string {
  if (state === 'stored_on_device') return 'Tersimpan di perangkat';
  if (state === 'syncing') return 'Menyinkronkan';
  if (state === 'synced') return 'Tersinkron';
  if (state === 'offline') return 'Offline';
  if (state === 'needs_review') return 'Perlu diperiksa';
  if (state === 'failed') return 'Gagal';
  if (state === 'schema_incompatible') return 'Schema incompatible';
  if (state === 'revoked') return 'Akses dicabut';
  return 'Manual-only';
}

export function createSyncFixture(scenario: SyncScenario = 'ready') {
  const queue = safeQueueFor(scenario);
  const retryCache = new Map<number, RetryOutcome>();
  return {
    scenario,
    status: {
      state: stateFor(scenario),
      queueCount: queue.length,
      lastSuccess: scenario === 'empty' ? ('not_available' as const) : ('today' as const),
      scopeLocked: scenario === 'revoked' || scenario === 'retry_403',
      pushBlocked: scenario === 'schema_incompatible' || scenario === 'revoked',
      manualOnly: scenario === 'kill_switch' || scenario === 'manual_only',
    } satisfies SyncStatus,
    safePendingMetadata() {
      return queue.map((item) => ({ ...item }));
    },
    retryMutation(index: number): RetryOutcome {
      const cached = retryCache.get(index);
      if (cached) return cached;
      const kind = retryOutcomeFor(scenario);
      const result: RetryOutcome = {
        kind,
        message: retryMessage(kind),
        idempotent: true,
        queueCount: kind === 'success' ? 0 : queue.length,
      };
      retryCache.set(index, result);
      return result;
    },
    conflictReview(): ConflictReview {
      const critical = scenario === 'critical_conflict';
      return {
        fields: critical ? ['amount'] : ['note', 'category'],
        criticalFields: critical ? ['amount'] : [],
        mergeAllowed: !critical,
        deviceSummary: critical
          ? 'Jumlah di perangkat berubah.'
          : 'Catatan dan kategori di perangkat berubah.',
        serverSummary: critical
          ? 'Jumlah di server berubah.'
          : 'Catatan dan kategori di server tetap berbeda.',
      };
    },
    resolveConflict(choice: ConflictChoice): ConflictResolution {
      if (choice === 'merge' && scenario === 'auto_merge')
        return { kind: 'auto_merged', message: 'Perubahan field berbeda digabungkan otomatis.' };
      if (choice === 'merge')
        return {
          kind: 'review_required',
          message: 'Jumlah adalah field finance-critical; pilih versi.',
        };
      return { kind: 'resolved', choice, message: `Versi ${choice} dipilih pada fixture.` };
    },
    purgeAccess(confirmed: boolean): PurgeResult {
      return confirmed
        ? { kind: 'purge_queued', actualDeletion: false, scopeLocked: true }
        : { kind: 'reauth_required', actualDeletion: false, scopeLocked: true };
    },
    requestReauth() {
      return { kind: 'reauth_prompt' as const, scopeLocked: true };
    },
    updateApp(): SchemaActionResult {
      return {
        kind: 'update_handoff',
        message: 'Update aplikasi fixture dibuka; local data tidak diubah.',
      };
    },
    exportDiagnostic(): SchemaActionResult {
      return {
        kind: 'diagnostic_ready',
        includesPayload: false,
        message: 'Diagnostic fixture berisi code dan timing, tanpa payload finansial.',
      };
    },
    openManualGuide() {
      return { kind: 'manual_only' as const, message: 'Panduan retry manual fixture dibuka.' };
    },
  };
}

export type SyncFixture = ReturnType<typeof createSyncFixture>;
