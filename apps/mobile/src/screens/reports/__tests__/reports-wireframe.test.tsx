import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { ReportsWireframe } from '../reports-wireframe';
import {
  REPORTS_LAYOUT,
  calculateCashflow,
  calculateNetWorth,
  createReportsFixture,
  formatReportMoney,
  reportsStateLabel,
  sanitizeCsvCell,
  validateCustomReportRange,
  type ReportFilterDraft,
  type ReportRange,
  type ReportsScenario,
} from '../reports-fixture';

jest.setTimeout(30000);

function renderReports(scenario?: ReportsScenario) {
  return render(
    <ThemeProvider reducedMotion>
      <ReportsWireframe fixture={createReportsFixture(scenario)} />
    </ThemeProvider>,
  );
}

const filters: ReportFilterDraft = {
  accountIds: ['fixture-account'],
  categoryIds: [],
  tagIds: [],
  entryTypes: ['expense'],
  lifecycleStatuses: ['posted'],
  clearingStatuses: ['cleared'],
  currencies: ['IDR'],
  includeRefunds: true,
};

describe('U13 F10 reports wireframe', () => {
  it('connects F10 to the authenticated Reports route and manifest', async () => {
    expect(ROUTE_MANIFEST.find((entry) => entry.featureId === 'F10')).toMatchObject({
      routeId: 'reports',
      path: '/reports',
      navigationGroup: 'reports',
      tab: 'reports',
      title: 'Laporan arus kas & net worth',
      readiness: 'WIREFRAME READY',
    });
    expect(REPORTS_LAYOUT).toMatchObject({ minimumWidth: 320, minimumTouchTarget: 48 });
    defaultSessionAdapter.setSignedIn();
    renderRouter('app', { initialUrl: '/reports' });
    expect(await routerScreen.findByText('Reports (fixture)')).toBeTruthy();
  });

  it('calculates cashflow and net worth with canonical minor-unit strings', () => {
    const fixture = createReportsFixture('populated');
    expect(fixture.snapshot.cashflow).toMatchObject({
      grossIncomeMinor: '1000000',
      grossExpenseMinor: '400000',
      refundsMinor: '50000',
      netExpenseMinor: '350000',
      netCashflowMinor: '650000',
      internalTransferExcluded: true,
    });
    expect(fixture.snapshot.netWorth).toMatchObject({
      assetsMinor: '2000000',
      liabilitiesMinor: '500000',
      netWorthMinor: '1500000',
      percentageChange: null,
    });
    expect(formatReportMoney('125000', 'IDR')).toContain('Rp');
    expect(formatReportMoney('125000.5', 'IDR')).toBeNull();
    expect(fixture.snapshot.cashflow.committedExpenseMinor).toBe('75000');
  });

  it('supports report segments, ranges, explicit comparison, and deterministic granularity', () => {
    const fixture = createReportsFixture();
    const ranges: ReportRange[] = [
      'this_week',
      'this_month',
      'last_month',
      'year_to_date',
      'last_12_months',
      'custom',
    ];
    for (const range of ranges) {
      expect(fixture.setRange(range)).toMatchObject({ range });
    }
    expect(fixture.toggleTab('net_worth')).toMatchObject({
      tab: 'net_worth',
      granularity: 'month',
    });
    expect(fixture.toggleComparison(true)).toMatchObject({
      enabled: true,
      comparisonLabel: expect.stringMatching(/periode sebelumnya/i),
      sameLength: true,
    });
    expect(fixture.snapshot.timezone).toBe('Asia/Jakarta');
  });

  it('applies filters atomically and keeps cancel from changing the report', () => {
    const fixture = createReportsFixture();
    const before = fixture.snapshot.activeFilters;
    expect(fixture.cancelFilters()).toEqual({ changed: false, filters: before });
    expect(fixture.applyFilters(filters)).toMatchObject({ changed: true, filterCount: 5 });
    expect(fixture.snapshot.activeFilters).toEqual(filters);
    expect(fixture.cancelFilters()).toMatchObject({ changed: false });
  });

  it('separates pending committed data, single-account transfer movement, and zero-baseline change', () => {
    const fixture = createReportsFixture('populated');
    expect(fixture.toggleCommitted(true)).toMatchObject({ committedVisible: true });
    expect(fixture.snapshot.cashflow.internalTransferExcluded).toBe(true);
    expect(fixture.accountMovement('fixture-account')).toMatchObject({
      visible: true,
      headlineIncluded: false,
    });
    expect(fixture.zeroBaselineChange()).toMatchObject({
      absoluteMinor: '500000',
      percentage: null,
    });
  });

  it('keeps chart table, drill-down, and methodology consistent without sensitive route data', () => {
    const fixture = createReportsFixture('populated');
    expect(fixture.snapshot.chart.table).toEqual(expect.any(Array));
    expect(fixture.snapshot.methodology).toEqual(
      expect.objectContaining({
        actual: expect.any(String),
        committed: expect.any(String),
        refund: expect.any(String),
        transfer: expect.any(String),
        asOf: expect.any(String),
        baseCurrency: 'IDR',
      }),
    );
    expect(fixture.drillDown('category')).toMatchObject({
      route: '/transactions',
      preservesFilters: true,
    });
    expect(JSON.stringify(fixture.drillDown('category'))).not.toMatch(
      /amount|merchant|note|accountId|definition|2026-08-27/i,
    );
  });

  it('handles loading, no-data, offline, stale, coverage, partial FX, partial retry, and range errors', () => {
    const cases: [ReportsScenario, RegExp][] = [
      ['loading', /Memuat laporan/],
      ['empty', /Belum ada transaksi/],
      ['offline', /Offline/],
      ['stale', /Coverage/],
      ['coverage_gap', /rentang belum tersinkron/],
      ['partial_fx', /belum memiliki kurs/],
      ['partial', /Bagian ini perlu dicoba lagi/],
      ['too_large', /Rentang terlalu besar/],
      ['invalid_preset', /Preset tidak dapat digunakan/],
    ];
    for (const [scenario, copy] of cases) {
      const rendered = renderReports(scenario);
      expect(screen.getAllByText(copy).length).toBeGreaterThan(0);
      rendered.unmount();
    }
    const fixture = createReportsFixture('partial');
    expect(fixture.retry('net_worth')).toEqual(fixture.retry('net_worth'));
  });

  it('supports session-only presets and safe CSV preview/export lifecycle', () => {
    const fixture = createReportsFixture();
    expect(fixture.savePreset('  Bulanan aman  ')).toMatchObject({
      kind: 'saved',
      name: 'Bulanan aman',
    });
    expect(fixture.renamePreset('Bulanan baru')).toMatchObject({ kind: 'renamed' });
    expect(fixture.deletePreset()).toMatchObject({ kind: 'deleted' });
    expect(fixture.loadPreset('legacy')).toMatchObject({
      kind: 'invalid_fallback',
      offeredDelete: true,
    });
    expect(fixture.exportPreview()).toMatchObject({
      kind: 'preview',
      privacyWarning: expect.any(String),
      formulaInjectionProtected: true,
    });
    expect(fixture.confirmExport(false)).toMatchObject({ kind: 'cancelled', cleaned: true });
    expect(fixture.confirmExport(true)).toMatchObject({ kind: 'exported_fixture', cleaned: true });
    expect(sanitizeCsvCell('=HYPERLINK("x")')).toBe('\'=HYPERLINK("x")');
  });

  it('masks all money in visual and accessibility output and keeps controls accessible', () => {
    const fixture = createReportsFixture('populated');
    expect(fixture.maskMoney('Rp1.500.000')).toBe('••••');
    renderReports('populated');
    fireEvent.press(screen.getByRole('button', { name: 'Sembunyikan nominal' }));
    expect(screen.getByText(/Nominal disembunyikan/)).toBeTruthy();
    expect(screen.queryByText(/Rp1\.500\.000/)).toBeNull();
    expect(screen.getByText(/Minimum 320dp/)).toBeTruthy();
    expect(screen.getByText(/Animasi dikurangi/)).toBeTruthy();
  });

  it('keeps every CTA deterministic for retry, refresh, quick navigation, permission, and kill switch', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    renderReports('permission_denied');
    fireEvent.press(screen.getByRole('button', { name: 'Coba lagi laporan' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    screen.unmount();

    renderReports('kill_switch');
    expect(screen.getAllByText(/local-only/).length).toBeGreaterThan(0);
    fireEvent.press(screen.getByRole('button', { name: 'Segarkan fixture' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    screen.unmount();

    renderReports('export_failure');
    fireEvent.press(screen.getByRole('button', { name: 'Buka export preview' }));
    expect(screen.getByText(/Export CSV fixture/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Konfirmasi export' }));
    fireEvent.press(screen.getByRole('button', { name: 'Coba export lagi' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('covers pure calculation, range, state-label, preset, and export edge cases', () => {
    expect(
      calculateCashflow({ incomeMinor: '10', expenseMinor: '100', refundMinor: '150' }),
    ).toMatchObject({
      netExpenseMinor: '0',
      netCashflowMinor: '60',
    });
    expect(
      calculateCashflow({
        incomeMinor: '10',
        expenseMinor: '100',
        refundMinor: '5',
        otherIncomeMinor: '2',
      }),
    ).toMatchObject({
      netExpenseMinor: '95',
      netCashflowMinor: '-83',
    });
    expect(
      calculateNetWorth({ assetsMinor: '100', liabilitiesMinor: '20', startingMinor: '40' }),
    ).toMatchObject({
      netWorthMinor: '80',
      percentageChange: '10000',
    });
    expect(
      calculateNetWorth({ assetsMinor: '10', liabilitiesMinor: '20', startingMinor: '-10' })
        .percentageChange,
    ).toBe('0');
    expect(validateCustomReportRange('not-a-date', '2026-08-27')).toBe('invalid');
    expect(validateCustomReportRange('2026-08-27', '2026-08-26')).toBe('invalid');
    expect(validateCustomReportRange('2010-01-01', '2026-08-27')).toBe('too_large');
    expect(validateCustomReportRange('2026-08-01', '2026-08-27')).toBe('valid');
    const scenarios: ReportsScenario[] = [
      'populated',
      'loading',
      'empty',
      'offline',
      'stale',
      'coverage_gap',
      'partial_fx',
      'partial',
      'invalid_preset',
      'too_large',
      'permission_denied',
      'kill_switch',
      'export_failure',
    ];
    for (const scenario of scenarios)
      expect(reportsStateLabel(createReportsFixture(scenario).snapshot)).toBeTruthy();
    expect(createReportsFixture().savePreset(' '.repeat(61))).toMatchObject({ kind: 'invalid' });
    expect(createReportsFixture().loadPreset('saved')).toMatchObject({ kind: 'loaded' });
    expect(createReportsFixture('export_failure').confirmExport(true)).toMatchObject({
      kind: 'failed',
      cleaned: true,
    });
  });

  it('exercises report controls and preserves safe drill-down routing', () => {
    const onDrillDown = jest.fn();
    render(
      <ThemeProvider reducedMotion>
        <ReportsWireframe fixture={createReportsFixture()} onDrillDown={onDrillDown} />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Net Worth' }));
    fireEvent.press(screen.getByRole('button', { name: '12 bulan' }));
    fireEvent.press(screen.getByRole('button', { name: 'Bandingkan periode' }));
    fireEvent.press(screen.getByRole('button', { name: 'Tampilkan committed' }));
    fireEvent.press(screen.getByRole('button', { name: 'Terapkan filter' }));
    fireEvent.press(screen.getByRole('button', { name: 'Batalkan filter' }));
    fireEvent.press(screen.getByRole('button', { name: 'Buka breakdown category' }));
    fireEvent.press(screen.getByRole('button', { name: 'Simpan preset fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Buka export preview' }));
    fireEvent.press(screen.getByRole('button', { name: 'Batalkan export' }));
    fireEvent.press(screen.getByRole('button', { name: 'Segarkan fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Sembunyikan nominal' }));
    expect(onDrillDown).toHaveBeenCalledWith('/transactions');
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
