import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { BudgetsWireframe } from '../budgets-wireframe';
import {
  BUDGET_LAYOUT,
  calculateBudgetLine,
  createBudgetsFixture,
  formatBudgetMoney,
  rolloverAmount,
  validateBudgetDraft,
  type BudgetDraft,
  type BudgetScenario,
} from '../budgets-fixture';

jest.setTimeout(30000);

function renderBudgets(scenario?: BudgetScenario) {
  return render(
    <ThemeProvider reducedMotion>
      <BudgetsWireframe fixture={createBudgetsFixture(scenario)} />
    </ThemeProvider>,
  );
}

const validDraft: BudgetDraft = {
  name: 'Budget rumah',
  currency: 'IDR',
  cadence: 'monthly',
  timezone: 'Asia/Jakarta',
  anchorDate: '2026-08-01',
  startDay: 1,
  rolloverMode: 'positive-only',
  rolloverCapMinor: null,
  threshold: { kind: 'preset', percent: 80 },
  categoryLines: [
    { categoryId: 'category-food', plannedMinor: '1000000' },
    { categoryId: 'category-transport', plannedMinor: '500000' },
  ],
};

describe('U14 F11 budgets wireframe', () => {
  it('connects F11 to authenticated Planning budget route and manifest', async () => {
    expect(ROUTE_MANIFEST.find((entry) => entry.featureId === 'F11')).toMatchObject({
      routeId: 'budgets',
      path: '/planning/budgets',
      navigationGroup: 'planning',
      tab: 'planning',
      title: 'Anggaran',
      readiness: 'WIREFRAME READY',
    });
    expect(BUDGET_LAYOUT).toMatchObject({ minimumWidth: 320, minimumTouchTarget: 48 });
    defaultSessionAdapter.setSignedIn();
    renderRouter('app', { initialUrl: '/planning/budgets' });
    expect(await routerScreen.findByText('Budgets (fixture)')).toBeTruthy();
  });

  it('shows only active budgets by default and supports list actions deterministically', () => {
    const fixture = createBudgetsFixture('populated');
    expect(fixture.list().items).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: 'active' })]),
    );
    expect(fixture.list().items).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ status: 'archived' })]),
    );
    expect(fixture.filterStatus('archived').items).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: 'archived' })]),
    );
    expect(fixture.copyPrevious()).toMatchObject({ kind: 'copied', name: expect.stringContaining('(salinan)') });
    expect(fixture.pause('budget-monthly')).toMatchObject({ kind: 'paused' });
    expect(fixture.archive('budget-monthly', true)).toMatchObject({ kind: 'archived' });
    expect(fixture.restore('budget-monthly')).toMatchObject({ kind: 'restored' });
  });

  it('validates wizard cadence, timezone, currency, threshold, category lines, and rollover preview', () => {
    expect(validateBudgetDraft(validDraft)).toEqual([]);
    expect(validateBudgetDraft({ ...validDraft, name: ' ' })).toEqual(
      expect.arrayContaining([expect.stringContaining('Nama budget')]),
    );
    expect(validateBudgetDraft({ ...validDraft, currency: 'idr' })).toEqual(
      expect.arrayContaining([expect.stringContaining('currency')]),
    );
    expect(validateBudgetDraft({ ...validDraft, cadence: 'custom_days', startDay: 0 })).toEqual(
      expect.arrayContaining([expect.stringContaining('awal')]),
    );
    expect(validateBudgetDraft({ ...validDraft, threshold: { kind: 'custom', percent: 101 } })).toEqual(
      expect.arrayContaining([expect.stringContaining('threshold')]),
    );
    expect(createBudgetsFixture().preview(validDraft)).toMatchObject({
      firstPeriod: expect.any(String),
      rolloverSimulation: expect.any(String),
    });
    expect(rolloverAmount('125000', 'positive-only')).toBe('125000');
    expect(rolloverAmount('-125000', 'positive-only')).toBe('0');
    expect(rolloverAmount('125000', 'positive-capped', '100000')).toBe('100000');
    expect(rolloverAmount('-125000', 'full-balance')).toBe('-125000');
  });

  it('rejects overlapping categories and requires atomic zero-sum line adjustments', () => {
    expect(validateBudgetDraft({
      ...validDraft,
      categoryLines: [...validDraft.categoryLines, { categoryId: 'category-food', plannedMinor: '200000' }],
    })).toEqual(expect.arrayContaining([expect.stringContaining('ganda')]));
    const fixture = createBudgetsFixture();
    expect(fixture.moveAllocation('category-food', 'category-transport', '100000', '100000')).toMatchObject({ kind: 'applied', zeroSum: true });
    expect(fixture.moveAllocation('category-food', 'category-transport', '100000', '90000')).toMatchObject({ kind: 'invalid', zeroSum: false });
  });

  it('computes planned, actual, committed, forecast, available, projected, overspent, and usage with BigInt', () => {
    const metrics = calculateBudgetLine({
      baseAllocationMinor: '1000000',
      adjustmentMinor: '100000',
      rolloverMinor: '50000',
      actualSpentMinor: '800000',
      committedMinor: '100000',
      forecastMinor: '50000',
    });
    expect(metrics).toMatchObject({
      plannedMinor: '1150000',
      actualSpentMinor: '800000',
      committedMinor: '100000',
      forecastMinor: '50000',
      availableActualMinor: '350000',
      availableAfterCommittedMinor: '250000',
      projectedRemainingMinor: '200000',
      overspentMinor: '0',
      usagePercent: '69',
    });
    expect(calculateBudgetLine({ baseAllocationMinor: '0', adjustmentMinor: '0', rolloverMinor: '0', actualSpentMinor: '1', committedMinor: '0', forecastMinor: '0' }).usagePercent).toBeNull();
    expect(formatBudgetMoney('125000', 'IDR')).toContain('Rp');
    expect(formatBudgetMoney('125000.5', 'IDR')).toBeNull();
  });

  it('represents transfer/refund/recurring/missing-FX/negative rules without false spending', () => {
    const fixture = createBudgetsFixture('populated');
    expect(fixture.businessRules()).toMatchObject({
      transferSpending: '0',
      linkedRefundReducesActual: true,
      linkedRefundIncome: false,
      unmatchedRecurringForecast: '50000',
      missingFxCount: 1,
      missingFxFallback: false,
    });
    expect(validateBudgetDraft({ ...validDraft, categoryLines: [{ categoryId: 'category-food', plannedMinor: '-1' }] })).toEqual(
      expect.arrayContaining([expect.stringContaining('positif')]),
    );
  });

  it('deduplicates thresholds and exposes rollover maintenance honestly', () => {
    const fixture = createBudgetsFixture('populated');
    expect(fixture.alert('budget-monthly', 80)).toMatchObject({ kind: 'alerted' });
    expect(fixture.alert('budget-monthly', 80)).toMatchObject({ kind: 'deduped' });
    expect(createBudgetsFixture('rollover_maintenance').rolloverStatus()).toMatchObject({ kind: 'maintenance' });
  });

  it('keeps offline/conflict/permission/archived/too-many-lines states deterministic', () => {
    expect(createBudgetsFixture('offline').save(validDraft)).toMatchObject({ kind: 'queued', syncStatus: 'queued' });
    expect(createBudgetsFixture('conflict').save(validDraft)).toMatchObject({ kind: 'conflict_copy', name: expect.stringContaining('(salinan)') });
    expect(createBudgetsFixture('permission_revoked').readOnly()).toMatchObject({ kind: 'read_only' });
    expect(createBudgetsFixture('too_many_lines').validation()).toMatchObject({ kind: 'too_many_lines' });
    expect(createBudgetsFixture('stale').recompute()).toMatchObject({ kind: 'preview_only' });
  });

  it('provides detail formulas and safe transaction drill-down without sensitive params', () => {
    const fixture = createBudgetsFixture('populated');
    expect(fixture.detail('budget-monthly')).toMatchObject({
      plannedMinor: expect.any(String),
      formula: expect.stringContaining('available'),
      transactionRoute: '/transactions',
    });
    expect(JSON.stringify(fixture.detail('budget-monthly'))).not.toMatch(/budget|category|accountId|transactionId|2026-08-27|amount/i);
  });

  it('renders states, privacy masking, accessible controls, and no dead actions', () => {
    const cases: [BudgetScenario, RegExp][] = [
      ['loading', /Memuat budget/],
      ['empty', /Belum ada budget/],
      ['offline', /Offline/],
      ['stale', /stale/],
      ['partial', /Bagian ini perlu dicoba lagi/],
      ['missing_fx', /belum memiliki kurs/],
      ['invalid_legacy', /tidak dapat digunakan/],
      ['permission_revoked', /read-only/],
      ['archived_paused', /arsip/],
      ['too_many_lines', /terlalu banyak line/],
      ['rollover_maintenance', /maintenance/],
    ];
    for (const [scenario, copy] of cases) {
      const rendered = renderBudgets(scenario);
      expect(screen.getAllByText(copy).length).toBeGreaterThan(0);
      rendered.unmount();
    }
    renderBudgets('populated');
    fireEvent.press(screen.getByRole('button', { name: 'Sembunyikan nominal' }));
    expect(screen.getByText(/Nominal disembunyikan/)).toBeTruthy();
    expect(screen.queryByText(/Rp1\.000\.000/)).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Buat budget' }));
    expect(screen.getByText('Wizard budget (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke daftar budget' }));
    expect(screen.getByText('Budgets (fixture)')).toBeTruthy();
    expect(screen.getByText(/Minimum 320dp/)).toBeTruthy();
  });

  it('keeps refresh/retry/create and drill-down offline with no logging or network', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    renderBudgets('partial');
    fireEvent.press(screen.getByRole('button', { name: 'Coba lagi budget' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Segarkan fixture' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    logSpy.mockRestore();
  });
});
