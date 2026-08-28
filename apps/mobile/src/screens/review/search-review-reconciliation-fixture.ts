import type { SupportedCurrency } from '../transactions/transactions-fixture';

export const REVIEW_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  maximumContentWidth: 720,
} as const;

export type SearchScenario =
  | 'ready'
  | 'empty'
  | 'no_result'
  | 'partial'
  | 'indexing'
  | 'source_changed'
  | 'pending_race'
  | 'offline'
  | 'unauthorized'
  | 'corrupt_cursor'
  | 'reconciliation_stale';

export type SearchEntityType =
  'transaction' | 'account' | 'category' | 'tag' | 'recurring' | 'goal' | 'debt' | 'attachment';

export type SearchFilters = {
  entityTypes?: SearchEntityType[];
  dateFrom?: string;
  dateTo?: string;
  minAmountMinor?: string;
  maxAmountMinor?: string;
  entryType?: 'income' | 'expense' | 'transfer';
  lifecycle?: 'draft' | 'posted' | 'void';
  clearing?: 'pending' | 'cleared' | 'reconciled';
  accountId?: string;
  categoryId?: string;
  tagId?: string;
  currency?: SupportedCurrency;
  source?: 'manual' | 'receipt' | 'voice' | 'recurring';
  hasReceipt?: boolean;
  hasNote?: boolean;
};

export type SearchRecord = {
  id: string;
  entityType: SearchEntityType;
  label: string;
  searchableText: string;
  occurredAt: string;
  amountMinor?: string;
  currency?: SupportedCurrency;
  entryType?: 'income' | 'expense' | 'transfer';
  lifecycle?: 'draft' | 'posted' | 'void';
  clearing?: 'pending' | 'cleared' | 'reconciled';
  accountId?: string;
  categoryId?: string;
  tagIds?: string[];
  source?: 'manual' | 'receipt' | 'voice' | 'recurring';
  hasReceipt?: boolean;
  hasNote?: boolean;
};

export type ReviewReason =
  | 'low_confidence_ocr'
  | 'low_confidence_voice'
  | 'possible_duplicate'
  | 'missing_category'
  | 'missing_fx'
  | 'stale_pending'
  | 'unmatched_recurring'
  | 'sync_conflict'
  | 'reconciliation_stale';

export type ReviewItem = {
  id: string;
  reason: ReviewReason;
  severity: 'info' | 'attention';
  evidenceVersion: number;
  sourceType: 'transaction' | 'reconciliation';
  state: 'open' | 'resolved';
};

export type ReconciliationEntry = {
  lifecycle: 'draft' | 'posted' | 'void';
  clearing: 'pending' | 'cleared' | 'reconciled';
  occurredAt: string;
  signedMinor: string;
};

export type ReconciliationInput = {
  openingMinor: string;
  statementClosingMinor: string;
  cutoffAt: string;
  entries: ReconciliationEntry[];
};

export type ReconciliationResult = {
  kind: 'balanced' | 'in_progress' | 'stale';
  status: 'balanced' | 'in_progress' | 'stale';
  calculatedClosingMinor: string;
  differenceMinor: string;
  eligibleCount: number;
  excludedPending: number;
  excludedDraft: number;
  excludedVoid: number;
};

const SEARCH_RECORDS: SearchRecord[] = [
  {
    id: 'transaction-fixture-1',
    entityType: 'transaction',
    label: 'Kedai Crème',
    searchableText: 'Kedai Crème kopi sore catatan receipt',
    occurredAt: '2026-08-28T10:00:00.000Z',
    amountMinor: '45000',
    currency: 'IDR',
    entryType: 'expense',
    lifecycle: 'posted',
    clearing: 'cleared',
    accountId: 'account-cash-fixture',
    categoryId: 'category-food',
    tagIds: ['tag-cafe'],
    source: 'receipt',
    hasReceipt: true,
    hasNote: true,
  },
  {
    id: 'transaction-fixture-2',
    entityType: 'transaction',
    label: 'Kedai kopi lain',
    searchableText: 'Kedai kopi lain',
    occurredAt: '2026-08-20T10:00:00.000Z',
    amountMinor: '35000',
    currency: 'IDR',
    entryType: 'expense',
    lifecycle: 'posted',
    clearing: 'pending',
    accountId: 'account-cash-fixture',
    categoryId: 'category-food',
    tagIds: ['tag-cafe'],
    source: 'manual',
    hasReceipt: false,
    hasNote: false,
  },
  {
    id: 'account-fixture-1',
    entityType: 'account',
    label: 'Kas fixture',
    searchableText: 'Kas fixture account',
    occurredAt: '2026-08-01T00:00:00.000Z',
    currency: 'IDR',
  },
  {
    id: 'category-fixture-1',
    entityType: 'category',
    label: 'Makanan',
    searchableText: 'Makanan expense category',
    occurredAt: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'tag-fixture-1',
    entityType: 'tag',
    label: 'Kafe',
    searchableText: 'Kafe tag',
    occurredAt: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'recurring-fixture-1',
    entityType: 'recurring',
    label: 'Langganan fixture',
    searchableText: 'Langganan fixture recurring',
    occurredAt: '2026-08-01T00:00:00.000Z',
    source: 'recurring',
  },
  {
    id: 'goal-fixture-1',
    entityType: 'goal',
    label: 'Dana darurat fixture',
    searchableText: 'Dana darurat fixture goal',
    occurredAt: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'debt-fixture-1',
    entityType: 'debt',
    label: 'Kartu fixture',
    searchableText: 'Kartu fixture debt',
    occurredAt: '2026-08-01T00:00:00.000Z',
    currency: 'IDR',
  },
  {
    id: 'attachment-fixture-1',
    entityType: 'attachment',
    label: 'Struk fixture',
    searchableText: 'Struk fixture attachment receipt',
    occurredAt: '2026-08-01T00:00:00.000Z',
    source: 'receipt',
  },
];

const REVIEW_ITEMS: ReviewItem[] = [
  {
    id: 'review-ocr',
    reason: 'low_confidence_ocr',
    severity: 'attention',
    evidenceVersion: 1,
    sourceType: 'transaction',
    state: 'open',
  },
  {
    id: 'review-voice',
    reason: 'low_confidence_voice',
    severity: 'attention',
    evidenceVersion: 1,
    sourceType: 'transaction',
    state: 'open',
  },
  {
    id: 'review-duplicate',
    reason: 'possible_duplicate',
    severity: 'attention',
    evidenceVersion: 2,
    sourceType: 'transaction',
    state: 'open',
  },
  {
    id: 'review-category',
    reason: 'missing_category',
    severity: 'attention',
    evidenceVersion: 1,
    sourceType: 'transaction',
    state: 'open',
  },
  {
    id: 'review-fx',
    reason: 'missing_fx',
    severity: 'info',
    evidenceVersion: 1,
    sourceType: 'transaction',
    state: 'open',
  },
  {
    id: 'review-pending',
    reason: 'stale_pending',
    severity: 'attention',
    evidenceVersion: 1,
    sourceType: 'transaction',
    state: 'open',
  },
  {
    id: 'review-recurring',
    reason: 'unmatched_recurring',
    severity: 'info',
    evidenceVersion: 1,
    sourceType: 'transaction',
    state: 'open',
  },
  {
    id: 'review-conflict',
    reason: 'sync_conflict',
    severity: 'attention',
    evidenceVersion: 3,
    sourceType: 'transaction',
    state: 'open',
  },
  {
    id: 'review-reconciliation',
    reason: 'reconciliation_stale',
    severity: 'attention',
    evidenceVersion: 1,
    sourceType: 'reconciliation',
    state: 'open',
  },
];

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .trim()
    .replace(/[\s\p{P}]+/gu, ' ');
}

export function validateSearchQuery(
  query: string,
): { ok: true; normalized: string } | { ok: false; kind: 'invalid_query' } {
  const normalized = normalizeSearchText(query);
  const tokens = normalized.split(' ').filter(Boolean);
  return normalized.length >= 2 && normalized.length <= 100 && tokens.length <= 10
    ? { ok: true, normalized }
    : { ok: false, kind: 'invalid_query' };
}

function matchesFilters(record: SearchRecord, filters: SearchFilters): boolean {
  if (filters.entityTypes && !filters.entityTypes.includes(record.entityType)) return false;
  if (filters.entryType && record.entryType !== filters.entryType) return false;
  if (filters.lifecycle && record.lifecycle !== filters.lifecycle) return false;
  if (filters.clearing && record.clearing !== filters.clearing) return false;
  if (filters.currency && record.currency !== filters.currency) return false;
  if (filters.accountId && record.accountId !== filters.accountId) return false;
  if (filters.categoryId && record.categoryId !== filters.categoryId) return false;
  if (filters.tagId && !record.tagIds?.includes(filters.tagId)) return false;
  if (filters.source && record.source !== filters.source) return false;
  if (filters.hasReceipt !== undefined && record.hasReceipt !== filters.hasReceipt) return false;
  if (filters.hasNote !== undefined && record.hasNote !== filters.hasNote) return false;
  if (filters.dateFrom && record.occurredAt < filters.dateFrom) return false;
  if (filters.dateTo && record.occurredAt >= filters.dateTo) return false;
  if (filters.minAmountMinor && BigInt(record.amountMinor ?? '0') < BigInt(filters.minAmountMinor))
    return false;
  if (filters.maxAmountMinor && BigInt(record.amountMinor ?? '0') > BigInt(filters.maxAmountMinor))
    return false;
  return true;
}

function rankRecord(record: SearchRecord, normalizedQuery: string): number {
  const normalizedLabel = normalizeSearchText(record.label);
  const normalizedText = normalizeSearchText(record.searchableText);
  const phrase = normalizedText.includes(normalizedQuery) ? 20 : 0;
  const exact = normalizedLabel === normalizedQuery ? 40 : 0;
  const prefix = normalizedLabel.startsWith(normalizedQuery) ? 10 : 0;
  const weight =
    record.entityType === 'transaction'
      ? 5
      : record.entityType === 'category' || record.entityType === 'tag'
        ? 3
        : 1;
  return exact + phrase + prefix + weight;
}

export function calculateReconciliation(input: ReconciliationInput): ReconciliationResult {
  const cutoff = new Date(input.cutoffAt).getTime();
  const eligible = input.entries.filter(
    (entry) =>
      entry.lifecycle === 'posted' &&
      (entry.clearing === 'cleared' || entry.clearing === 'reconciled') &&
      new Date(entry.occurredAt).getTime() <= cutoff,
  );
  const calculated = eligible.reduce(
    (total, entry) => total + BigInt(entry.signedMinor),
    BigInt(input.openingMinor),
  );
  const difference = BigInt(input.statementClosingMinor) - calculated;
  const status = difference === 0n ? 'balanced' : 'in_progress';
  return {
    kind: status,
    status,
    calculatedClosingMinor: calculated.toString(),
    differenceMinor: difference.toString(),
    eligibleCount: eligible.length,
    excludedPending: input.entries.filter((entry) => entry.clearing === 'pending').length,
    excludedDraft: input.entries.filter((entry) => entry.lifecycle === 'draft').length,
    excludedVoid: input.entries.filter((entry) => entry.lifecycle === 'void').length,
  };
}

export function createSearchReviewFixture(scenario: SearchScenario = 'ready') {
  const savedSearches: { name: string; query: string; filters: SearchFilters }[] = [];
  const records =
    scenario === 'empty'
      ? []
      : SEARCH_RECORDS.map((record) => ({
          ...record,
          tagIds: record.tagIds ? [...record.tagIds] : undefined,
        }));
  return {
    scenario,
    search(query: string, filters: SearchFilters = {}, cursor?: string, pageSize = 20) {
      if (scenario === 'corrupt_cursor' && cursor)
        return { kind: 'invalid_cursor' as const, results: [] as SearchRecord[] };
      if (cursor && !/^page-\d+$/u.test(cursor))
        return { kind: 'invalid_cursor' as const, results: [] as SearchRecord[] };
      const validation = validateSearchQuery(query);
      if (!validation.ok) return { kind: 'invalid_query' as const, results: [] as SearchRecord[] };
      if (scenario === 'no_result')
        return {
          kind: 'no_result' as const,
          results: [] as SearchRecord[],
          indexing: false,
          coverage: 'complete' as const,
        };
      const matching = records
        .filter((record) => matchesFilters(record, filters))
        .filter(
          (record) =>
            normalizeSearchText(record.searchableText).includes(validation.normalized) ||
            normalizeSearchText(record.label)
              .split(' ')
              .some((token) => token.startsWith(validation.normalized)),
        )
        .sort(
          (a, b) =>
            rankRecord(b, validation.normalized) - rankRecord(a, validation.normalized) ||
            b.occurredAt.localeCompare(a.occurredAt) ||
            b.id.localeCompare(a.id),
        );
      const start = cursor ? Number(cursor.slice(5)) * pageSize : 0;
      const results = matching.slice(start, start + pageSize);
      return {
        kind:
          scenario === 'partial'
            ? ('partial_coverage' as const)
            : results.length
              ? ('ready' as const)
              : ('no_result' as const),
        results,
        indexing: scenario === 'indexing',
        coverage: scenario === 'partial' ? ('partial' as const) : ('complete' as const),
        nextCursor:
          start + pageSize < matching.length
            ? `page-${Number(cursor?.slice(5) ?? '0') + 1}`
            : undefined,
      };
    },
    savedSearches: () => savedSearches.map((item) => ({ ...item, filters: { ...item.filters } })),
    saveSearch(value: { name: string; query: string; filters: SearchFilters }) {
      if (!value.name.trim() || value.name.trim().length > 60) return { kind: 'invalid' as const };
      savedSearches.push({
        ...value,
        name: value.name.trim(),
        query: normalizeSearchText(value.query),
      });
      return { kind: 'saved_fixture' as const };
    },
    reviewItems: () => REVIEW_ITEMS.map((item) => ({ ...item })),
    resolveReview(id: string, action: 'confirm' | 'dismiss' | 'merge' | 'edit') {
      if (scenario === 'unauthorized') return { kind: 'unauthorized' as const };
      if (scenario === 'source_changed') return { kind: 'needs_refresh' as const };
      if (scenario === 'offline') return { kind: 'queued' as const };
      if (id === 'review-duplicate' && action === 'merge')
        return { kind: 'review_required' as const };
      return { kind: 'resolved' as const, id, action, undoAvailable: true };
    },
    bulkResolvePreview(ids: string[]) {
      if (scenario === 'pending_race') return { kind: 'blocked_race' as const };
      return {
        kind: 'preview' as const,
        ids: [...ids],
        allOrNothing: true,
        undoWindow: 'fixture-session',
      };
    },
    undoBulk: (_id: string) => ({ kind: 'undone' as const }),
    reconciliation(input: ReconciliationInput) {
      if (scenario === 'reconciliation_stale')
        return {
          ...calculateReconciliation(input),
          kind: 'stale' as const,
          status: 'stale' as const,
        };
      return calculateReconciliation(input);
    },
    adjustmentPreview(differenceMinor: string) {
      return {
        entryType: 'balance_adjustment' as const,
        signedMinor: differenceMinor,
        cashflowExcluded: true,
        requiresConfirmation: true,
      };
    },
    finalizeReconciliation: () =>
      scenario === 'offline'
        ? { kind: 'offline_disabled' as const }
        : { kind: 'finalized' as const },
    retry: () =>
      scenario === 'corrupt_cursor'
        ? { kind: 'restarted' as const }
        : { kind: 'refreshed' as const },
    drillDown: () => ({ route: '/transactions' as const, safe: true }),
  };
}
