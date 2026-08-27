import { formatMoney } from '@financeapp/ui';

export const GOAL_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  maximumContentWidth: 720,
} as const;

export type GoalScenario =
  | 'populated'
  | 'loading'
  | 'empty'
  | 'offline'
  | 'stale'
  | 'partial'
  | 'missing_fx'
  | 'invalid_legacy'
  | 'permission_revoked'
  | 'archived_paused'
  | 'overfunded'
  | 'past_due_active'
  | 'reminder_kill_switch'
  | 'too_many_lines'
  | 'conflict';

export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived';
export type GoalKind = 'savings' | 'sinking_fund';
export type GoalCadence = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface GoalDraft {
  name: string;
  kind: GoalKind;
  currency: string;
  targetMinor: string;
  startDate: string;
  deadline: string | null;
  cadence: GoalCadence;
  customPeriodDays: number | null;
  linkedAccountIds: string[];
  reminderOptIn: boolean;
  icon: string;
  color: string;
}

export interface GoalProgressInput {
  targetMinor: string;
  contributionMinor: string;
  withdrawalMinor: string;
  pendingMinor: string;
  today: string;
  deadline: string | null;
  cadence: GoalCadence;
  customPeriodDays?: number | null;
}

export interface GoalProgress {
  currentMinor: string;
  pendingMinor: string;
  remainingMinor: string;
  overfundedMinor: string;
  visualProgressPercent: number;
  progressLabel: string;
  requiredMinor: string | null;
  status: 'active' | 'past_due_active' | 'overfunded';
  milestones: number[];
}

export interface GoalItem {
  id: string;
  name: string;
  kind: GoalKind;
  currency: string;
  targetMinor: string;
  status: GoalStatus;
  deadline: string | null;
  progressPercent: number;
  milestone: number;
  color: string;
}

function parseMinor(value: string): bigint | null {
  return /^-?\d+$/.test(value) ? BigInt(value) : null;
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function daysInclusive(today: string, deadline: string): number | null {
  if (!validDate(today) || !validDate(deadline)) return null;
  const difference = Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.floor(difference / 86_400_000) + 1;
}

function ceilDivide(value: bigint, divisor: bigint): bigint {
  return divisor > 0n ? (value + divisor - 1n) / divisor : 0n;
}

export function formatGoalMoney(minor: string, currency = 'IDR'): string | null {
  const value = parseMinor(minor);
  return value === null ? null : formatMoney(value, currency);
}

export function requiredPeriodicMinor(
  remainingMinor: string,
  today: string,
  deadline: string | null,
  cadence: GoalCadence,
  customPeriodDays?: number | null,
): string | null {
  const remaining = parseMinor(remainingMinor);
  if (remaining === null || remaining <= 0n || deadline === null) return null;
  const days = daysInclusive(today, deadline);
  if (days === null || days <= 1) return null;
  let periods: bigint;
  if (cadence === 'daily') periods = BigInt(days);
  else if (cadence === 'weekly') periods = BigInt(Math.ceil(days / 7));
  else if (cadence === 'custom')
    periods = BigInt(Math.max(1, Math.ceil(days / Math.max(1, customPeriodDays ?? 1))));
  else periods = BigInt(Math.max(1, Math.ceil(days / 30)));
  return ceilDivide(remaining, periods).toString();
}

export function calculateGoalProgress(input: GoalProgressInput): GoalProgress {
  const target = parseMinor(input.targetMinor);
  const contribution = parseMinor(input.contributionMinor);
  const withdrawal = parseMinor(input.withdrawalMinor);
  const pending = parseMinor(input.pendingMinor);
  if (
    target === null ||
    contribution === null ||
    withdrawal === null ||
    pending === null ||
    target <= 0n
  ) {
    throw new Error('Target dan agregat goal harus berupa minor unit integer positif.');
  }
  const current = contribution - withdrawal;
  const remaining = target > current ? target - current : 0n;
  const overfunded = current > target ? current - target : 0n;
  const rawPercent = (current * 100n) / target;
  const visualPercent = rawPercent <= 0n ? 0 : rawPercent >= 100n ? 100 : Number(rawPercent);
  const progressLabel =
    overfunded > 0n ? `>${rawPercent.toString()}% overfunded` : `${visualPercent}%`;
  const status =
    overfunded > 0n
      ? 'overfunded'
      : input.deadline !== null &&
          daysInclusive(input.today, input.deadline) !== null &&
          (daysInclusive(input.today, input.deadline) as number) <= 1 &&
          remaining > 0n
        ? 'past_due_active'
        : 'active';
  const milestones = [25, 50, 75, 100].filter(
    (threshold) => current >= 0n && current * 100n >= target * BigInt(threshold),
  );
  return {
    currentMinor: current.toString(),
    pendingMinor: pending.toString(),
    remainingMinor: remaining.toString(),
    overfundedMinor: overfunded.toString(),
    visualProgressPercent: visualPercent,
    progressLabel,
    requiredMinor:
      status === 'past_due_active'
        ? null
        : requiredPeriodicMinor(
            remaining.toString(),
            input.today,
            input.deadline,
            input.cadence,
            input.customPeriodDays,
          ),
    status,
    milestones,
  };
}

export function validateGoalDraft(draft: GoalDraft): string[] {
  const errors: string[] = [];
  if (draft.name.trim().length < 1 || draft.name.trim().length > 60)
    errors.push('Nama goal wajib 1–60 karakter.');
  if (!['savings', 'sinking_fund'].includes(draft.kind)) errors.push('Jenis goal tidak didukung.');
  if (!/^[A-Z]{3}$/.test(draft.currency) || !['IDR', 'JPY', 'KWD'].includes(draft.currency))
    errors.push('currency harus berupa kode ISO yang didukung.');
  const target = parseMinor(draft.targetMinor);
  if (target === null || target <= 0n) errors.push('target harus lebih besar dari nol.');
  if (!validDate(draft.startDate)) errors.push('Tanggal mulai tidak valid.');
  if (draft.deadline !== null && (!validDate(draft.deadline) || draft.deadline < draft.startDate))
    errors.push('deadline tidak boleh sebelum tanggal mulai.');
  if (!['daily', 'weekly', 'monthly', 'custom'].includes(draft.cadence))
    errors.push('cadence tidak didukung.');
  if (
    draft.cadence === 'custom' &&
    (draft.customPeriodDays === null || draft.customPeriodDays < 1 || draft.customPeriodDays > 366)
  )
    errors.push('cadence custom harus 1–366 hari.');
  if (draft.linkedAccountIds.length === 0)
    errors.push('Minimal satu akun yang dapat diakses harus dipilih.');
  return errors;
}

const defaultDraft: GoalDraft = {
  name: 'Dana liburan',
  kind: 'savings',
  currency: 'IDR',
  targetMinor: '5000000',
  startDate: '2026-08-01',
  deadline: '2026-12-31',
  cadence: 'monthly',
  customPeriodDays: null,
  linkedAccountIds: ['account-cash-fixture'],
  reminderOptIn: false,
  icon: 'savings',
  color: 'mint',
};

function goalItems(): GoalItem[] {
  return [
    {
      id: 'goal-travel',
      name: 'Dana liburan',
      kind: 'savings',
      currency: 'IDR',
      targetMinor: '5000000',
      status: 'active',
      deadline: '2026-12-31',
      progressPercent: 72,
      milestone: 50,
      color: 'mint',
    },
    {
      id: 'goal-archived',
      name: 'Dana lama',
      kind: 'sinking_fund',
      currency: 'IDR',
      targetMinor: '1000000',
      status: 'archived',
      deadline: null,
      progressPercent: 100,
      milestone: 100,
      color: 'peach',
    },
    {
      id: 'goal-paused',
      name: 'Dana ditunda',
      kind: 'sinking_fund',
      currency: 'IDR',
      targetMinor: '2000000',
      status: 'paused',
      deadline: '2026-11-30',
      progressPercent: 25,
      milestone: 25,
      color: 'lavender',
    },
    {
      id: 'goal-completed',
      name: 'Dana selesai',
      kind: 'savings',
      currency: 'IDR',
      targetMinor: '800000',
      status: 'completed',
      deadline: '2026-07-31',
      progressPercent: 100,
      milestone: 100,
      color: 'sky',
    },
  ];
}

export interface GoalsFixture {
  scenario: GoalScenario;
  list: () => { items: GoalItem[]; state: GoalScenario };
  filterStatus: (status: GoalStatus) => { items: GoalItem[]; state: GoalScenario };
  copyPrevious: () => { kind: 'copied'; name: string };
  pause: (id: string) => { kind: 'paused'; id: string };
  complete: (id: string) => { kind: 'completed'; id: string };
  archive: (id: string, confirmed: boolean) => { kind: 'archived' | 'cancelled'; id: string };
  reopen: (id: string) => { kind: 'reopened'; id: string };
  reorder: (id: string, position: number) => { kind: 'reordered'; id: string; position: number };
  preview: (draft: GoalDraft) => {
    firstPeriod: string;
    requiredLabel: string;
    requiredMinor: string | null;
  };
  businessRules: () => {
    transferIncome: boolean;
    transferCashflow: boolean;
    draftCounted: boolean;
    voidCounted: boolean;
    missingFxCount: number;
  };
  candidateTransfers: () => { id: string; selectable: boolean; direction: 'contribution' }[];
  allocate: (
    candidateId: string,
    allocationMinor: string,
    sourceMinor: string,
    confirmed: boolean,
  ) => {
    kind: 'applied' | 'rejected_mutation' | 'review_required';
    contribution: boolean;
    noAutoCount?: boolean;
    reason?: string;
  };
  withdraw: (value: string, confirmed: boolean) => { kind: 'withdrawn' | 'confirmation_required' };
  detail: (id: string) => {
    actualMinor: string;
    withdrawalMinor: string;
    pendingMinor: string;
    remainingMinor: string;
    overfundedMinor: string;
    progressLabel: string;
    formula: string;
    milestones: number[];
    transactionRoute: '/transactions';
  };
  targetHistory: (id: string) => { targetMinor: string; asOf: string }[];
  save: (draft: GoalDraft) => {
    kind: 'queued' | 'conflict_copy' | 'saved' | 'invalid';
    syncStatus?: string;
    name?: string;
    errors?: string[];
  };
  readOnly: () => { kind: 'read_only'; reason: string };
  recovery: () => { kind: 'guidance'; message: string };
  retry: () => { kind: 'refreshed'; message: string };
  reminder: () => { kind: 'manual_only' | 'scheduled'; message: string };
}

export function createGoalsFixture(scenario: GoalScenario = 'populated'): GoalsFixture {
  const all = goalItems();
  const visible = () => all.filter((item) => item.status === 'active');
  return {
    scenario,
    list: () => ({
      items:
        scenario === 'empty'
          ? []
          : scenario === 'archived_paused'
            ? all.filter((item) => item.status !== 'active')
            : visible(),
      state: scenario,
    }),
    filterStatus: (status) => ({
      items: all.filter((item) => item.status === status),
      state: scenario,
    }),
    copyPrevious: () => ({ kind: 'copied', name: `${defaultDraft.name} (salinan)` }),
    pause: (id) => ({ kind: 'paused', id }),
    complete: (id) => ({ kind: 'completed', id }),
    archive: (id, confirmed) => ({ kind: confirmed ? 'archived' : 'cancelled', id }),
    reopen: (id) => ({ kind: 'reopened', id }),
    reorder: (id, position) => ({ kind: 'reordered', id, position }),
    preview: (draft) => {
      const required = calculateGoalProgress({
        targetMinor: draft.targetMinor,
        contributionMinor: '0',
        withdrawalMinor: '0',
        pendingMinor: '0',
        today: draft.startDate,
        deadline: draft.deadline,
        cadence: draft.cadence,
        customPeriodDays: draft.customPeriodDays,
      });
      return {
        firstPeriod: '1–31 Agustus 2026',
        requiredLabel: 'Kebutuhan rata-rata per periode (perkiraan matematis)',
        requiredMinor: required.requiredMinor,
      };
    },
    businessRules: () => ({
      transferIncome: false,
      transferCashflow: false,
      draftCounted: false,
      voidCounted: false,
      missingFxCount: 1,
    }),
    candidateTransfers: () => [
      { id: 'candidate-transfer-fixture', selectable: true, direction: 'contribution' },
    ],
    allocate: (_candidateId, allocationMinor, sourceMinor, confirmed) => {
      const allocation = parseMinor(allocationMinor);
      const source = parseMinor(sourceMinor);
      if (!confirmed) return { kind: 'review_required', contribution: false };
      if (allocation === null || source === null || allocation <= 0n || allocation > source)
        return {
          kind: 'rejected_mutation',
          contribution: false,
          reason: 'Alokasi melebihi transaksi sumber atau tidak valid.',
        };
      return { kind: 'applied', contribution: true, noAutoCount: true };
    },
    withdraw: (_value, confirmed) =>
      confirmed ? { kind: 'withdrawn' } : { kind: 'confirmation_required' },
    detail: () => {
      const progress = calculateGoalProgress({
        targetMinor: '5000000',
        contributionMinor: '3600000',
        withdrawalMinor: '100000',
        pendingMinor: '250000',
        today: '2026-08-01',
        deadline: '2026-12-31',
        cadence: 'monthly',
      });
      return {
        actualMinor: progress.currentMinor,
        withdrawalMinor: '100000',
        pendingMinor: progress.pendingMinor,
        remainingMinor: progress.remainingMinor,
        overfundedMinor: progress.overfundedMinor,
        progressLabel: progress.progressLabel,
        formula: 'remaining = max(target - current, 0); current = contribution - withdrawal',
        milestones: [25, 50, 75, 100],
        transactionRoute: '/transactions',
      };
    },
    targetHistory: () => [
      { targetMinor: '4000000', asOf: '2026-07-01' },
      { targetMinor: '5000000', asOf: '2026-08-01' },
    ],
    save: (draft) => {
      const errors = validateGoalDraft(draft);
      if (errors.length) return { kind: 'invalid', errors };
      if (scenario === 'offline')
        return { kind: 'queued', syncStatus: 'pending-sync', name: draft.name };
      if (scenario === 'conflict')
        return { kind: 'conflict_copy', name: `${draft.name} (salinan)` };
      return { kind: 'saved', syncStatus: 'local-fixture', name: draft.name };
    },
    readOnly: () => ({ kind: 'read_only', reason: 'Akses goal berubah; mode read-only.' }),
    recovery: () => ({
      kind: 'guidance',
      message: 'Kurangi line dan buat perubahan bertahap pada fixture.',
    }),
    retry: () => ({ kind: 'refreshed', message: 'Data goal fixture diperbarui tanpa network.' }),
    reminder: () =>
      scenario === 'reminder_kill_switch'
        ? { kind: 'manual_only', message: 'Reminder maintenance; gunakan pengingat manual.' }
        : { kind: 'scheduled', message: 'Reminder opt-in hanya tercatat sebagai fixture.' },
  };
}
