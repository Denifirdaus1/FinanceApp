import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import { ThemeProvider } from '../../../app/providers/theme-provider';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { ForecastWireframe } from '../forecast-wireframe';
import {
  FORECAST_LAYOUT,
  applyForecastEvents,
  createForecastFixture,
  formatForecastMoney,
  generateMonthGrid,
  isValidHorizon,
  validateScenario,
  type ForecastScenario,
  type ScenarioDraft,
} from '../forecast-fixture';

jest.setTimeout(30000);

const validScenario: ScenarioDraft = {
  name: 'Rencana bulan depan',
  horizonDays: 30,
  accountIds: ['account-cash-fixture'],
  includePending: true,
  includeRecurring: true,
  includeGoalPlans: true,
  includeDebtSchedule: true,
  includeOverdueAsToday: false,
  overrides: [],
};

function renderForecast(scenario?: ForecastScenario) {
  return render(
    <ThemeProvider reducedMotion>
      <ForecastWireframe fixture={createForecastFixture(scenario)} />
    </ThemeProvider>,
  );
}

describe('U18 F15 calendar and forecast wireframe', () => {
  it('connects F15 to the authenticated Planning route and manifest', async () => {
    defaultSessionAdapter.setSignedIn();
    expect(ROUTE_MANIFEST.find((route) => route.featureId === 'F15')).toMatchObject({
      routeId: 'forecast',
      path: '/planning/forecast',
      navigationGroup: 'planning',
      readiness: 'WIREFRAME READY',
    });
    renderRouter('app', { initialUrl: '/planning/forecast' });
    expect(await routerScreen.findByText('Calendar & Forecast (fixture)')).toBeTruthy();
  });

  it('validates horizons, month boundaries, timezone-safe dates, and integer money', () => {
    expect(isValidHorizon(7)).toBe(true);
    expect(isValidHorizon(30)).toBe(true);
    expect(isValidHorizon(90)).toBe(true);
    expect(isValidHorizon(365)).toBe(true);
    expect(isValidHorizon(366)).toBe(true);
    expect(isValidHorizon(367)).toBe(false);
    expect(isValidHorizon(0)).toBe(false);
    expect(generateMonthGrid(2028, 1, 1)).toContain('2028-02-29');
    expect(generateMonthGrid(2026, 1, 1)).not.toContain('2026-02-29');
    expect(generateMonthGrid(2026, 0, 1)[0]).toMatch(/^2025-12-/);
    expect(formatForecastMoney('1000000', 'IDR')).toContain('1.000.000');
    expect(validateScenario(validScenario)).toEqual([]);
    expect(validateScenario({ ...validScenario, name: '' })).toContain(
      'Nama scenario wajib diisi.',
    );
    expect(validateScenario({ ...validScenario, horizonDays: 367 })).toContain(
      'Horizon maksimal 366 hari.',
    );
  });

  it('applies event provenance, source priority, transfer consolidation, and partial FX safely', () => {
    const fixture = createForecastFixture();
    const events = fixture.events();
    expect(events.filter((event) => event.applied)).toHaveLength(3);
    expect(events.find((event) => event.type === 'transfer')?.consolidatedDelta).toBe('0');
    expect(events.find((event) => event.type === 'recurring')?.suppressedBy).toBe(
      'transaction-fixture',
    );
    expect(events.find((event) => event.type === 'goal_boundary')?.applied).toBe(false);
    expect(fixture.curves()).toMatchObject({
      perAccount: expect.any(Array),
      consolidated: expect.any(Array),
      formulaVersion: 'fixture-v1',
    });
    expect(fixture.curves().consolidated.some((point) => point.status === 'partial')).toBe(false);
    expect(createForecastFixture('partial_fx').curves().consolidated[0]).toMatchObject({
      status: 'partial',
    });
    expect(
      applyForecastEvents('1000000', [
        { signedMinor: '-200000', applied: true },
        { signedMinor: '500000', applied: true },
      ]),
    ).toBe('1300000');
    expect(fixture.disclosure()).toMatchObject({
      asOf: '2026-08-28',
      timezone: 'Asia/Jakarta',
      coverage: 'fixture-local',
    });
  });

  it('keeps pending, recurring, debt, goal, overdue, and duplicate suppression explicit', () => {
    const fixture = createForecastFixture('overdue');
    expect(fixture.events().find((event) => event.type === 'overdue')?.applied).toBe(false);
    expect(fixture.events().find((event) => event.type === 'pending')?.classification).toBe(
      'projected',
    );
    expect(fixture.events().find((event) => event.type === 'debt_due')?.suppressedBy).toBe(
      'recurring-fixture',
    );
    expect(
      fixture.events().filter((event) => event.type === 'recurring' && event.suppressedBy),
    ).toHaveLength(1);
    expect(fixture.lowBalance()).toMatchObject({
      marker: 'neutral',
      dedupeKey: expect.any(String),
    });
  });

  it('supports scenario validation, toggles, overrides, reset, and safe retry without base mutation', () => {
    const fixture = createForecastFixture();
    const scenario = fixture.createScenario(validScenario);
    expect(scenario.status).toBe('saved_fixture');
    const override = fixture.override(scenario, {
      sourceEventKey: 'event-projected',
      date: '2026-09-01',
      amountMinor: '250000',
    });
    expect(override.actualChanged).toBe(false);
    expect(fixture.reset(scenario).overrides).toEqual([]);
    expect(fixture.drag('event-actual')).toMatchObject({ status: 'rejected_actual' });
    expect(fixture.drag('event-projected')).toMatchObject({ status: 'scenario_override' });
    expect(createForecastFixture('offline').createScenario(validScenario)).toMatchObject({
      status: 'queued',
    });
    expect(createForecastFixture('conflict').createScenario(validScenario)).toMatchObject({
      status: 'needs_re_review',
    });
    expect(createForecastFixture('unauthorized').createScenario(validScenario)).toMatchObject({
      status: 'unauthorized',
    });
    expect(createForecastFixture('recomputing').retry()).toMatchObject({ kind: 'recomputed' });
    expect(fixture.killSwitch()).toMatchObject({
      calendarAvailable: true,
      forecastAvailable: false,
    });
  });

  it('rejects malformed overrides and applies filters atomically', () => {
    expect(
      validateScenario({
        ...validScenario,
        overrides: [{ sourceEventKey: 'event-projected', date: '2026-02-30', amountMinor: '01' }],
      }),
    ).toEqual(['Tanggal override tidak valid.', 'Nominal override harus minor unit canonical.']);
    expect(validateScenario({ ...validScenario, name: 'x'.repeat(81) })).toContain(
      'Nama scenario wajib diisi.',
    );
    expect(isValidHorizon(1.5)).toBe(false);
    expect(createForecastFixture('empty').events()).toEqual([]);
    expect(createForecastFixture('loading').events()).toEqual([]);
    const fixture = createForecastFixture();
    expect(
      fixture.override(
        {},
        { sourceEventKey: 'event-projected', date: '2026-09-01', amountMinor: '1' },
      ),
    ).toMatchObject({ actualChanged: false });
    expect(fixture.filter({ account: true, category: false, projected: true })).toMatchObject({
      activeCount: 2,
      appliedAtomically: true,
    });
    expect(fixture.drillDown()).toMatchObject({ route: '/transactions', safe: true });
    expect(createForecastFixture().retry()).toMatchObject({ kind: 'refreshed' });
  });

  it.each([
    ['loading', /Memuat kalender/],
    ['empty', /Belum ada event/],
    ['offline', /Offline/],
    ['stale', /stale/],
    ['partial_fx', /FX belum tersedia/],
    ['orphan', /orphan/],
    ['conflict', /konflik/],
    ['recomputing', /recomputing/],
    ['unauthorized', /tidak berwenang/],
    ['kill_switch', /maintenance/],
    ['no_projected', /saldo datar/],
    ['overdue', /overdue/],
    ['invalid', /tidak valid/],
  ] as const)('renders %s recovery state', (scenario, expected) => {
    renderForecast(scenario);
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Sembunyikan nominal' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Sembunyikan nominal' }));
    expect(screen.getByRole('button', { name: 'Nominal disembunyikan' })).toBeTruthy();
  });

  it('keeps calendar, agenda, forecast, filters, scenarios, and drill-down actions alive', () => {
    renderForecast();
    fireEvent.press(screen.getByRole('button', { name: 'Agenda' }));
    expect(screen.getByText('Agenda harian fixture')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Forecast' }));
    expect(screen.getByText('Forecast saldo fixture')).toBeTruthy();
    for (const name of [
      '7 hari',
      '30 hari',
      '90 hari',
      '365 hari',
      'Filter event',
      'Tampilkan pending',
      'Sembunyikan pending',
    ]) {
      fireEvent.press(screen.getByRole('button', { name }));
    }
    fireEvent.press(screen.getByRole('button', { name: 'Buat scenario' }));
    expect(screen.getByText('Scenario forecast (fixture)')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Nama scenario'), 'Scenario aman');
    fireEvent.press(screen.getByRole('button', { name: 'Simpan scenario fixture' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke kalender' }));
    fireEvent.press(screen.getByRole('button', { name: 'Buka detail event' }));
    fireEvent.press(screen.getByRole('button', { name: 'Buka transaksi fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Segarkan fixture' }));
    expect(FORECAST_LAYOUT.minimumWidth).toBe(320);
    expect(FORECAST_LAYOUT.minimumTouchTarget).toBeGreaterThanOrEqual(48);
  });

  it('does not call network or logging APIs and keeps safe static navigation', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    renderForecast('partial_fx');
    fireEvent.press(screen.getByRole('button', { name: 'Coba lagi forecast' }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    logSpy.mockRestore();
  });
});
