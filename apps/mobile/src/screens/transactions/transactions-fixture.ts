export const TRANSACTION_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  contentMaxWidth: 720,
} as const;

export const MAX_AMOUNT_MINOR = '9000000000000000';
const MAX_AMOUNT_MINOR_BIGINT = 9000000000000000n;
const FIXTURE_NOW = '2026-08-26T12:00:00.000Z';
const RESTORE_RETENTION_DAYS = 30;

export const SUPPORTED_ENTRY_TYPES = ['expense', 'income'] as const;
export type TransactionEntryType = (typeof SUPPORTED_ENTRY_TYPES)[number];
export type SupportedCurrency = 'IDR' | 'USD' | 'JPY';
export type TransactionLifecycleStatus = 'draft' | 'posted' | 'sync_pending' | 'failed' | 'voided';
export type TransactionState =
  | 'idle'
  | 'editing'
  | 'validating'
  | 'review'
  | 'saving_local'
  | 'sync_pending'
  | 'synced'
  | 'conflict'
  | 'failed'
  | 'empty'
  | 'offline'
  | 'session_expired'
  | 'duplicate_warning'
  | 'void_tombstone'
  | 'restore_unavailable';

export interface TransactionAccountFixture {
  id: string;
  name: string;
  currency: SupportedCurrency;
  archived: boolean;
}

export interface TransactionCategoryFixture {
  id: string;
  name: string;
  kind: TransactionEntryType;
  archived: boolean;
}

export interface TransactionTagFixture {
  id: string;
  name: string;
  archived: boolean;
}

export interface TransactionDependencies {
  accounts: readonly TransactionAccountFixture[];
  categories: readonly TransactionCategoryFixture[];
  tags: readonly TransactionTagFixture[];
}

export interface TransactionDraft {
  id: string;
  entryType: TransactionEntryType;
  amountMinor: string;
  currency: SupportedCurrency;
  accountId: string;
  categoryId: string;
  occurredAt: string;
  timezoneAtEntry: string;
  merchant?: string;
  note?: string;
  tagIds: string[];
  expectedVersion: number;
  clientMutationId: string;
}

export interface AccountLine {
  lineType: 'account';
  accountId: string;
  amountMinor: string;
  signedAmountMinor: string;
}

export interface CategoryLine {
  lineType: 'category';
  categoryId: string;
  amountMinor: string;
}

export interface SignedLedgerLines {
  accountLine: AccountLine;
  categoryLine: CategoryLine;
  affectsBalance: boolean;
}

export interface TransactionRecord extends TransactionDraft {
  status: TransactionLifecycleStatus;
  version: number;
  accountLine: AccountLine;
  categoryLine: CategoryLine;
  tombstone?: boolean;
  voidedAt?: string;
}

export interface ClassificationSuggestion {
  categoryId: string;
  tagIds: string[];
  explanation: string;
}

export type TransactionsLoadOutcome = 'ready' | 'empty' | 'offline' | 'error';
export type TransactionsSaveOutcome = 'synced' | 'offline' | 'failed' | 'session_expired';
export type TransactionsRestoreOutcome = 'available' | 'expired' | 'unavailable';

export interface TransactionsScenarioOptions {
  initialTransactions?: readonly TransactionRecord[];
  load?: TransactionsLoadOutcome;
  save?: TransactionsSaveOutcome;
  restore?: TransactionsRestoreOutcome;
  update?: 'synced' | 'conflict';
}

export type TransactionsScenario =
  | 'ready'
  | 'empty'
  | 'offline'
  | 'sync_pending'
  | 'error'
  | 'duplicate'
  | 'voided'
  | 'session_expired'
  | 'conflict'
  | 'restore_expired'
  | TransactionsScenarioOptions;

export type ValidationResult<T> =
  { ok: true; value: T; message?: undefined } | { ok: false; value?: undefined; message: string };

export type DuplicateResult =
  { warning: false } | { warning: true; duplicateId: string; message: string };

export type SaveResult =
  | { kind: 'synced'; transaction: TransactionRecord; mutationId: string }
  | { kind: 'sync_pending'; transaction: TransactionRecord; mutationId: string }
  | { kind: 'failed'; mutationId: string; message: string }
  | { kind: 'session_expired'; mutationId: string; message: string }
  | { kind: 'duplicate_warning'; matches: string[]; mutationId: string }
  | { kind: 'validation_error'; message: string };

export type RetryResult =
  | { kind: 'synced'; transaction: TransactionRecord; mutationId: string }
  | { kind: 'failed'; mutationId: string; message: string }
  | { kind: 'not_found'; mutationId: string };

export type UpdateResult =
  | { kind: 'synced'; transaction: TransactionRecord }
  | { kind: 'conflict'; device: TransactionRecord; server: TransactionRecord }
  | { kind: 'not_found' }
  | { kind: 'validation_error'; message: string };

export type VoidResult =
  | { kind: 'voided'; transaction: TransactionRecord; version: number }
  | { kind: 'conflict'; transaction: TransactionRecord }
  | { kind: 'not_found' };

export type RestoreResult =
  | { kind: 'restored'; transaction: TransactionRecord; version: number }
  | { kind: 'restore_unavailable'; reason: 'expired' | 'unavailable' }
  | { kind: 'conflict'; transaction: TransactionRecord }
  | { kind: 'not_found' };

export type TransactionsLoadResult =
  | { kind: 'ready'; transactions: TransactionRecord[] }
  | { kind: 'empty'; transactions: [] }
  | { kind: 'offline'; transactions: TransactionRecord[] }
  | { kind: 'error'; transactions: TransactionRecord[] };

export const DEFAULT_TRANSACTION_DEPENDENCIES: TransactionDependencies = {
  accounts: [
    { id: 'account-cash-fixture', name: 'Kas fixture', currency: 'IDR', archived: false },
    { id: 'account-bank-fixture', name: 'Bank fixture', currency: 'IDR', archived: false },
    { id: 'account-archived-fixture', name: 'Akun arsip fixture', currency: 'IDR', archived: true },
  ],
  categories: [
    { id: 'category-food', name: 'Makanan', kind: 'expense', archived: false },
    { id: 'category-food-child', name: 'Kopi', kind: 'expense', archived: false },
    { id: 'category-salary', name: 'Gaji', kind: 'income', archived: false },
    {
      id: 'category-archived-fixture',
      name: 'Kategori arsip fixture',
      kind: 'expense',
      archived: true,
    },
  ],
  tags: [
    { id: 'tag-cafe', name: 'Kafe', archived: false },
    { id: 'tag-grocery', name: 'Belanja', archived: false },
    { id: 'tag-archived-fixture', name: 'Tag arsip fixture', archived: true },
  ],
};

function cloneRecord(record: TransactionRecord): TransactionRecord {
  return {
    ...record,
    tagIds: [...record.tagIds],
    accountLine: { ...record.accountLine },
    categoryLine: { ...record.categoryLine },
  };
}

function normalizeLabel(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US');
}

function recordFromDraft(
  draft: TransactionDraft,
  status: TransactionLifecycleStatus,
  version = 1,
): TransactionRecord {
  const lines = buildSignedLedgerLines(draft, status !== 'draft');
  return {
    ...draft,
    status,
    version,
    accountLine: lines.accountLine,
    categoryLine: lines.categoryLine,
  };
}

export const DEFAULT_TRANSACTION_FIXTURES: TransactionRecord[] = [
  recordFromDraft(
    {
      id: 'transaction-fixture-1',
      entryType: 'expense',
      amountMinor: '125000',
      currency: 'IDR',
      accountId: 'account-cash-fixture',
      categoryId: 'category-food',
      occurredAt: '2026-08-26T09:00:00.000Z',
      timezoneAtEntry: 'Asia/Jakarta',
      merchant: 'Kedai Fixture',
      note: 'Makan siang fixture',
      tagIds: ['tag-cafe'],
      expectedVersion: 1,
      clientMutationId: 'mutation-existing-fixture',
    },
    'posted',
  ),
];

export function parseTransactionAmountMinor(input: string): bigint | null {
  const normalized = input.trim();
  if (!/^[1-9]\d*$/u.test(normalized)) return null;
  try {
    const amount = BigInt(normalized);
    return amount <= MAX_AMOUNT_MINOR_BIGINT ? amount : null;
  } catch {
    return null;
  }
}

export function buildSignedLedgerLines(
  draft: TransactionDraft,
  affectsBalance = true,
): SignedLedgerLines {
  const amount = BigInt(draft.amountMinor);
  const signedAmount = draft.entryType === 'expense' ? -amount : amount;
  return {
    accountLine: {
      lineType: 'account',
      accountId: draft.accountId,
      amountMinor: draft.amountMinor,
      signedAmountMinor: signedAmount.toString(),
    },
    categoryLine: {
      lineType: 'category',
      categoryId: draft.categoryId,
      amountMinor: draft.amountMinor,
    },
    affectsBalance,
  };
}

export function validateTransactionDraft(
  draft: TransactionDraft,
  dependencies: TransactionDependencies = DEFAULT_TRANSACTION_DEPENDENCIES,
): ValidationResult<TransactionDraft> {
  const amount = parseTransactionAmountMinor(draft.amountMinor);
  if (!amount) return { ok: false, message: 'Nominal harus berupa minor unit integer positif.' };
  if (!SUPPORTED_ENTRY_TYPES.includes(draft.entryType)) {
    return { ok: false, message: 'Jenis transaksi hanya pengeluaran atau pemasukan.' };
  }
  const account = dependencies.accounts.find((item) => item.id === draft.accountId);
  if (!account || account.archived) return { ok: false, message: 'Akun aktif tidak tersedia.' };
  if (account.currency !== draft.currency)
    return { ok: false, message: 'Mata uang harus mengikuti akun.' };
  const category = dependencies.categories.find((item) => item.id === draft.categoryId);
  if (!category || category.archived || category.kind !== draft.entryType) {
    return { ok: false, message: 'Kategori aktif tidak sesuai jenis transaksi.' };
  }
  const uniqueTags = [...new Set(draft.tagIds)];
  if (
    uniqueTags.length > 10 ||
    uniqueTags.some((id) => {
      const tag = dependencies.tags.find((item) => item.id === id);
      return !tag || tag.archived;
    })
  ) {
    return { ok: false, message: 'Tag aktif maksimal sepuluh dan tidak boleh arsip.' };
  }
  const occurredAt = new Date(draft.occurredAt);
  const now = new Date(FIXTURE_NOW);
  const oldest = new Date(now);
  oldest.setUTCFullYear(oldest.getUTCFullYear() - 50);
  const latest = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (Number.isNaN(occurredAt.getTime()) || occurredAt < oldest || occurredAt > latest) {
    return { ok: false, message: 'Waktu transaksi berada di luar batas fixture.' };
  }
  const merchant = draft.merchant?.normalize('NFKC').trim();
  const note = draft.note?.normalize('NFKC').trim();
  if (merchant && merchant.length > 120)
    return { ok: false, message: 'Merchant maksimal 120 karakter.' };
  if (note && note.length > 1000) return { ok: false, message: 'Catatan maksimal 1000 karakter.' };
  return {
    ok: true,
    value: {
      ...draft,
      amountMinor: amount.toString(),
      merchant: merchant || undefined,
      note: note || undefined,
      tagIds: uniqueTags,
    },
  };
}

export function detectDuplicate(
  existing: readonly Pick<
    TransactionDraft,
    'id' | 'accountId' | 'entryType' | 'amountMinor' | 'currency' | 'occurredAt' | 'merchant'
  >[],
  draft: Pick<
    TransactionDraft,
    'id' | 'accountId' | 'entryType' | 'amountMinor' | 'currency' | 'occurredAt' | 'merchant'
  >,
): DuplicateResult {
  const candidate = existing.find((item) => {
    if (item.id === draft.id) return false;
    if (
      item.accountId !== draft.accountId ||
      item.entryType !== draft.entryType ||
      item.amountMinor !== draft.amountMinor ||
      item.currency !== draft.currency
    ) {
      return false;
    }
    const difference = Math.abs(
      new Date(item.occurredAt).getTime() - new Date(draft.occurredAt).getTime(),
    );
    if (difference > 10 * 60 * 1000) return false;
    const leftMerchant = normalizeLabel(item.merchant ?? '');
    const rightMerchant = normalizeLabel(draft.merchant ?? '');
    return !leftMerchant || !rightMerchant || leftMerchant === rightMerchant;
  });
  return candidate
    ? {
        warning: true,
        duplicateId: candidate.id,
        message: 'Potensi duplikat dalam rentang waktu sepuluh menit.',
      }
    : { warning: false };
}

export function getNewTransactionDependencies(): TransactionDependencies {
  return {
    accounts: DEFAULT_TRANSACTION_DEPENDENCIES.accounts.filter((item) => !item.archived),
    categories: DEFAULT_TRANSACTION_DEPENDENCIES.categories.filter((item) => !item.archived),
    tags: DEFAULT_TRANSACTION_DEPENDENCIES.tags.filter((item) => !item.archived),
  };
}

export function getHistoricalDependencies(): TransactionDependencies {
  return {
    accounts: [...DEFAULT_TRANSACTION_DEPENDENCIES.accounts],
    categories: [...DEFAULT_TRANSACTION_DEPENDENCIES.categories],
    tags: [...DEFAULT_TRANSACTION_DEPENDENCIES.tags],
  };
}

export interface TransactionsFixture {
  initialResult(): TransactionsLoadResult;
  presentation(): { sessionExpired: boolean; conflict: boolean };
  load(): Promise<TransactionsLoadResult>;
  useLocalFixture(): Promise<TransactionsLoadResult>;
  snapshot(): TransactionRecord[];
  balanceMinor(): string;
  suggestions(draft: TransactionDraft): ClassificationSuggestion[];
  applySuggestion(
    draft: TransactionDraft,
    suggestion: ClassificationSuggestion,
    decision: 'apply' | 'reject' | 'override',
    overrideCategoryId?: string,
  ): TransactionDraft;
  save(draft: TransactionDraft, options?: { confirmDuplicate?: boolean }): Promise<SaveResult>;
  retry(mutationId: string): Promise<RetryResult>;
  update(
    id: string,
    patch: Partial<Pick<TransactionDraft, 'note' | 'merchant' | 'categoryId' | 'tagIds'>>,
    expectedVersion: number,
    mutationId: string,
  ): Promise<UpdateResult>;
  duplicateAsDraft(id: string): Promise<TransactionRecord | undefined>;
  void(id: string, expectedVersion: number, mutationId: string): Promise<VoidResult>;
  restore(id: string, expectedVersion: number, mutationId: string): Promise<RestoreResult>;
  get(id: string): TransactionRecord | undefined;
  preserveDraft(): { kind: 'draft_preserved'; message: string };
}

function scenarioOptions(scenario?: TransactionsScenario): {
  options: TransactionsScenarioOptions;
  mode: TransactionsLoadOutcome;
} {
  if (!scenario || scenario === 'ready') return { options: {}, mode: 'ready' };
  if (typeof scenario === 'object') return { options: scenario, mode: scenario.load ?? 'ready' };
  switch (scenario) {
    case 'empty':
      return { options: { initialTransactions: [], load: 'empty' }, mode: 'empty' };
    case 'offline':
      return { options: { load: 'offline' }, mode: 'offline' };
    case 'error':
      return { options: { load: 'error' }, mode: 'error' };
    case 'sync_pending':
      return {
        options: {
          save: 'offline',
          initialTransactions: DEFAULT_TRANSACTION_FIXTURES.map((item) => ({
            ...cloneRecord(item),
            status: 'sync_pending',
          })),
        },
        mode: 'ready',
      };
    case 'duplicate':
      return {
        options: {
          initialTransactions: DEFAULT_TRANSACTION_FIXTURES.map((item) => ({
            ...cloneRecord(item),
            occurredAt: '2026-08-26T10:00:00.000Z',
          })),
        },
        mode: 'ready',
      };
    case 'voided':
      return {
        options: {
          initialTransactions: DEFAULT_TRANSACTION_FIXTURES.map((item) => ({
            ...cloneRecord(item),
            status: 'voided',
            tombstone: true,
            voidedAt: FIXTURE_NOW,
          })),
        },
        mode: 'ready',
      };
    case 'session_expired':
      return { options: { save: 'session_expired' }, mode: 'ready' };
    case 'conflict':
      return { options: { update: 'conflict' }, mode: 'ready' };
    case 'restore_expired':
      return { options: { restore: 'expired' }, mode: 'ready' };
    default:
      return { options: {}, mode: 'ready' };
  }
}

export function createTransactionsFixture(scenario?: TransactionsScenario): TransactionsFixture {
  const resolved = scenarioOptions(scenario);
  let transactions = (resolved.options.initialTransactions ?? DEFAULT_TRANSACTION_FIXTURES).map(
    cloneRecord,
  );
  let firstLoad = true;
  const saveOutcome = resolved.options.save ?? 'synced';
  let sequence = 1;
  const sessionExpired = saveOutcome === 'session_expired';
  const conflict = resolved.options.update === 'conflict';

  const initialResult = (): TransactionsLoadResult => {
    if (resolved.mode === 'empty') return { kind: 'empty', transactions: [] };
    if (resolved.mode === 'offline')
      return { kind: 'offline', transactions: transactions.map(cloneRecord) };
    if (resolved.mode === 'error') {
      firstLoad = false;
      return { kind: 'error', transactions: transactions.map(cloneRecord) };
    }
    return { kind: 'ready', transactions: transactions.map(cloneRecord) };
  };

  const load = async (): Promise<TransactionsLoadResult> => {
    if (resolved.mode === 'error' && firstLoad) {
      firstLoad = false;
      return { kind: 'error', transactions: transactions.map(cloneRecord) };
    }
    if (resolved.mode === 'empty') return { kind: 'empty', transactions: [] };
    if (resolved.mode === 'offline')
      return { kind: 'offline', transactions: transactions.map(cloneRecord) };
    return { kind: 'ready', transactions: transactions.map(cloneRecord) };
  };

  const balanceMinor = (): string => {
    const total = transactions.reduce((sum, item) => {
      if (item.status === 'draft' || item.status === 'voided' || item.status === 'failed')
        return sum;
      return sum + BigInt(item.accountLine.signedAmountMinor);
    }, 0n);
    return total.toString();
  };

  const save = async (
    draft: TransactionDraft,
    options?: { confirmDuplicate?: boolean },
  ): Promise<SaveResult> => {
    const validated = validateTransactionDraft(draft);
    if (!validated.ok) return { kind: 'validation_error', message: validated.message };
    const mutationId = validated.value.clientMutationId;
    const duplicate = detectDuplicate(transactions, validated.value);
    if (duplicate.warning && !options?.confirmDuplicate) {
      return { kind: 'duplicate_warning', matches: [duplicate.duplicateId], mutationId };
    }
    const existingMutation = transactions.find((item) => item.clientMutationId === mutationId);
    if (existingMutation) {
      return existingMutation.status === 'sync_pending'
        ? { kind: 'sync_pending', transaction: cloneRecord(existingMutation), mutationId }
        : { kind: 'synced', transaction: cloneRecord(existingMutation), mutationId };
    }
    if (saveOutcome === 'session_expired') {
      return {
        kind: 'session_expired',
        mutationId,
        message: 'Sesi fixture kedaluwarsa; draft tetap aman di layar.',
      };
    }
    const status: TransactionLifecycleStatus =
      saveOutcome === 'offline' ? 'sync_pending' : saveOutcome === 'failed' ? 'failed' : 'posted';
    const transaction = recordFromDraft(validated.value, status);
    transactions = [...transactions, transaction];
    if (saveOutcome === 'failed')
      return { kind: 'failed', mutationId, message: 'Fixture gagal menyimpan lokal.' };
    if (status === 'sync_pending')
      return { kind: 'sync_pending', transaction: cloneRecord(transaction), mutationId };
    return { kind: 'synced', transaction: cloneRecord(transaction), mutationId };
  };

  const retry = async (mutationId: string): Promise<RetryResult> => {
    const item = transactions.find((transaction) => transaction.clientMutationId === mutationId);
    if (!item) return { kind: 'not_found', mutationId };
    if (item.status === 'sync_pending' || item.status === 'failed') {
      item.status = 'posted';
      item.version += 1;
      return { kind: 'synced', transaction: cloneRecord(item), mutationId };
    }
    return { kind: 'synced', transaction: cloneRecord(item), mutationId };
  };

  return {
    initialResult,
    presentation() {
      return { sessionExpired, conflict };
    },
    async load() {
      return load();
    },
    async useLocalFixture() {
      firstLoad = false;
      return { kind: 'ready', transactions: transactions.map(cloneRecord) };
    },
    snapshot() {
      return transactions.map(cloneRecord);
    },
    balanceMinor,
    suggestions(draft) {
      if (draft.entryType !== 'expense') return [];
      return [
        {
          categoryId: 'category-food',
          tagIds: ['tag-cafe'],
          explanation: 'Saran fixture berdasarkan merchant; belum tersimpan sampai konfirmasi.',
        },
      ];
    },
    applySuggestion(draft, suggestion, decision, overrideCategoryId) {
      if (decision === 'reject') return { ...draft, tagIds: [...draft.tagIds] };
      return {
        ...draft,
        categoryId:
          decision === 'override'
            ? (overrideCategoryId ?? draft.categoryId)
            : suggestion.categoryId,
        tagIds:
          decision === 'apply'
            ? [...new Set([...draft.tagIds, ...suggestion.tagIds])]
            : [...draft.tagIds],
      };
    },
    save,
    retry,
    async update(id, patch, expectedVersion, mutationId) {
      const current = transactions.find((item) => item.id === id);
      if (!current) return { kind: 'not_found' };
      if (current.version !== expectedVersion || resolved.options.update === 'conflict') {
        return {
          kind: 'conflict',
          device: cloneRecord({ ...current, ...patch }),
          server: cloneRecord(current),
        };
      }
      const next = {
        ...current,
        ...patch,
        clientMutationId: mutationId,
        version: current.version + 1,
      };
      const checked = validateTransactionDraft(next);
      if (!checked.ok) return { kind: 'validation_error', message: checked.message };
      const updated = recordFromDraft(checked.value, current.status, next.version);
      transactions = transactions.map((item) => (item.id === id ? updated : item));
      return { kind: 'synced', transaction: cloneRecord(updated) };
    },
    async duplicateAsDraft(id) {
      const current = transactions.find((item) => item.id === id);
      if (!current) return undefined;
      const idSuffix = sequence++;
      const draft = recordFromDraft(
        {
          ...current,
          id: `draft-duplicate-${idSuffix}`,
          tagIds: [...current.tagIds],
          expectedVersion: 1,
          clientMutationId: `mutation-duplicate-${idSuffix}`,
        },
        'draft',
      );
      return draft;
    },
    async void(id, expectedVersion) {
      const current = transactions.find((item) => item.id === id);
      if (!current) return { kind: 'not_found' };
      if (current.version !== expectedVersion)
        return { kind: 'conflict', transaction: cloneRecord(current) };
      current.status = 'voided';
      current.tombstone = true;
      current.voidedAt = FIXTURE_NOW;
      current.version += 1;
      return { kind: 'voided', transaction: cloneRecord(current), version: current.version };
    },
    async restore(id, expectedVersion) {
      const current = transactions.find((item) => item.id === id);
      if (!current) return { kind: 'not_found' };
      const restoreOutcome = resolved.options.restore ?? 'available';
      if (restoreOutcome !== 'available')
        return {
          kind: 'restore_unavailable',
          reason: restoreOutcome === 'expired' ? 'expired' : 'unavailable',
        };
      if (
        current.voidedAt &&
        new Date(FIXTURE_NOW).getTime() - new Date(current.voidedAt).getTime() >
          RESTORE_RETENTION_DAYS * 24 * 60 * 60 * 1000
      ) {
        return { kind: 'restore_unavailable', reason: 'expired' };
      }
      if (current.version !== expectedVersion)
        return { kind: 'conflict', transaction: cloneRecord(current) };
      current.status = 'posted';
      current.tombstone = false;
      current.version += 1;
      return { kind: 'restored', transaction: cloneRecord(current), version: current.version };
    },
    get(id) {
      const item = transactions.find((transaction) => transaction.id === id);
      return item ? cloneRecord(item) : undefined;
    },
    preserveDraft() {
      return {
        kind: 'draft_preserved',
        message: 'Draft dipertahankan untuk dipulihkan setelah login.',
      };
    },
  };
}
