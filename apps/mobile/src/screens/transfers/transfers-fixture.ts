export const TRANSFER_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  contentMaxWidth: 720,
} as const;

export const MAX_OPERATION_AMOUNT_MINOR = '9000000000000000';
const MAX_OPERATION_AMOUNT = 9000000000000000n;

export const ADJUSTMENT_REASONS = [
  'cash_count',
  'bank_reconciliation',
  'opening_correction',
  'other',
] as const;

export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];
export type OperationScenario =
  | 'ready'
  | 'loading'
  | 'empty'
  | 'offline'
  | 'error'
  | 'archived_dependency'
  | 'permission_denied'
  | 'read_only'
  | 'conflict'
  | 'rollback'
  | 'locked_period'
  | 'sync_pending'
  | 'failed';
export type OperationState =
  | 'idle'
  | 'editing'
  | 'reviewing'
  | 'committing_local'
  | 'sync_pending'
  | 'synced'
  | 'failed'
  | 'needs_re_review'
  | 'locked_period'
  | 'reversed'
  | 'loading'
  | 'empty'
  | 'offline'
  | 'archived_dependency'
  | 'permission_denied'
  | 'aggregate_rollback';

export interface OperationAccount {
  id: string;
  name: string;
  currency: 'IDR' | 'USD';
  liability: boolean;
  archived: boolean;
  accessible: boolean;
  version: number;
}

export interface OperationCategory {
  id: string;
  name: string;
  archived: boolean;
}

export interface TransferFeeDraft {
  amountMinor: string;
  payerAccountId: string;
  categoryId: string;
}

export interface TransferDraft {
  sourceAccountId: string;
  destinationAccountId: string;
  amountMinor: string;
  currency: 'IDR' | 'USD';
  fee?: TransferFeeDraft;
  expectedVersion: number;
  clientMutationId: string;
}

export interface TransferLine {
  accountId: string;
  currency: string;
  signedAmountMinor: string;
  role: 'source' | 'destination';
}

export interface FeeEntry {
  entryType: 'expense';
  amountMinor: string;
  accountId: string;
  categoryId: string;
  relatedEntryId: string;
}

export interface TransferPreview {
  accountLines: TransferLine[];
  categoryLines: never[];
  feeEntry?: FeeEntry;
  explanation: string;
}

export interface SplitRowDraft {
  categoryId: string;
  amountMinor?: string;
  percentageBps?: number;
  memo?: string;
}

export interface SplitDraft {
  sourceEntryId: string;
  entryType: 'expense' | 'income';
  totalAmountMinor: string;
  currency: 'IDR' | 'USD';
  allocationMode: 'amount' | 'percentage';
  rows: SplitRowDraft[];
  expectedVersion: number;
  clientMutationId: string;
}

export interface AllocatedSplitRow extends SplitRowDraft {
  amountMinor: string;
}

export interface AdjustmentDraft {
  accountId: string;
  targetBalanceMinor: string;
  basisBalanceMinor: string;
  basisVersion: number;
  reason: AdjustmentReason;
  note: string;
  expectedVersion: number;
  clientMutationId: string;
}

export interface HistoryEntry {
  id: string;
  kind: 'transfer' | 'split' | 'adjustment' | 'reversal';
  label: string;
  version: number;
  signedLines: TransferLine[];
  reversed?: boolean;
  locked?: boolean;
}

export type TransferCommitResult =
  | { kind: 'needs_confirmation'; warning: string }
  | { kind: 'sync_pending'; mutationId: string; atomic: true; transfer: TransferPreview }
  | { kind: 'synced'; mutationId: string; atomic: true; transfer: TransferPreview }
  | { kind: 'failed'; mutationId: string; atomic: true; rolledBack: true; message: string }
  | { kind: 'needs_re_review'; message: string };

export type AdjustmentResult =
  | { kind: 'needs_re_review'; message: string }
  | { kind: 'validation_error'; message: string }
  | { kind: 'synced'; deltaMinor: string };

export type ReversalResult =
  | { kind: 'reversed'; originalId: string; reversalId: string }
  | { kind: 'already_reversed' }
  | { kind: 'needs_re_review'; message: string }
  | { kind: 'locked_period'; message: string; replacementAvailable: true };

export interface TransfersLoadResult {
  state: OperationState;
  accounts: OperationAccount[];
  categories: OperationCategory[];
  history: HistoryEntry[];
  message: string;
}

export function parseOperationAmountMinor(input: string): bigint | null {
  const normalized = input.trim();
  if (!/^[1-9]\d*$/u.test(normalized)) return null;
  try {
    const amount = BigInt(normalized);
    return amount <= MAX_OPERATION_AMOUNT ? amount : null;
  } catch {
    return null;
  }
}

function parseNonNegativeMinor(input: string): bigint | null {
  if (!/^\d+$/u.test(input.trim())) return null;
  try {
    const amount = BigInt(input.trim());
    return amount <= MAX_OPERATION_AMOUNT ? amount : null;
  } catch {
    return null;
  }
}

export function validateTransferDraft(draft: TransferDraft): string[] {
  const errors: string[] = [];
  if (draft.sourceAccountId === draft.destinationAccountId)
    errors.push('Akun sumber dan tujuan harus berbeda.');
  if (
    draft.sourceAccountId.includes('archived') ||
    draft.destinationAccountId.includes('archived')
  ) {
    errors.push('Akun harus aktif untuk operasi baru.');
  }
  if (
    draft.sourceAccountId.includes('inaccessible') ||
    draft.destinationAccountId.includes('inaccessible')
  ) {
    errors.push('Akun tidak dapat diakses oleh pengguna ini.');
  }
  if (parseOperationAmountMinor(draft.amountMinor) === null)
    errors.push('Nominal harus berupa minor unit integer positif.');
  if (draft.fee && parseNonNegativeMinor(draft.fee.amountMinor) === null)
    errors.push('Fee harus minor unit nol atau positif.');
  return errors;
}

export function buildTransferLines(draft: TransferDraft): TransferPreview {
  const amount = parseOperationAmountMinor(draft.amountMinor) ?? 0n;
  const feeAmount = draft.fee ? (parseNonNegativeMinor(draft.fee.amountMinor) ?? 0n) : 0n;
  return {
    accountLines: [
      {
        accountId: draft.sourceAccountId,
        currency: draft.currency,
        signedAmountMinor: `-${amount}`,
        role: 'source',
      },
      {
        accountId: draft.destinationAccountId,
        currency: draft.currency,
        signedAmountMinor: `${amount}`,
        role: 'destination',
      },
    ],
    categoryLines: [],
    feeEntry:
      feeAmount > 0n && draft.fee
        ? {
            entryType: 'expense',
            amountMinor: `${feeAmount}`,
            accountId: draft.fee.payerAccountId,
            categoryId: draft.fee.categoryId,
            relatedEntryId: 'transfer-fixture',
          }
        : undefined,
    explanation: draft.destinationAccountId.includes('loan')
      ? 'Tujuan liabilitas ditampilkan sebagai pembayaran; signed lines tetap kanonis.'
      : 'Transfer mata uang sama memindahkan nilai antar akun.',
  };
}

export function validateSplitDraft(draft: SplitDraft): string[] {
  const errors: string[] = [];
  if (draft.entryType !== 'expense' && draft.entryType !== 'income')
    errors.push('Split hanya untuk expense atau income.');
  if (draft.rows.length < 2) errors.push('Split membutuhkan minimal 2 baris.');
  if (draft.rows.length > 20) errors.push('Split maksimal 20 baris.');
  const total = parseOperationAmountMinor(draft.totalAmountMinor);
  if (total === null) errors.push('Total split tidak valid.');
  if (new Set(draft.rows.map((row) => row.categoryId)).size !== draft.rows.length)
    errors.push('Kategori sama akan digabung pada fixture.');
  if (draft.allocationMode === 'amount') {
    const sum = draft.rows.reduce(
      (value, row) => value + (parseNonNegativeMinor(row.amountMinor ?? '') ?? -1n),
      0n,
    );
    if (total !== null && sum !== total)
      errors.push('Jumlah split harus sama persis dengan total.');
    if (draft.rows.some((row) => (parseNonNegativeMinor(row.amountMinor ?? '') ?? 0n) < 1n))
      errors.push('Setiap baris minimal 1 minor unit.');
  } else {
    const percentage = draft.rows.reduce((value, row) => value + (row.percentageBps ?? -1), 0);
    if (percentage !== 10000) errors.push('Persentase split harus tepat 100%.');
    if (
      draft.rows.some((row) => !Number.isInteger(row.percentageBps) || (row.percentageBps ?? 0) < 1)
    )
      errors.push('Persentase setiap baris harus positif.');
    if (
      total !== null &&
      allocateSplitByPercentage(
        draft.totalAmountMinor,
        draft.rows.map((row) => row.percentageBps ?? 0),
      ).some((row) => BigInt(row.amountMinor) < 1n)
    )
      errors.push('Setiap baris minimal 1 minor unit.');
  }
  return errors;
}

export function allocateSplitByPercentage(
  totalMinor: string,
  percentagesBps: number[],
): AllocatedSplitRow[] {
  const total = parseOperationAmountMinor(totalMinor) ?? 0n;
  if (percentagesBps.length === 0) return [];
  const denominator = 10000n;
  const rows = percentagesBps.map((percentageBps, index) => {
    const numerator = total * BigInt(Math.max(0, percentageBps));
    return {
      index,
      quotient: numerator / denominator,
      remainder: numerator % denominator,
      percentageBps,
    };
  });
  let remainder = total - rows.reduce((sum, row) => sum + row.quotient, 0n);
  const ranked = [...rows].sort(
    (left, right) => Number(right.remainder - left.remainder) || left.index - right.index,
  );
  const amounts = rows.map((row) => row.quotient);
  for (const row of ranked) {
    if (remainder <= 0n) break;
    amounts[row.index] = (amounts[row.index] ?? 0n) + 1n;
    remainder -= 1n;
  }
  return amounts.map((amountMinor, index) => ({
    categoryId: `category-${index + 1}`,
    percentageBps: percentagesBps[index] ?? 0,
    amountMinor: `${amountMinor}`,
  }));
}

export function calculateAdjustmentDelta(
  targetBalanceMinor: string,
  basisBalanceMinor: string,
): string {
  const target = parseNonNegativeMinor(targetBalanceMinor) ?? 0n;
  const basis = parseNonNegativeMinor(basisBalanceMinor) ?? 0n;
  return `${target - basis}`;
}

export function validateAdjustmentDraft(draft: AdjustmentDraft): string[] {
  const errors: string[] = [];
  if (
    parseNonNegativeMinor(draft.targetBalanceMinor) === null ||
    parseNonNegativeMinor(draft.basisBalanceMinor) === null
  )
    errors.push('Target dan basis harus berupa minor unit non-negatif.');
  const delta = calculateAdjustmentDelta(draft.targetBalanceMinor, draft.basisBalanceMinor);
  if (delta === '0') errors.push('Delta nol tidak mengubah saldo.');
  if (!ADJUSTMENT_REASONS.includes(draft.reason)) errors.push('Alasan adjustment tidak didukung.');
  if (draft.reason === 'other' && draft.note.trim().length === 0)
    errors.push('Alasan other membutuhkan catatan.');
  if (draft.note.trim().length > 300) errors.push('Catatan maksimal 300 karakter.');
  return errors;
}

export function buildReversalLines(entry: HistoryEntry): TransferLine[] {
  return entry.signedLines.map((line) => ({
    ...line,
    signedAmountMinor: `${-BigInt(line.signedAmountMinor)}`,
  }));
}

function accounts(): OperationAccount[] {
  return [
    {
      id: 'account-cash-fixture',
      name: 'Kas fixture',
      currency: 'IDR',
      liability: false,
      archived: false,
      accessible: true,
      version: 1,
    },
    {
      id: 'account-bank-fixture',
      name: 'Bank fixture',
      currency: 'IDR',
      liability: false,
      archived: false,
      accessible: true,
      version: 1,
    },
    {
      id: 'account-loan-fixture',
      name: 'Pinjaman fixture',
      currency: 'IDR',
      liability: true,
      archived: false,
      accessible: true,
      version: 2,
    },
    {
      id: 'account-archived-fixture',
      name: 'Akun arsip fixture',
      currency: 'IDR',
      liability: false,
      archived: true,
      accessible: true,
      version: 1,
    },
    {
      id: 'account-inaccessible-fixture',
      name: 'Akun terbatas fixture',
      currency: 'IDR',
      liability: false,
      archived: false,
      accessible: false,
      version: 1,
    },
  ];
}

function categories(): OperationCategory[] {
  return [
    { id: 'category-fee', name: 'Biaya transfer fixture', archived: false },
    { id: 'category-food', name: 'Makanan fixture', archived: false },
    { id: 'category-utilities', name: 'Utilitas fixture', archived: false },
    { id: 'category-archived-fixture', name: 'Kategori arsip fixture', archived: true },
  ];
}

function history(): HistoryEntry[] {
  return [
    {
      id: 'entry-transfer-fixture',
      kind: 'transfer',
      label: 'Transfer antar akun (fixture)',
      version: 1,
      signedLines: [
        {
          accountId: 'account-cash-fixture',
          currency: 'IDR',
          signedAmountMinor: '-100000',
          role: 'source',
        },
        {
          accountId: 'account-bank-fixture',
          currency: 'IDR',
          signedAmountMinor: '100000',
          role: 'destination',
        },
      ],
    },
    {
      id: 'entry-locked-fixture',
      kind: 'adjustment',
      label: 'Koreksi periode terkunci (fixture)',
      version: 3,
      locked: true,
      signedLines: [
        {
          accountId: 'account-cash-fixture',
          currency: 'IDR',
          signedAmountMinor: '25000',
          role: 'destination',
        },
      ],
    },
  ];
}

export function createTransfersFixture(scenario: OperationScenario = 'ready') {
  const accountFixtures = accounts();
  const categoryFixtures = categories();
  const historyFixtures = history();
  const state: OperationState =
    scenario === 'loading'
      ? 'loading'
      : scenario === 'empty'
        ? 'empty'
        : scenario === 'offline'
          ? 'offline'
          : scenario === 'archived_dependency'
            ? 'archived_dependency'
            : scenario === 'permission_denied'
              ? 'permission_denied'
              : scenario === 'sync_pending'
                ? 'sync_pending'
                : scenario === 'failed' || scenario === 'error'
                  ? 'failed'
                  : scenario === 'conflict'
                    ? 'needs_re_review'
                    : scenario === 'read_only'
                      ? 'idle'
                      : scenario === 'rollback'
                        ? 'aggregate_rollback'
                        : scenario === 'locked_period'
                          ? 'locked_period'
                          : 'idle';
  const initialResult: TransfersLoadResult = {
    state,
    accounts: accountFixtures,
    categories: categoryFixtures,
    history: scenario === 'empty' ? [] : historyFixtures,
    message:
      scenario === 'error'
        ? 'Gagal memuat operasi fixture.'
        : scenario === 'offline'
          ? 'Offline: perubahan akan menunggu sinkronisasi.'
          : 'Operasi fixture siap.',
  };
  const mutationResults = new Map<string, TransferCommitResult>();
  const reversed = new Set<string>();
  return {
    scenario,
    initialResult,
    accounts: accountFixtures,
    categories: categoryFixtures,
    history: historyFixtures,
    previewTransfer: buildTransferLines,
    commitTransfer(draft: TransferDraft, confirmed: boolean): TransferCommitResult {
      const existing = mutationResults.get(draft.clientMutationId);
      if (existing) return existing;
      const errors = validateTransferDraft(draft);
      if (errors.length > 0)
        return {
          kind: 'failed',
          mutationId: draft.clientMutationId,
          atomic: true,
          rolledBack: true,
          message: errors[0] ?? 'Transfer tidak valid.',
        };
      if (!confirmed && draft.amountMinor === '100000')
        return {
          kind: 'needs_confirmation',
          warning: 'Potensi duplikasi. Konfirmasi kedua diperlukan.',
        };
      const result: TransferCommitResult =
        scenario === 'rollback' || scenario === 'failed'
          ? {
              kind: 'failed',
              mutationId: draft.clientMutationId,
              atomic: true,
              rolledBack: true,
              message: 'Aggregate di-rollback utuh.',
            }
          : scenario === 'offline' || scenario === 'sync_pending'
            ? {
                kind: 'sync_pending',
                mutationId: draft.clientMutationId,
                atomic: true,
                transfer: buildTransferLines(draft),
              }
            : scenario === 'conflict'
              ? {
                  kind: 'needs_re_review',
                  message: 'Basis berubah; tinjau ulang sebelum menyimpan.',
                }
              : {
                  kind: 'synced',
                  mutationId: draft.clientMutationId,
                  atomic: true,
                  transfer: buildTransferLines(draft),
                };
      mutationResults.set(draft.clientMutationId, result);
      return result;
    },
    retry(mutationId: string): TransferCommitResult {
      const prior = mutationResults.get(mutationId);
      if (prior?.kind === 'sync_pending') return prior;
      return (
        prior ?? {
          kind: 'failed',
          mutationId,
          atomic: true,
          rolledBack: true,
          message: 'Mutation fixture tidak ditemukan.',
        }
      );
    },
    adjust(draft: AdjustmentDraft): AdjustmentResult {
      const errors = validateAdjustmentDraft(draft);
      if (errors.length > 0)
        return { kind: 'validation_error', message: errors[0] ?? 'Adjustment tidak valid.' };
      if (scenario === 'conflict')
        return { kind: 'needs_re_review', message: 'Basis version berubah; hitung ulang delta.' };
      return {
        kind: 'synced',
        deltaMinor: calculateAdjustmentDelta(draft.targetBalanceMinor, draft.basisBalanceMinor),
      };
    },
    reverse(
      entryOrId: HistoryEntry | string,
      expectedVersion: number,
      _mutationId: string,
    ): ReversalResult {
      const entry =
        typeof entryOrId === 'string'
          ? historyFixtures.find((item) => item.id === entryOrId)
          : entryOrId;
      if (!entry) return { kind: 'needs_re_review', message: 'Entry fixture tidak ditemukan.' };
      if (entry.locked || scenario === 'locked_period')
        return {
          kind: 'locked_period',
          message: 'Periode terkunci. Gunakan reversal pada periode terbuka.',
          replacementAvailable: true,
        };
      if (entry.version !== expectedVersion)
        return { kind: 'needs_re_review', message: 'Versi entry berubah.' };
      if (reversed.has(entry.id) || entry.reversed) return { kind: 'already_reversed' };
      reversed.add(entry.id);
      entry.reversed = true;
      return { kind: 'reversed', originalId: entry.id, reversalId: `reversal-for-${entry.id}` };
    },
    getPresentation() {
      return {
        accounts: accountFixtures.filter((account) => !account.archived && account.accessible),
        categories: categoryFixtures.filter((category) => !category.archived),
      };
    },
  };
}

export type TransfersFixture = ReturnType<typeof createTransfersFixture>;
