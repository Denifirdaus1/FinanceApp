import { formatMoney } from '@financeapp/ui';

export const FORECAST_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  maximumContentWidth: 720,
} as const;

export type ForecastScenario =
  | 'populated'
  | 'loading'
  | 'empty'
  | 'offline'
  | 'stale'
  | 'partial_fx'
  | 'orphan'
  | 'conflict'
  | 'recomputing'
  | 'unauthorized'
  | 'kill_switch'
  | 'no_projected'
  | 'overdue'
  | 'invalid';

export type ForecastView = 'calendar' | 'agenda' | 'forecast' | 'scenario';
export type ForecastEventType =
  'actual' | 'pending' | 'recurring' | 'transfer' | 'debt_due' | 'goal_boundary' | 'overdue';

export type ForecastEvent = {
  eventKey: string;
  type: ForecastEventType;
  classification: 'actual' | 'projected' | 'informational';
  applied: boolean;
  signedMinor: string;
  consolidatedDelta: string;
  suppressedBy?: string;
};

export type ScenarioOverride = {
  sourceEventKey: string;
  date: string;
  amountMinor: string;
};

export type ScenarioDraft = {
  name: string;
  horizonDays: number;
  accountIds: string[];
  includePending: boolean;
  includeRecurring: boolean;
  includeGoalPlans: boolean;
  includeDebtSchedule: boolean;
  includeOverdueAsToday: boolean;
  overrides: ScenarioOverride[];
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string): Date | null {
  if (!datePattern.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export function isValidHorizon(days: number): boolean {
  return Number.isInteger(days) && days >= 1 && days <= 366;
}

export function generateMonthGrid(year: number, monthIndex: number, weekStart = 1): string[] {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const day = first.getUTCDay();
  const offset = (day - weekStart + 7) % 7;
  const start = new Date(Date.UTC(year, monthIndex, 1 - offset));
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export function formatForecastMoney(value: string, currency = 'IDR'): string {
  return formatMoney(BigInt(value), currency);
}

export function validateScenario(draft: ScenarioDraft): string[] {
  const errors: string[] = [];
  if (draft.name.trim().length === 0 || draft.name.trim().length > 80)
    errors.push('Nama scenario wajib diisi.');
  if (!isValidHorizon(draft.horizonDays)) errors.push('Horizon maksimal 366 hari.');
  for (const override of draft.overrides) {
    if (!parseDate(override.date)) errors.push('Tanggal override tidak valid.');
    if (!/^(0|[1-9]\d*)$/.test(override.amountMinor))
      errors.push('Nominal override harus minor unit canonical.');
  }
  return errors;
}

export function applyForecastEvents(
  startingMinor: string,
  events: { signedMinor: string; applied: boolean }[],
): string {
  return events
    .reduce(
      (balance, event) => (event.applied ? balance + BigInt(event.signedMinor) : balance),
      BigInt(startingMinor),
    )
    .toString();
}

function baseEvents(scenario: ForecastScenario): ForecastEvent[] {
  if (scenario === 'empty' || scenario === 'loading') return [];
  return [
    {
      eventKey: 'event-actual',
      type: 'actual',
      classification: 'actual',
      applied: true,
      signedMinor: '-100000',
      consolidatedDelta: '-100000',
    },
    {
      eventKey: 'event-pending',
      type: 'pending',
      classification: 'projected',
      applied: true,
      signedMinor: '500000',
      consolidatedDelta: '500000',
    },
    {
      eventKey: 'event-transfer',
      type: 'transfer',
      classification: 'projected',
      applied: true,
      signedMinor: '0',
      consolidatedDelta: '0',
    },
    {
      eventKey: 'event-recurring',
      type: 'recurring',
      classification: 'projected',
      applied: false,
      signedMinor: '-200000',
      consolidatedDelta: '0',
      suppressedBy: 'transaction-fixture',
    },
    {
      eventKey: 'event-debt',
      type: 'debt_due',
      classification: 'projected',
      applied: false,
      signedMinor: '-300000',
      consolidatedDelta: '0',
      suppressedBy: 'recurring-fixture',
    },
    {
      eventKey: 'event-goal',
      type: 'goal_boundary',
      classification: 'informational',
      applied: false,
      signedMinor: '0',
      consolidatedDelta: '0',
    },
    {
      eventKey: 'event-overdue',
      type: 'overdue',
      classification: 'projected',
      applied: scenario === 'overdue' ? false : false,
      signedMinor: '-150000',
      consolidatedDelta: '0',
    },
  ];
}

export function createForecastFixture(scenario: ForecastScenario = 'populated') {
  let draft: ScenarioDraft | null = null;
  return {
    scenario,
    events: () => baseEvents(scenario),
    curves: () => ({
      perAccount: [
        {
          accountLabel: 'Akun fixture',
          points: [{ date: '2026-08-28', closingMinor: '1000000', status: 'complete' as const }],
        },
      ],
      consolidated: [
        {
          date: '2026-08-28',
          closingMinor: scenario === 'partial_fx' ? null : '1000000',
          status: scenario === 'partial_fx' ? ('partial' as const) : ('complete' as const),
        },
      ],
      formulaVersion: 'fixture-v1',
    }),
    disclosure: () => ({
      asOf: '2026-08-28',
      timezone: 'Asia/Jakarta',
      coverage: 'fixture-local',
      formulaVersion: 'fixture-v1',
      baseCurrency: 'IDR',
    }),
    lowBalance: () => ({
      marker: 'neutral' as const,
      dedupeKey: 'fixture-account|2026-08-28|fixture-v1',
    }),
    createScenario: (value: ScenarioDraft) => {
      const errors = validateScenario(value);
      if (errors.length) return { status: 'invalid' as const, errors };
      if (scenario === 'offline')
        return { status: 'queued' as const, copy: 'Scenario queued sebagai fixture.' };
      if (scenario === 'conflict')
        return {
          status: 'needs_re_review' as const,
          copy: 'Scenario conflict perlu ditinjau ulang.',
        };
      if (scenario === 'unauthorized')
        return { status: 'unauthorized' as const, copy: 'Scenario tidak berwenang.' };
      draft = { ...value, overrides: [...value.overrides] };
      return { status: 'saved_fixture' as const, draft };
    },
    override: (_scenario: unknown, override: ScenarioOverride) => {
      if (draft) draft.overrides = [...draft.overrides, override];
      return { status: 'saved_fixture' as const, actualChanged: false, override };
    },
    reset: (_scenario: unknown) => ({
      overrides: [] as ScenarioOverride[],
      baseDataChanged: false,
    }),
    drag: (eventKey: string) =>
      eventKey === 'event-actual'
        ? { status: 'rejected_actual' as const }
        : { status: 'scenario_override' as const },
    retry: () =>
      scenario === 'recomputing' ? { kind: 'recomputed' as const } : { kind: 'refreshed' as const },
    killSwitch: () => ({
      calendarAvailable: true,
      forecastAvailable: false,
      scenarioAvailable: false,
    }),
    filter: (filters: Record<string, unknown>) => ({
      filters,
      appliedAtomically: true,
      activeCount: Object.values(filters).filter(Boolean).length,
    }),
    drillDown: () => ({ route: '/transactions' as const, safe: true }),
  };
}
