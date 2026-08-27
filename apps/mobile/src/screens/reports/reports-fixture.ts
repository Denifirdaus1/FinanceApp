import { formatMoney } from '@financeapp/ui';

export const REPORTS_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  maximumContentWidth: 720,
} as const;

export type ReportsScenario =
  | 'populated'
  | 'loading'
  | 'empty'
  | 'offline'
  | 'stale'
  | 'coverage_gap'
  | 'partial_fx'
  | 'partial'
  | 'invalid_preset'
  | 'too_large'
  | 'permission_denied'
  | 'kill_switch'
  | 'export_failure';

export type ReportTab = 'cashflow' | 'net_worth';
export type ReportRange =
  'this_week' | 'this_month' | 'last_month' | 'year_to_date' | 'last_12_months' | 'custom';
export type ReportGranularity = 'day' | 'week' | 'month';
export type ReportSection = 'category' | 'merchant' | 'account' | 'net_worth';

export interface ReportFilterDraft {
  accountIds: string[];
  categoryIds: string[];
  tagIds: string[];
  entryTypes: string[];
  lifecycleStatuses: string[];
  clearingStatuses: string[];
  currencies: string[];
  includeRefunds: boolean;
}

export interface CashflowSummary {
  grossIncomeMinor: string;
  grossExpenseMinor: string;
  refundsMinor: string;
  netExpenseMinor: string;
  netCashflowMinor: string;
  committedExpenseMinor: string;
  internalTransferExcluded: true;
}

export interface NetWorthSummary {
  assetsMinor: string;
  liabilitiesMinor: string;
  netWorthMinor: string;
  absoluteChangeMinor: string;
  percentageChange: string | null;
}

export interface ReportsSnapshot {
  state: ReportsScenario;
  tab: ReportTab;
  range: ReportRange;
  granularity: ReportGranularity;
  timezone: 'Asia/Jakarta';
  asOf: string | null;
  activeFilters: ReportFilterDraft;
  committedVisible: boolean;
  comparison: { enabled: boolean; label: string; sameLength: true };
  cashflow: CashflowSummary;
  netWorth: NetWorthSummary;
  chart: { table: { label: string; valueMinor: string }[] };
  methodology: {
    actual: string;
    committed: string;
    refund: string;
    transfer: string;
    asOf: string;
    coverage: string;
    baseCurrency: 'IDR';
  };
  fx: { missingCount: number; incompleteCurrencies: string[]; partial: boolean };
}

export interface ReportsFixture {
  snapshot: ReportsSnapshot;
  setRange: (range: ReportRange) => { range: ReportRange };
  toggleTab: (tab: ReportTab) => { tab: ReportTab; granularity: ReportGranularity };
  toggleComparison: (enabled: boolean) => {
    enabled: boolean;
    comparisonLabel: string;
    sameLength: true;
  };
  applyFilters: (filters: ReportFilterDraft) => { changed: true; filterCount: number };
  cancelFilters: () => { changed: false; filters: ReportFilterDraft };
  toggleCommitted: (visible: boolean) => { committedVisible: boolean };
  accountMovement: (accountId: string) => { visible: true; headlineIncluded: false };
  zeroBaselineChange: () => { absoluteMinor: string; percentage: null };
  drillDown: (section: ReportSection) => {
    route: '/transactions';
    preservesFilters: true;
    section: ReportSection;
  };
  retry: (section: ReportSection) => { kind: 'recovered'; section: ReportSection };
  refresh: () => { kind: 'refreshed'; asOf: string };
  savePreset: (
    name: string,
  ) => { kind: 'saved'; name: string } | { kind: 'invalid'; reason: string };
  renamePreset: (name: string) => { kind: 'renamed'; name: string };
  deletePreset: () => { kind: 'deleted' };
  loadPreset: (
    name: string,
  ) => { kind: 'invalid_fallback'; offeredDelete: true } | { kind: 'loaded'; name: string };
  exportPreview: () => {
    kind: 'preview';
    columns: string[];
    rowCountBucket: '1-10';
    privacyWarning: string;
    formulaInjectionProtected: true;
  };
  confirmExport: (
    confirmed: boolean,
  ) =>
    | { kind: 'cancelled'; cleaned: true }
    | { kind: 'exported_fixture'; cleaned: true }
    | { kind: 'failed'; cleaned: true };
  retryExport: () => { kind: 'exported_fixture'; cleaned: true };
  maskMoney: (value: string) => '••••';
}

const EMPTY_FILTERS: ReportFilterDraft = {
  accountIds: [],
  categoryIds: [],
  tagIds: [],
  entryTypes: [],
  lifecycleStatuses: [],
  clearingStatuses: [],
  currencies: [],
  includeRefunds: true,
};

const BASE_CASHFLOW: CashflowSummary = {
  grossIncomeMinor: '1000000',
  grossExpenseMinor: '400000',
  refundsMinor: '50000',
  netExpenseMinor: '350000',
  netCashflowMinor: '650000',
  committedExpenseMinor: '75000',
  internalTransferExcluded: true,
};

const BASE_NET_WORTH: NetWorthSummary = {
  assetsMinor: '2000000',
  liabilitiesMinor: '500000',
  netWorthMinor: '1500000',
  absoluteChangeMinor: '500000',
  percentageChange: null,
};

function cloneFilters(filters: ReportFilterDraft): ReportFilterDraft {
  return {
    ...filters,
    accountIds: [...filters.accountIds],
    categoryIds: [...filters.categoryIds],
    tagIds: [...filters.tagIds],
    entryTypes: [...filters.entryTypes],
    lifecycleStatuses: [...filters.lifecycleStatuses],
    clearingStatuses: [...filters.clearingStatuses],
    currencies: [...filters.currencies],
  };
}

function createSnapshot(scenario: ReportsScenario): ReportsSnapshot {
  const loading = scenario === 'loading';
  return {
    state: scenario,
    tab: 'cashflow',
    range: 'this_month',
    granularity: 'week',
    timezone: 'Asia/Jakarta',
    asOf: loading ? null : '2026-08-27T09:00:00+07:00',
    activeFilters: cloneFilters(EMPTY_FILTERS),
    committedVisible: false,
    comparison: {
      enabled: false,
      label: 'Periode sebelumnya dengan panjang sama',
      sameLength: true,
    },
    cashflow: loading
      ? {
          ...BASE_CASHFLOW,
          grossIncomeMinor: '',
          grossExpenseMinor: '',
          refundsMinor: '',
          netExpenseMinor: '',
          netCashflowMinor: '',
        }
      : { ...BASE_CASHFLOW },
    netWorth: loading
      ? { ...BASE_NET_WORTH, assetsMinor: '', liabilitiesMinor: '', netWorthMinor: '' }
      : { ...BASE_NET_WORTH },
    chart: {
      table: loading
        ? []
        : [
            { label: 'Awal periode', valueMinor: '350000' },
            { label: 'Akhir periode', valueMinor: '650000' },
          ],
    },
    methodology: {
      actual: 'Posted dan cleared/reconciled dalam rentang.',
      committed: 'Pending ditampilkan terpisah saat diaktifkan.',
      refund: 'Refund dipisahkan dari earned income dan mengurangi net expense.',
      transfer: 'Transfer internal dikecualikan dari consolidated cashflow.',
      asOf: '2026-08-27T09:00:00+07:00 Asia/Jakarta',
      coverage:
        scenario === 'coverage_gap'
          ? 'Coverage gap pada rentang yang belum tersinkron.'
          : 'Coverage fixture lengkap.',
      baseCurrency: 'IDR',
    },
    fx:
      scenario === 'partial_fx'
        ? { missingCount: 1, incompleteCurrencies: ['JPY'], partial: true }
        : { missingCount: 0, incompleteCurrencies: [], partial: false },
  };
}

export function formatReportMoney(
  minor: string,
  currency: 'IDR' = 'IDR',
  locale = 'id-ID',
): string | null {
  if (!/^-?\d+$/.test(minor)) return null;
  try {
    return formatMoney(BigInt(minor), currency, locale);
  } catch {
    return null;
  }
}

export function sanitizeCsvCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export function calculateCashflow(input: {
  incomeMinor: string;
  expenseMinor: string;
  refundMinor: string;
  otherIncomeMinor?: string;
}): CashflowSummary {
  const income = BigInt(input.incomeMinor);
  const expense = BigInt(input.expenseMinor);
  const refund = BigInt(input.refundMinor);
  const otherIncome = BigInt(input.otherIncomeMinor ?? '0');
  const netExpense = expense > refund ? expense - refund : 0n;
  return {
    grossIncomeMinor: income.toString(),
    grossExpenseMinor: expense.toString(),
    refundsMinor: refund.toString(),
    netExpenseMinor: netExpense.toString(),
    netCashflowMinor: (income + otherIncome + refund - expense).toString(),
    committedExpenseMinor: '0',
    internalTransferExcluded: true,
  };
}

export function calculateNetWorth(input: {
  assetsMinor: string;
  liabilitiesMinor: string;
  startingMinor: string;
}): NetWorthSummary {
  const assets = BigInt(input.assetsMinor);
  const liabilities = BigInt(input.liabilitiesMinor);
  const starting = BigInt(input.startingMinor);
  const netWorth = assets - liabilities;
  const absolute = netWorth - starting;
  return {
    assetsMinor: assets.toString(),
    liabilitiesMinor: liabilities.toString(),
    netWorthMinor: netWorth.toString(),
    absoluteChangeMinor: absolute.toString(),
    percentageChange:
      starting === 0n ? null : `${(absolute * 10000n) / (starting < 0n ? -starting : starting)}`,
  };
}

export function validateCustomReportRange(
  start: string,
  end: string,
): 'valid' | 'invalid' | 'too_large' {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate)
    return 'invalid';
  const span = endDate.getTime() - startDate.getTime();
  return span > 3660 * 24 * 60 * 60 * 1000 ? 'too_large' : 'valid';
}

export function reportsStateLabel(snapshot: ReportsSnapshot): string {
  switch (snapshot.state) {
    case 'loading':
      return 'Memuat laporan tanpa angka palsu.';
    case 'empty':
      return 'Belum ada transaksi untuk rentang ini.';
    case 'offline':
      return `Offline · cache terakhir ${snapshot.asOf ?? 'belum tersedia'}.`;
    case 'stale':
      return `Coverage stale · data terakhir ${snapshot.asOf ?? 'belum tersedia'}.`;
    case 'coverage_gap':
      return 'Ada rentang belum tersinkron; titik ini diberi tanda coverage gap.';
    case 'partial_fx':
      return 'Sebagian transaksi belum memiliki kurs; total parsial dipertahankan.';
    case 'partial':
      return 'Bagian ini perlu dicoba lagi; kartu valid tetap aktif.';
    case 'invalid_preset':
      return 'Preset tidak dapat digunakan; default ditawarkan.';
    case 'too_large':
      return 'Rentang terlalu besar; persempit rentang fixture.';
    case 'permission_denied':
      return 'Akses laporan terbatas; tampilkan keadaan aman.';
    case 'kill_switch':
      return 'Reports local-only karena kill-switch fixture.';
    case 'export_failure':
      return 'Export fixture gagal; temporary result dibersihkan.';
    default:
      return 'Laporan fixture siap.';
  }
}

export function createReportsFixture(scenario: ReportsScenario = 'populated'): ReportsFixture {
  const snapshot = createSnapshot(scenario);
  const retryResults = new Map<ReportSection, { kind: 'recovered'; section: ReportSection }>();
  let presetName = '';

  return {
    snapshot,
    setRange: (range) => ({ range }),
    toggleTab: (tab) => ({ tab, granularity: tab === 'net_worth' ? 'month' : 'week' }),
    toggleComparison: (enabled) => ({
      enabled,
      comparisonLabel: 'Periode sebelumnya dengan panjang sama',
      sameLength: true,
    }),
    applyFilters: (filters) => {
      snapshot.activeFilters = cloneFilters(filters);
      const count =
        filters.accountIds.length +
        filters.categoryIds.length +
        filters.tagIds.length +
        filters.entryTypes.length +
        filters.lifecycleStatuses.length +
        filters.clearingStatuses.length +
        filters.currencies.length;
      return { changed: true, filterCount: count };
    },
    cancelFilters: () => ({ changed: false, filters: cloneFilters(snapshot.activeFilters) }),
    toggleCommitted: (visible) => {
      snapshot.committedVisible = visible;
      return { committedVisible: visible };
    },
    accountMovement: () => ({ visible: true, headlineIncluded: false }),
    zeroBaselineChange: () => ({ absoluteMinor: '500000', percentage: null }),
    drillDown: (section) => ({ route: '/transactions', preservesFilters: true, section }),
    retry: (section) => {
      const existing = retryResults.get(section);
      if (existing) return existing;
      const result = { kind: 'recovered' as const, section };
      retryResults.set(section, result);
      return result;
    },
    refresh: () => ({ kind: 'refreshed', asOf: '2026-08-27T09:05:00+07:00' }),
    savePreset: (name) => {
      const normalized = name.trim();
      if (normalized.length < 1 || normalized.length > 60)
        return { kind: 'invalid', reason: 'Nama preset 1–60 karakter.' };
      presetName = normalized;
      return { kind: 'saved', name: normalized };
    },
    renamePreset: (name) => {
      presetName = name.trim();
      return { kind: 'renamed', name: presetName };
    },
    deletePreset: () => {
      presetName = '';
      return { kind: 'deleted' };
    },
    loadPreset: (name) =>
      name === 'legacy'
        ? { kind: 'invalid_fallback', offeredDelete: true }
        : { kind: 'loaded', name },
    exportPreview: () => ({
      kind: 'preview',
      columns: ['period_bucket', 'report_type', 'row_count_bucket'],
      rowCountBucket: '1-10',
      privacyWarning: 'File preview tidak terenkripsi setelah dibagikan.',
      formulaInjectionProtected: true,
    }),
    confirmExport: (confirmed) => {
      if (!confirmed) return { kind: 'cancelled', cleaned: true };
      return scenario === 'export_failure'
        ? { kind: 'failed', cleaned: true }
        : { kind: 'exported_fixture', cleaned: true };
    },
    retryExport: () => ({ kind: 'exported_fixture', cleaned: true }),
    maskMoney: () => '••••',
  };
}
