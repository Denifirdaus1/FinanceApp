import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { DebtWireframe } from '../debt-wireframe';
import {
  DEBT_LAYOUT,
  amortizationSchedule,
  calculateOutstanding,
  createDebtFixture,
  formatDebtMoney,
  reconcilePayment,
  statementReconciliation,
  validateDebtDraft,
  type DebtDraft,
  type DebtScenario,
} from '../debt-fixture';

jest.setTimeout(30000);

const validDraft: DebtDraft = {
  name: 'Pinjaman rumah',
  kind: 'installment',
  trackingMode: 'ledger',
  currency: 'IDR',
  openingOutstandingMinor: '10000000',
  openingAsOf: '2026-01-01',
  creditLimitMinor: null,
  accountId: 'account-loan-fixture',
  statementDate: '2026-08-15',
  dueDate: '2026-08-25',
  minimumDueMinor: '500000',
  aprBps: 1200,
  periods: 12,
  paymentsPerYear: 12,
  reminderOptIn: false,
};

function renderDebt(scenario?: DebtScenario) {
  return render(
    <ThemeProvider reducedMotion>
      <DebtWireframe fixture={createDebtFixture(scenario)} />
    </ThemeProvider>,
  );
}

describe('U17 F14 debt and loans wireframe', () => {
  it('connects F14 to authenticated Planning route and manifest', async () => {
    defaultSessionAdapter.setSignedIn();
    expect(ROUTE_MANIFEST.find((route) => route.featureId === 'F14')).toMatchObject({
      routeId: 'debts',
      path: '/planning/debts',
      navigationGroup: 'planning',
      readiness: 'WIREFRAME READY',
    });
    renderRouter('app', { initialUrl: '/planning/debts' });
    expect(await routerScreen.findByText('Debt & Loans (fixture)')).toBeTruthy();
  });

  it('validates debt type, currency, non-negative opening balance, and dates', () => {
    expect(validateDebtDraft(validDraft)).toEqual([]);
    expect(formatDebtMoney('10000000', 'IDR')).toContain('10.000.000');
    expect(validateDebtDraft({ ...validDraft, openingOutstandingMinor: '-1' })).toContain(
      'Outstanding pembukaan harus integer minor unit >= 0.',
    );
    expect(validateDebtDraft({ ...validDraft, openingOutstandingMinor: '10.5' })).toContain(
      'Outstanding pembukaan harus integer minor unit >= 0.',
    );
    expect(validateDebtDraft({ ...validDraft, currency: 'USD' })).toContain(
      'Currency fixture tidak didukung.',
    );
    expect(validateDebtDraft({ ...validDraft, name: '' })).toContain(
      'Nama debt harus 1–80 karakter.',
    );
    expect(validateDebtDraft({ ...validDraft, openingAsOf: '2026-02-31' })).toContain(
      'Tanggal fixture tidak valid.',
    );
    expect(validateDebtDraft({ ...validDraft, dueDate: '2025-12-01' })).toContain(
      'Due date tidak boleh sebelum as-of.',
    );
    expect(
      validateDebtDraft({ ...validDraft, kind: 'credit_card', creditLimitMinor: '0' }),
    ).toContain('Limit harus positif bila diisi.');
    expect(validateDebtDraft({ ...validDraft, minimumDueMinor: '-1' })).toContain(
      'Minimum due harus minor unit valid.',
    );
    expect(validateDebtDraft({ ...validDraft, aprBps: -1 })).toContain('APR fixture tidak valid.');
    expect(validateDebtDraft({ ...validDraft, periods: 0 })).toContain(
      'Jumlah periode harus minimal 1.',
    );
  });

  it('separates actual, pending, forecast, statement mode, partial FX, and credit balance', () => {
    expect(calculateOutstanding('10000000', '800000', '300000', 'posted')).toEqual({
      actual: '9200000',
      pending: '0',
      projected: '9200000',
    });
    expect(calculateOutstanding('10000000', '800000', '300000', 'pending')).toEqual({
      actual: '10000000',
      pending: '800000',
      projected: '9200000',
    });
    expect(calculateOutstanding('100000', '150000', '0', 'posted')).toMatchObject({
      actual: '-50000',
      creditBalance: '50000',
    });
    expect(createDebtFixture('partial_fx').summary()).toMatchObject({
      nativeVisible: true,
      baseAggregate: 'partial',
      missingFxCount: 1,
    });
    expect(createDebtFixture('statement_assisted').summary()).toMatchObject({
      trackingMode: 'statement_assisted',
      reconciliation: 'unreconciled',
    });
  });

  it('reconciles payment components atomically and excludes principal from expense', () => {
    expect(
      reconcilePayment({
        total: '1000000',
        principal: '800000',
        interest: '150000',
        fee: '50000',
        adjustment: '0',
      }),
    ).toMatchObject({ valid: true, principalIsExpense: false, expenseMinor: '200000' });
    expect(
      reconcilePayment({
        total: '1000000',
        principal: '800000',
        interest: '100000',
        fee: '50000',
        adjustment: '0',
      }),
    ).toMatchObject({ valid: false, reason: 'total_mismatch' });
    expect(createDebtFixture('pending').paymentResult()).toMatchObject({
      actualUnchanged: true,
      status: 'pending',
    });
    expect(createDebtFixture('offline').paymentResult()).toMatchObject({
      status: 'queued',
      idempotent: true,
    });
    expect(createDebtFixture('conflict').paymentResult()).toMatchObject({
      status: 'review_required',
    });
    expect(createDebtFixture().paymentResult()).toMatchObject({
      principalTransfer: true,
      interestExpense: true,
      feeExpense: true,
      atomic: true,
    });
  });

  it('supports statement difference and explicit adjustment confirmation', () => {
    expect(statementReconciliation('9500000', '9400000')).toEqual({
      difference: '100000',
      status: 'needs_confirmation',
      applied: false,
    });
    expect(createDebtFixture().reconcileStatement(false)).toMatchObject({
      applied: false,
      openingChanged: false,
    });
    expect(createDebtFixture().reconcileStatement(true)).toMatchObject({
      applied: true,
      openingChanged: false,
      adjustment: '100000',
    });
    expect(createDebtFixture('statement_mismatch').reconcileStatement(false)).toMatchObject({
      status: 'needs_confirmation',
    });
  });

  it('generates deterministic fixed-rate schedules including zero APR, rounding, and negative amortization', () => {
    const zero = amortizationSchedule({
      principal: '1200000',
      aprBps: 0,
      periods: 12,
      paymentsPerYear: 12,
      scheduledPayment: null,
      periodicFee: '0',
    });
    expect(zero[0]).toMatchObject({ principal: '100000', interest: '0' });
    expect(zero.at(-1)?.closingPrincipal).toBe('0');
    expect(
      amortizationSchedule({
        principal: '1000000',
        aprBps: 1200,
        periods: 2,
        paymentsPerYear: 12,
        scheduledPayment: '1000',
        periodicFee: '0',
      }).negativeAmortization,
    ).toBe(true);
    expect(
      amortizationSchedule({
        principal: '1000001',
        aprBps: 0,
        periods: 3,
        paymentsPerYear: 12,
        scheduledPayment: null,
        periodicFee: '0',
      }).at(-1)?.closingPrincipal,
    ).toBe('0');
    expect(
      amortizationSchedule({
        principal: '1000000',
        aprBps: 1200,
        periods: 2,
        paymentsPerYear: 12,
        scheduledPayment: null,
        periodicFee: '0',
      }),
    ).toHaveLength(2);
    expect(createDebtFixture('amortization_kill_switch').schedule()).toMatchObject({
      visible: false,
      kind: 'maintenance',
    });
    expect(createDebtFixture('too_large_schedule').schedule()).toMatchObject({
      visible: false,
      kind: 'too_large',
    });
  });

  it('keeps archive/history, reminders, scenarios, and deterministic recovery states', () => {
    const fixture = createDebtFixture();
    expect(fixture.list()).toHaveLength(1);
    expect(fixture.archive(true).status).toBe('archived');
    expect(fixture.reopen().status).toBe('active');
    expect(fixture.history()).toMatchObject({ available: true, includeInNetWorth: true });
    expect(fixture.reminder()).toMatchObject({ kind: 'scheduled_fixture' });
    expect(createDebtFixture('reminder_kill_switch').reminder()).toMatchObject({
      kind: 'in_app_only',
    });
    expect(fixture.extraPrincipal('200000')).toMatchObject({
      kind: 'scenario',
      actualChanged: false,
    });
    expect(fixture.retry()).toMatchObject({ kind: 'refreshed' });
    expect(createDebtFixture('materialization_failure').retry()).toMatchObject({
      kind: 'incremental_retry',
    });
    expect(createDebtFixture('offline').save(validDraft)).toMatchObject({ status: 'queued' });
    expect(createDebtFixture('conflict').save(validDraft)).toMatchObject({ status: 'conflict' });
    expect(createDebtFixture('permission_revoked').save(validDraft)).toMatchObject({
      status: 'read-only',
    });
  });

  it.each([
    ['loading', /Memuat debt/],
    ['empty', /Belum ada debt/],
    ['offline', /Offline/],
    ['stale', /forecast stale/],
    ['partial_fx', /FX belum tersedia/],
    ['statement_mismatch', /Selisih statement/],
    ['permission_revoked', /read-only/],
    ['archived_closed', /arsip/],
    ['negative_amortization', /negative amortization/],
    ['amortization_kill_switch', /maintenance/],
    ['reminder_kill_switch', /in-app/],
    ['too_large_schedule', /terlalu besar/],
    ['conflict', /konflik/],
    ['invalid', /tidak valid/],
  ] as const)('renders %s state with a recovery label', (scenario, expected) => {
    renderDebt(scenario);
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Sembunyikan nominal' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Sembunyikan nominal' }));
    expect(screen.getByRole('button', { name: 'Nominal disembunyikan' })).toBeTruthy();
  });

  it('has live list, wizard, payment, statement, scenario, history, and back actions', () => {
    renderDebt();
    fireEvent.press(screen.getByRole('button', { name: 'Buat debt' }));
    expect(screen.getByText('Wizard debt (fixture)')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Nama debt'), 'KPR fixture');
    fireEvent.changeText(screen.getByLabelText('Opening outstanding'), '12000000');
    fireEvent.press(screen.getByRole('button', { name: 'Simpan debt fixture' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke daftar debt' }));
    fireEvent.press(screen.getByRole('button', { name: 'Buka detail debt' }));
    fireEvent.press(screen.getByRole('button', { name: 'Buka transaksi fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Catat pembayaran' }));
    expect(screen.getByText('Pembayaran debt (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Review payment group' }));
    fireEvent.press(screen.getByRole('button', { name: 'Konfirmasi payment fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke detail debt' }));
    fireEvent.press(screen.getByRole('button', { name: 'Rekonsiliasi statement' }));
    fireEvent.press(screen.getByRole('button', { name: 'Review adjustment' }));
    fireEvent.press(screen.getByRole('button', { name: 'Konfirmasi adjustment fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke detail debt' }));
    fireEvent.press(screen.getByRole('button', { name: 'Lihat histori debt' }));
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke detail debt' }));
    fireEvent.press(screen.getByRole('button', { name: 'Skenario extra principal' }));
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke detail debt' }));
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke daftar debt' }));
    expect(DEBT_LAYOUT.minimumWidth).toBe(320);
    expect(DEBT_LAYOUT.minimumTouchTarget).toBeGreaterThanOrEqual(48);
  });

  it('does not use network or logging and keeps navigation static', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    renderDebt('partial_fx');
    fireEvent.press(screen.getByRole('button', { name: 'Coba lagi debt' }));
    fireEvent.press(screen.getByRole('button', { name: 'Segarkan fixture' }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('keeps wizard controls and empty/kill-switch recovery actions live', () => {
    renderDebt();
    fireEvent.press(screen.getByRole('button', { name: 'Buat debt' }));
    fireEvent.press(screen.getByRole('button', { name: 'Ledger tracking' }));
    fireEvent.press(screen.getByRole('button', { name: 'Statement-assisted tracking' }));
    fireEvent.press(screen.getByRole('button', { name: 'Opt-in reminder fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Matikan reminder fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke daftar debt' }));
    fireEvent.press(screen.getByRole('button', { name: 'Urutkan debt' }));
    fireEvent.press(screen.getByRole('button', { name: 'Archive debt' }));
    fireEvent.press(screen.getByRole('button', { name: 'Reopen debt' }));
    fireEvent.press(screen.getByRole('button', { name: 'Buka detail debt' }));
    fireEvent.press(screen.getByRole('button', { name: 'Skenario extra principal' }));
    fireEvent.press(screen.getByRole('button', { name: 'Jalankan skenario fixture' }));

    renderDebt('empty');
    fireEvent.press(screen.getAllByRole('button', { name: 'Buat debt' })[1]!);
    expect(screen.getByText('Wizard debt (fixture)')).toBeTruthy();
    renderDebt('reminder_kill_switch');
    fireEvent.press(screen.getByRole('button', { name: 'Gunakan in-app review' }));
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
