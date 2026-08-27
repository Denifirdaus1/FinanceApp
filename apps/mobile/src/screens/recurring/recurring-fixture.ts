import { formatMoney } from '@financeapp/ui';

export const RECURRING_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  maximumContentWidth: 720,
} as const;

export type RecurringScenario =
  | 'populated'
  | 'loading'
  | 'empty'
  | 'offline'
  | 'stale'
  | 'partial'
  | 'variable_estimate'
  | 'matched_pending'
  | 'paid'
  | 'due'
  | 'overdue'
  | 'skipped'
  | 'snoozed'
  | 'archived_paused'
  | 'permission_revoked'
  | 'materialization_failure'
  | 'rule_conflict'
  | 'matching_kill_switch'
  | 'push_kill_switch'
  | 'invalid';

export type RecurringKind = 'expense' | 'income' | 'transfer';
export type AmountMode = 'fixed' | 'last_settled' | 'rolling_3';
export type Cadence = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type MonthEndPolicy = 'clamp' | 'skip';
export type WeekendPolicy = 'keep' | 'next_business_day' | 'previous_business_day';
export type EndCondition = 'none' | 'after_occurrences' | 'on_date';
export type PostingMode = 'draft' | 'auto_post_fixture';

export type RecurringDraft = {
  name: string;
  kind: RecurringKind;
  amountMode: AmountMode;
  amountMinor: string;
  currency: string;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  cadence: Cadence;
  interval: number;
  anchorDate: string;
  dueDate: string;
  timezone: string;
  monthEndPolicy: MonthEndPolicy;
  weekendPolicy: WeekendPolicy;
  endCondition: EndCondition;
  endAfterOccurrences: number | null;
  endDate: string | null;
  reminderOptIn: boolean;
  postingMode: PostingMode;
  varianceAbsoluteMinor: string;
  variancePercent: number;
};

type RecurringItem = {
  id: string;
  name: string;
  kind: RecurringKind;
  status: 'active' | 'paused' | 'ended' | 'archived';
  currency: string;
  amountMinor: string;
  nextDueDate: string;
};

const SUPPORTED_CURRENCIES = new Set(['IDR', 'JPY', 'KWD']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isCanonicalMinor(value: string): boolean {
  return /^(0|[1-9]\d*)$/.test(value);
}

function parseDate(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function addDays(value: string, days: number): string {
  const date = parseDate(value) ?? new Date(Date.UTC(2026, 0, 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(value: string, months: number, policy: MonthEndPolicy): string | null {
  const date = parseDate(value);
  if (!date) return null;
  const originalDay = date.getUTCDate();
  const targetMonth = date.getUTCMonth() + months;
  const year = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  const lastDay = daysInMonth(year, month);
  if (policy === 'skip' && originalDay > lastDay) return null;
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(
    Math.min(originalDay, lastDay),
  ).padStart(2, '0')}`;
}

export function expandMonthlyOccurrence(
  anchorDate: string,
  count: number,
  policy: MonthEndPolicy,
): string[] {
  if (count <= 0 || !parseDate(anchorDate)) return [];
  const result: string[] = [];
  for (let index = 0; result.length < count && index < count * 3; index += 1) {
    const occurrence = addMonths(anchorDate, index, policy);
    if (occurrence) result.push(occurrence);
  }
  return result;
}

export function formatRecurringMoney(amountMinor: string, currency: string): string {
  return formatMoney(BigInt(amountMinor), currency);
}

export function validateRecurringDraft(draft: RecurringDraft): string[] {
  const errors: string[] = [];
  if (draft.name.trim().length < 1 || draft.name.trim().length > 80)
    errors.push('Nama recurring harus 1–80 karakter.');
  if (!SUPPORTED_CURRENCIES.has(draft.currency)) errors.push('Currency fixture tidak didukung.');
  if (!isCanonicalMinor(draft.amountMinor) || BigInt(draft.amountMinor) <= 0n) {
    errors.push('Nominal harus berupa minor unit integer canonical.');
  }
  if (draft.interval < 1 || !Number.isInteger(draft.interval))
    errors.push('Interval harus minimal 1.');
  if (!parseDate(draft.anchorDate) || !parseDate(draft.dueDate))
    errors.push('Tanggal fixture tidak valid.');
  const anchor = parseDate(draft.anchorDate);
  const due = parseDate(draft.dueDate);
  if (anchor && due && due < anchor) errors.push('Tanggal jatuh tempo tidak boleh sebelum anchor.');
  if (draft.kind === 'transfer' && draft.accountId === draft.destinationAccountId) {
    errors.push('Akun sumber dan tujuan harus berbeda.');
  }
  if (draft.kind === 'transfer' && !draft.destinationAccountId)
    errors.push('Transfer memerlukan akun tujuan.');
  if (
    draft.endCondition === 'after_occurrences' &&
    (!draft.endAfterOccurrences || draft.endAfterOccurrences < 1)
  ) {
    errors.push('Jumlah occurrence akhir harus minimal 1.');
  }
  if (draft.endCondition === 'on_date' && (!draft.endDate || !parseDate(draft.endDate)))
    errors.push('Tanggal akhir tidak valid.');
  return errors;
}

export function recurrencePreview(draft: RecurringDraft): {
  occurrences: string[];
  estimateLabel: string;
  postingCopy: string;
} {
  const occurrences =
    draft.cadence === 'monthly'
      ? expandMonthlyOccurrence(draft.anchorDate, 6, draft.monthEndPolicy)
      : Array.from({ length: 6 }, (_, index) => {
          const days =
            draft.cadence === 'daily'
              ? index * draft.interval
              : draft.cadence === 'weekly'
                ? index * draft.interval * 7
                : index * draft.interval * 365;
          return addDays(draft.anchorDate, days);
        });
  return {
    occurrences,
    estimateLabel: draft.amountMode === 'fixed' ? 'Estimasi tetap' : 'Estimasi variabel',
    postingCopy:
      draft.postingMode === 'draft'
        ? 'Hasil akan menjadi draft fixture, bukan auto-post.'
        : 'Auto-post hanya direpresentasikan sebagai fixture review.',
  };
}

export type RecurringFixture = ReturnType<typeof createRecurringFixture>;

export function createRecurringFixture(scenario: RecurringScenario = 'populated') {
  let item: RecurringItem = {
    id: 'recurring-fixture',
    name: 'Internet rumah',
    kind: 'expense',
    status: scenario === 'archived_paused' ? 'paused' : 'active',
    currency: 'IDR',
    amountMinor: '350000',
    nextDueDate: '2026-08-31',
  };
  let occurrenceStatus =
    scenario === 'matched_pending' ||
    scenario === 'paid' ||
    scenario === 'due' ||
    scenario === 'overdue' ||
    scenario === 'skipped' ||
    scenario === 'snoozed'
      ? scenario
      : 'estimated';

  return {
    scenario,
    list: () => (scenario === 'empty' || scenario === 'loading' ? [] : [item]),
    filterStatus: (status: RecurringItem['status']) => (item.status === status ? [item] : []),
    copyPrevious: () => ({
      ...item,
      id: 'recurring-copy',
      name: `${item.name} (salinan)`,
      status: 'active' as const,
    }),
    pause: () => ((item = { ...item, status: 'paused' }), item),
    end: () => ((item = { ...item, status: 'ended' }), item),
    archive: (confirmed: boolean) =>
      confirmed ? ((item = { ...item, status: 'archived' }), item) : item,
    reopen: () => ((item = { ...item, status: 'active' }), item),
    preview: () =>
      recurrencePreview({
        name: item.name,
        kind: item.kind,
        amountMode: scenario === 'variable_estimate' ? 'rolling_3' : 'fixed',
        amountMinor: item.amountMinor,
        currency: item.currency,
        accountId: 'account-fixture',
        destinationAccountId: null,
        categoryId: 'category-fixture',
        cadence: 'monthly',
        interval: 1,
        anchorDate: '2026-01-31',
        dueDate: item.nextDueDate,
        timezone: 'Asia/Jakarta',
        monthEndPolicy: 'clamp',
        weekendPolicy: 'keep',
        endCondition: 'none',
        endAfterOccurrences: null,
        endDate: null,
        reminderOptIn: false,
        postingMode: 'draft',
        varianceAbsoluteMinor: '50000',
        variancePercent: 10,
      }),
    occurrenceStates: () => [
      'estimated',
      'matched',
      'matched_pending',
      'paid',
      'received',
      'due',
      'overdue',
      'skipped',
      'snoozed',
    ],
    currentOccurrence: () => occurrenceStatus,
    candidates: () => [
      { id: 'candidate-1', reason: 'Tanggal dan nominal fixture cocok', selectable: true },
      { id: 'already-used', reason: 'Entry sudah digunakan occurrence lain', selectable: false },
    ],
    match: (candidateId: string, confirmed: boolean) => {
      if (candidateId === 'already-used') return { kind: 'over_match_review' as const };
      if (!confirmed) return { kind: 'review_required' as const };
      occurrenceStatus = 'matched';
      return { kind: 'matched' as const };
    },
    unmatch: () => ((occurrenceStatus = 'due'), { kind: 'due' as const }),
    skip: () => ((occurrenceStatus = 'skipped'), { kind: 'skipped' as const }),
    snooze: () => (
      (occurrenceStatus = 'snoozed'),
      { kind: 'snoozed' as const, dueDateChanged: false }
    ),
    estimate: (mode: AmountMode) =>
      mode === 'fixed' ? '350000' : mode === 'last_settled' ? '400000' : '350000',
    alert: (actualMinor: string) => {
      const delta = BigInt(actualMinor) - 350000n;
      return delta < -50000n || delta > 50000n;
    },
    businessRules: () => ({
      transferSpending: false,
      pendingActual: false,
      pendingStatus: 'matched_pending',
      draftStatus: 'due',
      voidStatus: 'overdue',
      unmatchedStatus: 'due',
      autoPay: false,
    }),
    save: (draft: RecurringDraft) => {
      const errors = validateRecurringDraft(draft);
      if (errors.length) return { status: 'invalid' as const, errors };
      if (scenario === 'offline')
        return { status: 'queued' as const, copy: 'Queued untuk sinkronisasi fixture.' };
      if (scenario === 'rule_conflict')
        return {
          status: 'conflict' as const,
          copy: 'Konflik rule; simpan sebagai (salinan) untuk review.',
        };
      if (scenario === 'permission_revoked')
        return { status: 'read-only' as const, copy: 'Akses berubah; fixture menjadi read-only.' };
      return { status: 'saved' as const, copy: 'Recurring tersimpan sebagai fixture.' };
    },
    detail: () => ({
      route: '/transactions' as const,
      status: occurrenceStatus,
      historyAvailable: true,
    }),
    reminder: () =>
      scenario === 'matching_kill_switch'
        ? { kind: 'manual_review' as const, copy: 'Matching dimatikan; lakukan manual review.' }
        : scenario === 'push_kill_switch'
          ? { kind: 'local_list' as const, copy: 'Push dimatikan; local list tetap aktif.' }
          : {
              kind: 'scheduled_fixture' as const,
              copy: 'Reminder hanya fixture dan tidak menjadwalkan notifikasi nyata.',
            },
    retry: () =>
      scenario === 'materialization_failure'
        ? { kind: 'incremental_retry' as const }
        : { kind: 'refreshed' as const },
    readOnly: () => scenario === 'permission_revoked',
  };
}
