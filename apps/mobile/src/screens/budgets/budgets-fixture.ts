import { formatMoney } from '@financeapp/ui';

export const BUDGET_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  maximumContentWidth: 720,
} as const;

export type BudgetScenario =
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
  | 'too_many_lines'
  | 'rollover_maintenance'
  | 'conflict';

export type BudgetStatus = 'active' | 'paused' | 'archived';
export type BudgetCadence = 'weekly' | 'monthly' | 'custom_days';
export type RolloverMode = 'none' | 'positive-only' | 'full-balance' | 'positive-capped';

export interface BudgetCategoryLine {
  categoryId: string;
  plannedMinor: string;
}

export interface BudgetDraft {
  name: string;
  currency: string;
  categoryLines: BudgetCategoryLine[];
  cadence: BudgetCadence;
  timezone: string;
  anchorDate: string;
  startDay: number;
  rolloverMode: RolloverMode;
  rolloverCapMinor: string | null;
  threshold: { kind: 'preset' | 'custom'; percent: number };
}

export interface BudgetLineInput {
  baseAllocationMinor: string;
  adjustmentMinor: string;
  rolloverMinor: string;
  actualSpentMinor: string;
  committedMinor: string;
  forecastMinor: string;
}

export interface BudgetLineMetrics {
  plannedMinor: string;
  actualSpentMinor: string;
  committedMinor: string;
  forecastMinor: string;
  availableActualMinor: string;
  availableAfterCommittedMinor: string;
  projectedRemainingMinor: string;
  overspentMinor: string;
  usagePercent: string | null;
}

export interface BudgetItem {
  id: string;
  name: string;
  status: BudgetStatus;
  cadence: BudgetCadence;
  period: string;
  categoryLabel: string;
  plannedMinor: string;
  progressPercent: string;
}

function parseMinor(value: string): bigint | null {
  return /^-?\d+$/.test(value) ? BigInt(value) : null;
}

export function formatBudgetMoney(minor: string, currency = 'IDR'): string | null {
  const parsed = parseMinor(minor);
  if (parsed === null) return null;
  return formatMoney(parsed, currency);
}

export function calculateBudgetLine(input: BudgetLineInput): BudgetLineMetrics {
  const values = Object.values(input).map(parseMinor);
  if (values.some((value) => value === null)) {
    throw new Error('Nilai budget harus berupa minor unit integer.');
  }
  const [base, adjustment, rollover, actual, committed, forecast] = values as [
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
  ];
  const planned = base + adjustment + rollover;
  const availableActual = planned - actual;
  const availableAfterCommitted = availableActual - committed;
  const projectedRemaining = availableAfterCommitted - forecast;
  const overspent = availableActual < 0n ? -availableActual : 0n;
  const usagePercent = planned > 0n ? ((actual * 100n) / planned).toString() : null;
  return {
    plannedMinor: planned.toString(),
    actualSpentMinor: actual.toString(),
    committedMinor: committed.toString(),
    forecastMinor: forecast.toString(),
    availableActualMinor: availableActual.toString(),
    availableAfterCommittedMinor: availableAfterCommitted.toString(),
    projectedRemainingMinor: projectedRemaining.toString(),
    overspentMinor: overspent.toString(),
    usagePercent,
  };
}

export function rolloverAmount(
  previousAvailableMinor: string,
  mode: RolloverMode,
  capMinor?: string | null,
): string {
  const value = parseMinor(previousAvailableMinor);
  if (value === null) return '0';
  if (mode === 'none') return '0';
  if (mode === 'full-balance') return value.toString();
  const positive = value > 0n ? value : 0n;
  if (mode === 'positive-capped') {
    const cap = capMinor ? parseMinor(capMinor) : null;
    return cap !== null && cap >= 0n && positive > cap ? cap.toString() : positive.toString();
  }
  return positive.toString();
}

export function validateBudgetDraft(draft: BudgetDraft): string[] {
  const errors: string[] = [];
  if (draft.name.trim().length < 1 || draft.name.trim().length > 60) {
    errors.push('Nama budget wajib 1–60 karakter.');
  }
  if (!/^[A-Z]{3}$/.test(draft.currency) || !['IDR', 'JPY', 'KWD'].includes(draft.currency)) {
    errors.push('currency harus berupa kode ISO yang didukung.');
  }
  if (draft.timezone !== 'Asia/Jakarta') errors.push('Timezone fixture harus Asia/Jakarta.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.anchorDate)) errors.push('Tanggal anchor tidak valid.');
  if (draft.cadence === 'weekly' && (draft.startDay < 1 || draft.startDay > 7)) {
    errors.push('Hari awal mingguan harus 1–7.');
  }
  if (draft.cadence !== 'weekly' && (draft.startDay < 1 || draft.startDay > 31)) {
    errors.push('Hari awal bulanan harus 1–31.');
  }
  if (draft.categoryLines.length > 100) errors.push('Budget memiliki terlalu banyak line.');
  const ids = draft.categoryLines.map((line) => line.categoryId);
  if (new Set(ids).size !== ids.length)
    errors.push('Kategori tidak boleh ganda pada periode overlap.');
  if (
    draft.categoryLines.some((line) => {
      const value = parseMinor(line.plannedMinor);
      return value === null || value <= 0n;
    })
  )
    errors.push('Planned allocation harus positif.');
  if (draft.threshold.percent < 1 || draft.threshold.percent > 100) {
    errors.push('threshold harus berada di antara 1–100 persen.');
  }
  if (
    draft.rolloverMode === 'positive-capped' &&
    (!draft.rolloverCapMinor || parseMinor(draft.rolloverCapMinor) === null)
  ) {
    errors.push('Batas rollover harus berupa minor unit integer.');
  }
  return errors;
}

const defaultDraft: BudgetDraft = {
  name: 'Budget bulanan',
  currency: 'IDR',
  categoryLines: [
    { categoryId: 'category-food', plannedMinor: '1000000' },
    { categoryId: 'category-transport', plannedMinor: '500000' },
  ],
  cadence: 'monthly',
  timezone: 'Asia/Jakarta',
  anchorDate: '2026-08-01',
  startDay: 1,
  rolloverMode: 'positive-only',
  rolloverCapMinor: null,
  threshold: { kind: 'preset', percent: 80 },
};

function fixtureItems(): BudgetItem[] {
  return [
    {
      id: 'budget-monthly',
      name: 'Budget bulanan',
      status: 'active',
      cadence: 'monthly',
      period: 'Agustus 2026',
      categoryLabel: 'Kebutuhan rumah',
      plannedMinor: '1500000',
      progressPercent: '69',
    },
    {
      id: 'budget-archived',
      name: 'Budget lama',
      status: 'archived',
      cadence: 'monthly',
      period: 'Juli 2026',
      categoryLabel: 'Arsip',
      plannedMinor: '800000',
      progressPercent: '100',
    },
    {
      id: 'budget-paused',
      name: 'Budget ditunda',
      status: 'paused',
      cadence: 'weekly',
      period: 'Minggu 32',
      categoryLabel: 'Harian',
      plannedMinor: '250000',
      progressPercent: '40',
    },
  ];
}

export interface BudgetsFixture {
  scenario: BudgetScenario;
  list: () => { items: BudgetItem[]; state: BudgetScenario };
  filterStatus: (status: BudgetStatus) => { items: BudgetItem[]; state: BudgetScenario };
  copyPrevious: () => { kind: 'copied'; name: string };
  pause: (id: string) => { kind: 'paused'; id: string };
  archive: (id: string, confirmed: boolean) => { kind: 'archived' | 'cancelled'; id: string };
  restore: (id: string) => { kind: 'restored'; id: string };
  preview: (draft: BudgetDraft) => { firstPeriod: string; rolloverSimulation: string };
  moveAllocation: (
    from: string,
    to: string,
    value: string,
    adjustment: string,
  ) => { kind: 'applied' | 'invalid'; zeroSum: boolean };
  businessRules: () => {
    transferSpending: string;
    linkedRefundReducesActual: boolean;
    linkedRefundIncome: boolean;
    unmatchedRecurringForecast: string;
    missingFxCount: number;
    missingFxFallback: boolean;
  };
  alert: (
    id: string,
    threshold: number,
  ) => { kind: 'alerted' | 'deduped'; id: string; threshold: number };
  rolloverStatus: () => { kind: 'maintenance' | 'ready'; message: string };
  save: (draft: BudgetDraft) => {
    kind: 'queued' | 'conflict_copy' | 'saved' | 'invalid';
    syncStatus?: string;
    name?: string;
    errors?: string[];
  };
  readOnly: () => { kind: 'read_only'; reason: string };
  validation: () => { kind: 'too_many_lines'; message: string };
  recompute: () => { kind: 'preview_only'; message: string };
  detail: (id: string) => {
    plannedMinor: string;
    actualMinor: string;
    committedMinor: string;
    forecastMinor: string;
    availableMinor: string;
    overspentMinor: string;
    usagePercent: string | null;
    formula: string;
    transactionRoute: '/transactions';
  };
}

export function createBudgetsFixture(scenario: BudgetScenario = 'populated'): BudgetsFixture {
  let alerted = false;
  const all = fixtureItems();
  const visible = () => all.filter((item) => item.status === 'active');
  return {
    scenario,
    list: () => ({
      items:
        scenario === 'archived_paused' ? all.filter((item) => item.status !== 'active') : visible(),
      state: scenario,
    }),
    filterStatus: (status) => ({
      items: all.filter((item) => item.status === status),
      state: scenario,
    }),
    copyPrevious: () => ({ kind: 'copied', name: `${defaultDraft.name} (salinan)` }),
    pause: (id) => ({ kind: 'paused', id }),
    archive: (id, confirmed) => ({ kind: confirmed ? 'archived' : 'cancelled', id }),
    restore: (id) => ({ kind: 'restored', id }),
    preview: () => ({
      firstPeriod: '1–31 Agustus 2026',
      rolloverSimulation: 'Saldo positif dipindahkan ke periode berikutnya.',
    }),
    moveAllocation: (_from, _to, value, adjustment) => ({
      kind: value === adjustment ? 'applied' : 'invalid',
      zeroSum: value === adjustment,
    }),
    businessRules: () => ({
      transferSpending: '0',
      linkedRefundReducesActual: true,
      linkedRefundIncome: false,
      unmatchedRecurringForecast: '50000',
      missingFxCount: 1,
      missingFxFallback: false,
    }),
    alert: (id, threshold) => {
      if (alerted) return { kind: 'deduped', id, threshold };
      alerted = true;
      return { kind: 'alerted', id, threshold };
    },
    rolloverStatus: () =>
      scenario === 'rollover_maintenance'
        ? {
            kind: 'maintenance',
            message: 'Rollover sedang maintenance; preview terakhir tetap terlihat.',
          }
        : { kind: 'ready', message: 'Rollover siap disimulasikan.' },
    save: (draft) => {
      const errors = validateBudgetDraft(draft);
      if (errors.length) return { kind: 'invalid', errors };
      if (scenario === 'offline') return { kind: 'queued', syncStatus: 'queued', name: draft.name };
      if (scenario === 'conflict')
        return { kind: 'conflict_copy', name: `${draft.name} (salinan)` };
      return { kind: 'saved', syncStatus: 'local_fixture', name: draft.name };
    },
    readOnly: () => ({
      kind: 'read_only',
      reason: 'Akses berubah; budget ini hanya dapat dibaca.',
    }),
    validation: () => ({
      kind: 'too_many_lines',
      message: 'Budget memiliki terlalu banyak line untuk fixture ini.',
    }),
    recompute: () => ({
      kind: 'preview_only',
      message: 'Perubahan backdated hanya ditampilkan sebagai preview recompute.',
    }),
    detail: () => {
      const metrics = calculateBudgetLine({
        baseAllocationMinor: '1500000',
        adjustmentMinor: '0',
        rolloverMinor: '0',
        actualSpentMinor: '1035000',
        committedMinor: '100000',
        forecastMinor: '50000',
      });
      return {
        plannedMinor: metrics.plannedMinor,
        actualMinor: metrics.actualSpentMinor,
        committedMinor: metrics.committedMinor,
        forecastMinor: metrics.forecastMinor,
        availableMinor: metrics.availableAfterCommittedMinor,
        overspentMinor: metrics.overspentMinor,
        usagePercent: metrics.usagePercent,
        formula: 'available = planned - actual - committed; forecast hanya proyeksi',
        transactionRoute: '/transactions',
      };
    },
  };
}
