import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { DashboardWireframe } from '../dashboard-wireframe';
import {
  DASHBOARD_LAYOUT,
  createDashboardFixture,
  formatDashboardMoney,
} from '../dashboard-fixture';

jest.setTimeout(30000);

function renderDashboard(scenario?: Parameters<typeof createDashboardFixture>[0]) {
  return render(
    <ThemeProvider reducedMotion>
      <DashboardWireframe fixture={createDashboardFixture(scenario)} />
    </ThemeProvider>,
  );
}

describe('U12 F09 dashboard summary wireframe', () => {
  it('keeps the authenticated Home route and F09 manifest contract', async () => {
    expect(ROUTE_MANIFEST.find((entry) => entry.featureId === 'F09')).toMatchObject({
      routeId: 'home',
      path: '/',
      navigationGroup: 'home',
      tab: 'home',
      title: 'Dashboard & ringkasan harian',
      readiness: 'INTEGRATED',
    });
    expect(DASHBOARD_LAYOUT).toMatchObject({ minimumWidth: 320, minimumTouchTarget: 48 });
    defaultSessionAdapter.setSignedIn();
    renderRouter('app', { initialUrl: '/' });
    expect(await routerScreen.findByText('Dashboard (fixture)')).toBeTruthy();
  });

  it('renders deterministic loading, populated, empty, offline, stale, partial, and missing-FX states', () => {
    const cases: [Parameters<typeof createDashboardFixture>[0], RegExp][] = [
      ['loading', /Memuat ringkasan/],
      ['populated', /Saldo tersedia/],
      ['empty', /Mulai dengan akun atau transaksi pertama/],
      ['offline', /Offline/],
      ['stale', /Data terakhir diperbarui/],
      ['partial', /Bagian ini perlu dicoba lagi/],
      ['missing_fx', /belum memiliki kurs/],
    ];
    for (const [scenario, copy] of cases) {
      const rendered = renderDashboard(scenario);
      expect(screen.getAllByText(copy).length).toBeGreaterThan(0);
      rendered.unmount();
    }
  });

  it('exposes summary cards and dashboard sections without floating money values', () => {
    const fixture = createDashboardFixture('populated');
    expect(fixture.snapshot.cards).toEqual(
      expect.objectContaining({
        availableBalanceMinor: expect.any(String),
        incomeTodayMinor: expect.any(String),
        expenseTodayMinor: expect.any(String),
        cashflowMtdMinor: expect.any(String),
      }),
    );
    expect(fixture.snapshot.sections.map((section) => section.id)).toEqual([
      'budget',
      'bills',
      'goals',
      'net_worth',
      'activity',
      'review',
    ]);
    expect(formatDashboardMoney('125000', 'IDR')).toContain('Rp');
    expect(formatDashboardMoney('125000.5', 'IDR')).toBeNull();
    expect(JSON.stringify(fixture.snapshot)).not.toMatch(/resourceId|merchant|note/i);
  });

  it('switches period and privacy mode while masking visual and accessibility money', () => {
    const fixture = createDashboardFixture('populated');
    expect(fixture.switchPeriod('month')).toMatchObject({ period: 'month' });
    expect(fixture.togglePrivacy()).toMatchObject({ privacyMode: true });
    expect(fixture.maskMoney('IDR 125000')).toBe('••••');

    renderDashboard('populated');
    fireEvent.press(screen.getByRole('button', { name: 'Sembunyikan nominal' }));
    expect(screen.getByText('Nominal disembunyikan')).toBeTruthy();
    expect(screen.queryByText(/Rp125/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Tampilkan nominal' })).toBeTruthy();
  });

  it('keeps valid cards active during partial failure and recovers retry deterministically', () => {
    const fixture = createDashboardFixture('partial');
    expect(fixture.snapshot.cards.availableBalanceMinor).toBeTruthy();
    expect(fixture.retry('budget')).toMatchObject({ kind: 'recovered', section: 'budget' });
    expect(fixture.retry('budget')).toEqual(fixture.retry('budget'));
    renderDashboard('partial');
    fireEvent.press(screen.getByRole('button', { name: 'Coba lagi budget' }));
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('does not fake missing FX as zero or 1:1 and preserves incomplete warning', () => {
    const fixture = createDashboardFixture('missing_fx');
    expect(fixture.snapshot.fx).toMatchObject({ missingCount: 1, usedOneToOneFallback: false });
    expect(fixture.snapshot.cards.cashflowMtdMinor).toBe('250000');
    expect(fixture.snapshot.fx.incompleteCurrencies).toEqual(['JPY']);
    renderDashboard('missing_fx');
    expect(screen.getByText(/1 transaksi belum memiliki kurs/)).toBeTruthy();
  });

  it('routes every quick action to an existing fixture destination', () => {
    const fixture = createDashboardFixture('populated');
    expect(fixture.quickAction('manual')).toMatchObject({ route: '/capture' });
    expect(fixture.quickAction('receipt')).toMatchObject({ route: '/receipt-capture' });
    expect(fixture.quickAction('voice')).toMatchObject({ route: '/voice-capture' });
    expect(fixture.quickAction('transfer')).toMatchObject({ route: '/transfers' });

    renderDashboard('populated');
    fireEvent.press(screen.getByRole('button', { name: 'Catat manual' }));
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('keeps sync access visible and offers safe recovery for permission/session states', () => {
    expect(createDashboardFixture('permission_denied').recovery()).toMatchObject({
      kind: 'read_only',
    });
    expect(createDashboardFixture('session_expired').recovery()).toMatchObject({
      kind: 'login_required',
      clearsSensitiveView: true,
    });
    renderDashboard('session_expired');
    expect(screen.getByText(/Login diperlukan/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Buka status sinkronisasi' }));
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('supports refresh and back-safe fixture actions without network or logging', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const fixture = createDashboardFixture('stale');
    expect(fixture.refresh()).toMatchObject({ kind: 'refreshed', asOf: expect.any(String) });
    expect(fixture.leave()).toMatchObject({ kind: 'safe_back', draftPreserved: true });
    renderDashboard('stale');
    fireEvent.press(screen.getByRole('button', { name: 'Segarkan fixture' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    logSpy.mockRestore();
  });
});
