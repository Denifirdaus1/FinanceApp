import { formatMoney } from '@financeapp/ui';

export const DEBT_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  maximumContentWidth: 720,
} as const;

export type DebtScenario =
  | 'populated'
  | 'loading'
  | 'empty'
  | 'offline'
  | 'stale'
  | 'partial_fx'
  | 'statement_assisted'
  | 'statement_mismatch'
  | 'pending'
  | 'permission_revoked'
  | 'archived_closed'
  | 'negative_amortization'
  | 'amortization_kill_switch'
  | 'reminder_kill_switch'
  | 'too_large_schedule'
  | 'materialization_failure'
  | 'conflict'
  | 'invalid';

export type DebtKind = 'installment' | 'mortgage' | 'credit_card' | 'manual';
export type TrackingMode = 'ledger' | 'statement_assisted';

export type DebtDraft = {
  name: string;
  kind: DebtKind;
  trackingMode: TrackingMode;
  currency: string;
  openingOutstandingMinor: string;
  openingAsOf: string;
  creditLimitMinor: string | null;
  accountId: string | null;
  statementDate: string | null;
  dueDate: string | null;
  minimumDueMinor: string | null;
  aprBps: number | null;
  periods: number | null;
  paymentsPerYear: 12 | 26 | 52;
  reminderOptIn: boolean;
};

const currencies = new Set(['IDR', 'JPY', 'KWD']);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string | null): Date | null {
  if (!value || !datePattern.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function minor(value: string): bigint | null {
  if (!/^(0|[1-9]\d*)$/.test(value)) return null;
  return BigInt(value);
}

export function formatDebtMoney(value: string, currency = 'IDR'): string {
  return formatMoney(BigInt(value), currency);
}

export function validateDebtDraft(draft: DebtDraft): string[] {
  const errors: string[] = [];
  if (draft.name.trim().length < 1 || draft.name.trim().length > 80)
    errors.push('Nama debt harus 1–80 karakter.');
  if (!currencies.has(draft.currency)) errors.push('Currency fixture tidak didukung.');
  const opening = minor(draft.openingOutstandingMinor);
  if (opening === null || opening < 0n)
    errors.push('Outstanding pembukaan harus integer minor unit >= 0.');
  if (
    !parseDate(draft.openingAsOf) ||
    (draft.statementDate !== null && !parseDate(draft.statementDate)) ||
    (draft.dueDate !== null && !parseDate(draft.dueDate))
  )
    errors.push('Tanggal fixture tidak valid.');
  const asOf = parseDate(draft.openingAsOf);
  const due = parseDate(draft.dueDate);
  if (asOf && due && due < asOf) errors.push('Due date tidak boleh sebelum as-of.');
  if (
    draft.creditLimitMinor !== null &&
    (minor(draft.creditLimitMinor) === null || BigInt(draft.creditLimitMinor) <= 0n)
  )
    errors.push('Limit harus positif bila diisi.');
  if (
    draft.minimumDueMinor !== null &&
    (minor(draft.minimumDueMinor) === null || BigInt(draft.minimumDueMinor) < 0n)
  )
    errors.push('Minimum due harus minor unit valid.');
  if (draft.aprBps !== null && (!Number.isInteger(draft.aprBps) || draft.aprBps < 0))
    errors.push('APR fixture tidak valid.');
  if (draft.periods !== null && (!Number.isInteger(draft.periods) || draft.periods < 1))
    errors.push('Jumlah periode harus minimal 1.');
  return errors;
}

export function calculateOutstanding(
  opening: string,
  postedPrincipal: string,
  pendingPrincipal: string,
  lifecycle: 'posted' | 'pending',
): { actual: string; pending: string; projected: string; creditBalance?: string } {
  const openingValue = BigInt(opening);
  const posted = BigInt(postedPrincipal);
  const pending = BigInt(pendingPrincipal);
  const actualValue = openingValue - posted;
  const pendingValue = lifecycle === 'pending' ? posted : pending - pending;
  const projected = lifecycle === 'pending' ? openingValue - posted : actualValue;
  return {
    actual: (lifecycle === 'pending' ? openingValue : actualValue).toString(),
    pending: pendingValue.toString(),
    projected: projected.toString(),
    ...(actualValue < 0n ? { creditBalance: (-actualValue).toString() } : {}),
  };
}

type PaymentInput = {
  total: string;
  principal: string;
  interest: string;
  fee: string;
  adjustment: string;
};
export function reconcilePayment(input: PaymentInput): {
  valid: boolean;
  expenseMinor?: string;
  principalIsExpense?: boolean;
  reason?: string;
} {
  const total = BigInt(input.total);
  const sum =
    BigInt(input.principal) + BigInt(input.interest) + BigInt(input.fee) + BigInt(input.adjustment);
  if (sum !== total) return { valid: false, reason: 'total_mismatch' };
  return {
    valid: true,
    expenseMinor: (BigInt(input.interest) + BigInt(input.fee)).toString(),
    principalIsExpense: false,
  };
}

export function statementReconciliation(
  statement: string,
  calculated: string,
): { difference: string; status: 'needs_confirmation'; applied: false } {
  return {
    difference: (BigInt(statement) - BigInt(calculated)).toString(),
    status: 'needs_confirmation',
    applied: false,
  };
}

function ceilDivide(value: bigint, divisor: bigint): bigint {
  return divisor > 0n ? (value + divisor - 1n) / divisor : 0n;
}

export type AmortizationRow = {
  openingPrincipal: string;
  payment: string;
  interest: string;
  principal: string;
  closingPrincipal: string;
  lastPayment: boolean;
};
export type AmortizationResult = AmortizationRow[] & { negativeAmortization: boolean };

export function amortizationSchedule(input: {
  principal: string;
  aprBps: number;
  periods: number;
  paymentsPerYear: 12 | 26 | 52;
  scheduledPayment: string | null;
  periodicFee: string;
}): AmortizationResult {
  let opening = BigInt(input.principal);
  const denominator = BigInt(10000 * input.paymentsPerYear);
  let payment =
    input.scheduledPayment === null
      ? ceilDivide(opening, BigInt(input.periods))
      : BigInt(input.scheduledPayment);
  const rows: AmortizationRow[] = [];
  let negative = false;
  for (let index = 0; index < input.periods && opening > 0n; index += 1) {
    const interest = (opening * BigInt(input.aprBps) + denominator / 2n) / denominator;
    const fee = BigInt(input.periodicFee);
    if (payment <= interest + fee) negative = true;
    const principal = negative
      ? 0n
      : index === input.periods - 1
        ? opening
        : payment - interest - fee > opening
          ? opening
          : payment - interest - fee;
    const closing = opening - principal;
    const finalPayment = principal === opening ? principal + interest + fee : payment;
    rows.push({
      openingPrincipal: opening.toString(),
      payment: finalPayment.toString(),
      interest: interest.toString(),
      principal: principal.toString(),
      closingPrincipal: closing.toString(),
      lastPayment: closing === 0n,
    });
    opening = closing;
    if (negative) break;
    if (index === 0 && input.scheduledPayment === null && input.aprBps > 0)
      payment = ceilDivide(BigInt(input.principal), BigInt(input.periods));
  }
  const result = rows as AmortizationResult;
  result.negativeAmortization = negative;
  return result;
}

export type DebtFixture = ReturnType<typeof createDebtFixture>;

export function createDebtFixture(scenario: DebtScenario = 'populated') {
  let status: 'active' | 'paused' | 'archived' | 'closed' =
    scenario === 'archived_closed' ? 'archived' : 'active';
  return {
    scenario,
    list: () =>
      scenario === 'empty' || scenario === 'loading'
        ? []
        : [
            {
              id: 'debt-fixture',
              name: 'Pinjaman rumah',
              kind: 'installment' as const,
              status,
              currency: 'IDR',
              outstandingMinor: '10000000',
              dueDate: '2026-08-25',
              minimumDueMinor: '500000',
            },
          ],
    archive: (confirmed: boolean) => {
      if (confirmed) status = 'archived';
      return { status };
    },
    reopen: () => {
      status = 'active';
      return { status };
    },
    history: () => ({ available: true, includeInNetWorth: true, route: '/transactions' as const }),
    summary: () =>
      scenario === 'partial_fx'
        ? { nativeVisible: true, baseAggregate: 'partial', missingFxCount: 1 }
        : {
            trackingMode: scenario === 'statement_assisted' ? 'statement_assisted' : 'ledger',
            reconciliation: scenario === 'statement_assisted' ? 'unreconciled' : 'verified',
          },
    paymentResult: () =>
      scenario === 'offline'
        ? { status: 'queued', idempotent: true }
        : scenario === 'conflict'
          ? { status: 'review_required' }
          : scenario === 'pending'
            ? { actualUnchanged: true, status: 'pending' }
            : { principalTransfer: true, interestExpense: true, feeExpense: true, atomic: true },
    reconcileStatement: (confirmed: boolean) =>
      scenario === 'statement_mismatch'
        ? {
            status: 'needs_confirmation',
            applied: confirmed,
            openingChanged: false,
            adjustment: confirmed ? '100000' : '0',
          }
        : { applied: confirmed, openingChanged: false, adjustment: confirmed ? '100000' : '0' },
    schedule: () =>
      scenario === 'amortization_kill_switch'
        ? { visible: false, kind: 'maintenance' }
        : scenario === 'too_large_schedule'
          ? { visible: false, kind: 'too_large' }
          : {
              visible: true,
              rows: amortizationSchedule({
                principal: '1000000',
                aprBps: scenario === 'negative_amortization' ? 1200 : 0,
                periods: 12,
                paymentsPerYear: 12,
                scheduledPayment: scenario === 'negative_amortization' ? '1000' : null,
                periodicFee: '0',
              }),
            },
    reminder: () =>
      scenario === 'reminder_kill_switch'
        ? { kind: 'in_app_only', copy: 'Reminder hanya tampil di dalam aplikasi.' }
        : {
            kind: 'scheduled_fixture',
            copy: 'Reminder adalah fixture dan tidak menjadwalkan notifikasi nyata.',
          },
    extraPrincipal: (amount: string) => ({
      kind: 'scenario' as const,
      amount,
      actualChanged: false,
    }),
    retry: () =>
      scenario === 'materialization_failure'
        ? { kind: 'incremental_retry' as const }
        : { kind: 'refreshed' as const },
    save: (draft: DebtDraft) => {
      const errors = validateDebtDraft(draft);
      if (errors.length) return { status: 'invalid' as const, errors };
      if (scenario === 'offline')
        return { status: 'queued' as const, copy: 'Debt queued sebagai fixture.' };
      if (scenario === 'conflict')
        return { status: 'conflict' as const, copy: 'Konflik; buat salinan debt untuk review.' };
      if (scenario === 'permission_revoked')
        return { status: 'read-only' as const, copy: 'Akses berubah; debt read-only.' };
      return { status: 'saved' as const, copy: 'Debt tersimpan sebagai fixture.' };
    },
  };
}
