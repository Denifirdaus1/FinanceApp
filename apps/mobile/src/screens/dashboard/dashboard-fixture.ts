import { formatMoney } from '@financeapp/ui';

export const DASHBOARD_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  maximumContentWidth: 720,
} as const;

export type DashboardScenario =
  | 'populated'
  | 'loading'
  | 'empty'
  | 'offline'
  | 'stale'
  | 'partial'
  | 'missing_fx'
  | 'permission_denied'
  | 'session_expired';

export type DashboardPeriod = 'today' | 'week' | 'month';
export type DashboardSectionId = 'budget' | 'bills' | 'goals' | 'net_worth' | 'activity' | 'review';
export type DashboardQuickAction = 'manual' | 'receipt' | 'voice' | 'transfer';

export interface DashboardCards {
  availableBalanceMinor: string | null;
  incomeTodayMinor: string | null;
  expenseTodayMinor: string | null;
  cashflowMtdMinor: string | null;
  currency: 'IDR';
}

export interface DashboardSection {
  id: DashboardSectionId;
  title: string;
  summary: string;
  state: 'ready' | 'empty' | 'failed';
}

export interface DashboardSnapshot {
  state: DashboardScenario;
  period: DashboardPeriod;
  asOf: string | null;
  cards: DashboardCards;
  sections: DashboardSection[];
  fx: {
    missingCount: number;
    incompleteCurrencies: string[];
    usedOneToOneFallback: false;
  };
}

export interface DashboardFixture {
  snapshot: DashboardSnapshot;
  switchPeriod: (period: DashboardPeriod) => { period: DashboardPeriod };
  togglePrivacy: () => { privacyMode: boolean };
  maskMoney: (value: string) => '••••';
  refresh: () => { kind: 'refreshed'; asOf: string };
  retry: (section: DashboardSectionId) => {
    kind: 'recovered';
    section: DashboardSectionId;
  };
  quickAction: (action: DashboardQuickAction) => {
    route: '/capture' | '/receipt-capture' | '/voice-capture' | '/transfers';
  };
  recovery: () =>
    | { kind: 'read_only'; reason: 'permission_denied' }
    | { kind: 'login_required'; clearsSensitiveView: true };
  leave: () => { kind: 'safe_back'; draftPreserved: true };
}

const BASE_CARDS: DashboardCards = {
  availableBalanceMinor: '1500000',
  incomeTodayMinor: '750000',
  expenseTodayMinor: '125000',
  cashflowMtdMinor: '625000',
  currency: 'IDR',
};

const SECTION_DEFINITIONS: DashboardSection[] = [
  { id: 'budget', title: 'Ringkasan budget', summary: 'Terpakai dan tersisa', state: 'ready' },
  { id: 'bills', title: 'Tagihan 7 hari', summary: '2 tagihan mendatang', state: 'ready' },
  { id: 'goals', title: 'Goal aktif', summary: 'Maksimal 3 goal ditampilkan', state: 'ready' },
  {
    id: 'net_worth',
    title: 'Tren net worth',
    summary: 'Dibanding akhir bulan lalu',
    state: 'ready',
  },
  {
    id: 'activity',
    title: 'Aktivitas terbaru',
    summary: 'Aktivitas fixture terbaru',
    state: 'ready',
  },
  { id: 'review', title: 'Perlu ditinjau', summary: 'Tidak ada detail sensitif', state: 'ready' },
];

function createSnapshot(scenario: DashboardScenario): DashboardSnapshot {
  const cards =
    scenario === 'loading'
      ? {
          ...BASE_CARDS,
          availableBalanceMinor: null,
          incomeTodayMinor: null,
          expenseTodayMinor: null,
          cashflowMtdMinor: null,
        }
      : { ...BASE_CARDS };
  const sections = SECTION_DEFINITIONS.map((section) => ({ ...section }));

  if (scenario === 'empty') {
    return {
      state: scenario,
      period: 'today',
      asOf: null,
      cards: {
        ...cards,
        availableBalanceMinor: null,
        incomeTodayMinor: null,
        expenseTodayMinor: null,
        cashflowMtdMinor: null,
      },
      sections: sections.map((section) => ({
        ...section,
        state: section.id === 'budget' || section.id === 'goals' ? 'empty' : section.state,
      })),
      fx: { missingCount: 0, incompleteCurrencies: [], usedOneToOneFallback: false },
    };
  }

  if (scenario === 'partial') {
    sections[0] = { ...sections[0]!, state: 'failed' };
  }

  if (scenario === 'missing_fx') {
    return {
      state: scenario,
      period: 'today',
      asOf: '2026-08-27T09:00:00+07:00',
      cards: { ...cards, cashflowMtdMinor: '250000' },
      sections,
      fx: { missingCount: 1, incompleteCurrencies: ['JPY'], usedOneToOneFallback: false },
    };
  }

  return {
    state: scenario,
    period: 'today',
    asOf: scenario === 'loading' ? null : '2026-08-27T09:00:00+07:00',
    cards,
    sections,
    fx: { missingCount: 0, incompleteCurrencies: [], usedOneToOneFallback: false },
  };
}

export function formatDashboardMoney(
  minor: string,
  currency: 'IDR' = 'IDR',
  locale = 'id-ID',
): string | null {
  if (!/^\d+$/.test(minor)) return null;
  try {
    return formatMoney(BigInt(minor), currency, locale);
  } catch {
    return null;
  }
}

export function createDashboardFixture(
  scenario: DashboardScenario = 'populated',
): DashboardFixture {
  const snapshot = createSnapshot(scenario);
  const retryResults = new Map<
    DashboardSectionId,
    { kind: 'recovered'; section: DashboardSectionId }
  >();
  let privacyMode = false;

  return {
    snapshot,
    switchPeriod: (period) => ({ period }),
    togglePrivacy: () => {
      privacyMode = !privacyMode;
      return { privacyMode };
    },
    maskMoney: () => '••••',
    refresh: () => ({ kind: 'refreshed', asOf: '2026-08-27T09:05:00+07:00' }),
    retry: (section) => {
      const existing = retryResults.get(section);
      if (existing) return existing;
      const result = { kind: 'recovered' as const, section };
      retryResults.set(section, result);
      return result;
    },
    quickAction: (action) =>
      (
        ({
          manual: { route: '/capture' },
          receipt: { route: '/receipt-capture' },
          voice: { route: '/voice-capture' },
          transfer: { route: '/transfers' },
        }) as const
      )[action],
    recovery: () =>
      scenario === 'session_expired'
        ? { kind: 'login_required', clearsSensitiveView: true }
        : { kind: 'read_only', reason: 'permission_denied' },
    leave: () => ({ kind: 'safe_back', draftPreserved: true }),
  };
}

export function dashboardStateLabel(snapshot: DashboardSnapshot): string {
  switch (snapshot.state) {
    case 'loading':
      return 'Memuat ringkasan tanpa angka palsu.';
    case 'offline':
      return `Offline · cache lokal terakhir ${snapshot.asOf ?? 'belum tersedia'}.`;
    case 'stale':
      return `Data terakhir diperbarui ${snapshot.asOf ?? 'belum tersedia'}.`;
    case 'partial':
      return 'Bagian ini perlu dicoba lagi; kartu valid tetap tersedia.';
    case 'missing_fx':
      return 'Sebagian transaksi belum memiliki kurs dan tidak dihitung sebagai 1:1.';
    case 'empty':
      return 'Belum ada ringkasan fixture.';
    case 'permission_denied':
      return 'Akses ringkasan terbatas; tampilkan hanya keadaan aman.';
    case 'session_expired':
      return 'Sesi berakhir; nominal dikunci sampai login ulang.';
    default:
      return 'Data dashboard fixture siap.';
  }
}
