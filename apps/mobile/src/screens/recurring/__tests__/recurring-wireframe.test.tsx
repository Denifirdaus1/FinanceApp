import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { RecurringWireframe } from '../recurring-wireframe';
import {
  RECURRING_LAYOUT,
  createRecurringFixture,
  expandMonthlyOccurrence,
  formatRecurringMoney,
  recurrencePreview,
  validateRecurringDraft,
  type RecurringDraft,
  type RecurringScenario,
} from '../recurring-fixture';

jest.setTimeout(30000);

const validDraft: RecurringDraft = {
  name: 'Internet rumah',
  kind: 'expense',
  amountMode: 'fixed',
  amountMinor: '350000',
  currency: 'IDR',
  accountId: 'account-cash-fixture',
  destinationAccountId: null,
  categoryId: 'category-bills',
  cadence: 'monthly',
  interval: 1,
  anchorDate: '2026-01-31',
  dueDate: '2026-08-31',
  timezone: 'Asia/Jakarta',
  monthEndPolicy: 'clamp',
  weekendPolicy: 'keep',
  endCondition: 'none',
  endAfterOccurrences: null,
  endDate: null,
  reminderOptIn: false,
  postingMode: 'draft',
  varianceAbsoluteMinor: '50000',
  variancePercent: 10,
};

function renderRecurring(scenario?: RecurringScenario) {
  return render(
    <ThemeProvider reducedMotion>
      <RecurringWireframe fixture={createRecurringFixture(scenario)} />
    </ThemeProvider>,
  );
}

describe('U16 F13 recurring bills and subscriptions wireframe', () => {
  it('connects F13 to the authenticated Planning route and manifest', async () => {
    expect(defaultSessionAdapter).toBeDefined();
    defaultSessionAdapter.setSignedIn();
    expect(ROUTE_MANIFEST.find((route) => route.featureId === 'F13')).toMatchObject({
      routeId: 'recurring',
      path: '/planning/recurring',
      navigationGroup: 'planning',
      readiness: 'WIREFRAME READY',
    });

    renderRouter('app', { initialUrl: '/planning/recurring' });
    expect(await routerScreen.findByText('Recurring (fixture)')).toBeTruthy();
  });

  it('keeps the six-occurrence preview deterministic and handles month end policy', () => {
    expect(expandMonthlyOccurrence('2026-01-31', 6, 'clamp')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
      '2026-06-30',
    ]);
    expect(expandMonthlyOccurrence('2026-01-31', 3, 'skip')).toEqual([
      '2026-01-31',
      '2026-03-31',
      '2026-05-31',
    ]);
    expect(recurrencePreview(validDraft).occurrences).toHaveLength(6);
    expect(recurrencePreview(validDraft).estimateLabel).toBe('Estimasi tetap');
  });

  it('validates canonical fixture money, cadence, dates, and transfer dependencies', () => {
    expect(validateRecurringDraft(validDraft)).toEqual([]);
    expect(formatRecurringMoney('350000', 'IDR')).toContain('350.000');
    expect(validateRecurringDraft({ ...validDraft, amountMinor: '125.5' })).toContain(
      'Nominal harus berupa minor unit integer canonical.',
    );
    expect(validateRecurringDraft({ ...validDraft, interval: 0 })).toContain(
      'Interval harus minimal 1.',
    );
    expect(validateRecurringDraft({ ...validDraft, dueDate: '2025-12-01' })).toContain(
      'Tanggal jatuh tempo tidak boleh sebelum anchor.',
    );
    expect(
      validateRecurringDraft({
        ...validDraft,
        kind: 'transfer',
        destinationAccountId: 'account-cash-fixture',
      }),
    ).toContain('Akun sumber dan tujuan harus berbeda.');
    expect(validateRecurringDraft({ ...validDraft, currency: 'USD' })).toContain(
      'Currency fixture tidak didukung.',
    );
    expect(validateRecurringDraft({ ...validDraft, anchorDate: '2026-02-30' })).toContain(
      'Tanggal fixture tidak valid.',
    );
    expect(
      validateRecurringDraft({ ...validDraft, kind: 'transfer', destinationAccountId: null }),
    ).toContain('Transfer memerlukan akun tujuan.');
    expect(
      validateRecurringDraft({
        ...validDraft,
        endCondition: 'after_occurrences',
        endAfterOccurrences: 0,
      }),
    ).toContain('Jumlah occurrence akhir harus minimal 1.');
    expect(
      validateRecurringDraft({ ...validDraft, endCondition: 'on_date', endDate: 'bad-date' }),
    ).toContain('Tanggal akhir tidak valid.');
    expect(expandMonthlyOccurrence('bad-date', 2, 'clamp')).toEqual([]);
    expect(expandMonthlyOccurrence('2026-01-31', 0, 'clamp')).toEqual([]);
    expect(recurrencePreview({ ...validDraft, cadence: 'daily' }).occurrences).toHaveLength(6);
    expect(recurrencePreview({ ...validDraft, cadence: 'weekly' }).occurrences).toHaveLength(6);
    expect(recurrencePreview({ ...validDraft, cadence: 'yearly' }).occurrences).toHaveLength(6);
  });

  it('models lifecycle, matching, estimates, transfer semantics, and safe retry', () => {
    const fixture = createRecurringFixture();
    expect(fixture.list()).toHaveLength(1);
    expect(fixture.filterStatus('archived')).toHaveLength(0);
    expect(fixture.copyPrevious().name).toContain('(salinan)');
    expect(fixture.pause().status).toBe('paused');
    expect(fixture.end().status).toBe('ended');
    expect(fixture.archive(true).status).toBe('archived');
    expect(fixture.reopen().status).toBe('active');
    expect(fixture.occurrenceStates()).toEqual(
      expect.arrayContaining([
        'estimated',
        'matched',
        'matched_pending',
        'paid',
        'received',
        'due',
        'overdue',
        'skipped',
        'snoozed',
      ]),
    );
    expect(fixture.candidates()[0]).toMatchObject({ selectable: true });
    expect(fixture.match('candidate-1', true)).toEqual({ kind: 'matched' });
    expect(fixture.match('already-used', true)).toEqual({ kind: 'over_match_review' });
    expect(fixture.match('candidate-1', false)).toEqual({ kind: 'review_required' });
    expect(fixture.unmatch()).toEqual({ kind: 'due' });
    expect(fixture.skip()).toEqual({ kind: 'skipped' });
    expect(fixture.snooze()).toEqual({ kind: 'snoozed', dueDateChanged: false });
    expect(fixture.estimate('fixed')).toBe('350000');
    expect(fixture.estimate('last_settled')).toBe('400000');
    expect(fixture.estimate('rolling_3')).toBe('350000');
    expect(fixture.alert('500000')).toBe(true);
    expect(fixture.alert('300000')).toBe(false);
    expect(fixture.alert('400000')).toBe(false);
    expect(fixture.businessRules()).toMatchObject({
      transferSpending: false,
      pendingActual: false,
      pendingStatus: 'matched_pending',
      autoPay: false,
    });
    expect(fixture.detail().route).toBe('/transactions');
    expect(fixture.retry()).toMatchObject({ kind: 'refreshed' });
  });

  it('returns safe deterministic results for offline, conflict, permission, and kill switches', () => {
    expect(createRecurringFixture('offline').save(validDraft)).toMatchObject({ status: 'queued' });
    expect(createRecurringFixture('rule_conflict').save(validDraft)).toMatchObject({
      status: 'conflict',
      copy: expect.stringContaining('salinan'),
    });
    expect(createRecurringFixture('permission_revoked').save(validDraft)).toMatchObject({
      status: 'read-only',
    });
    expect(createRecurringFixture('materialization_failure').retry()).toEqual({
      kind: 'incremental_retry',
    });
    expect(createRecurringFixture('matching_kill_switch').reminder()).toMatchObject({
      kind: 'manual_review',
      copy: expect.not.stringContaining('350000'),
    });
    expect(createRecurringFixture('push_kill_switch').reminder()).toMatchObject({
      kind: 'local_list',
    });
  });

  it.each([
    ['loading', /Memuat recurring/],
    ['empty', /Belum ada recurring/],
    ['offline', /Offline/],
    ['stale', /stale/],
    ['partial', /Bagian ini perlu dicoba lagi/],
    ['variable_estimate', /estimasi variabel/],
    ['matched_pending', /matched_pending/],
    ['paid', /paid/],
    ['due', /due/],
    ['overdue', /overdue/],
    ['skipped', /skipped/],
    ['snoozed', /snoozed/],
    ['archived_paused', /arsip/],
    ['permission_revoked', /read-only/],
    ['materialization_failure', /materialization/],
    ['rule_conflict', /konflik/],
    ['matching_kill_switch', /manual review/],
    ['push_kill_switch', /local list/],
    ['invalid', /tidak valid/],
  ] as const)('renders %s with recovery copy and live controls', (scenario, expected) => {
    renderRecurring(scenario);
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Sembunyikan nominal' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Sembunyikan nominal' }));
    expect(screen.getByRole('button', { name: 'Nominal disembunyikan' })).toBeTruthy();
  });

  it('supports list, wizard, occurrence, drill-down, and deterministic actions without dead buttons', () => {
    renderRecurring();
    fireEvent.press(screen.getByRole('button', { name: 'Buat recurring' }));
    expect(screen.getByText('Wizard recurring (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Simpan recurring fixture' }));
    expect(screen.getByText('Recurring tersimpan sebagai fixture.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Cek occurrence' }));
    expect(screen.getByText('Occurrence detail (fixture)')).toBeTruthy();
    for (const name of [
      'Konfirmasi match',
      'Unmatch occurrence',
      'Lewati occurrence',
      'Snooze reminder',
      'Edit occurrence',
      'Edit future occurrences',
    ]) {
      fireEvent.press(screen.getByRole('button', { name }));
    }
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke daftar recurring' }));
    fireEvent.press(screen.getByRole('button', { name: 'Buka detail recurring' }));
    fireEvent.press(screen.getByRole('button', { name: 'Lihat histori recurring' }));
    expect(screen.getByText('Histori tetap tersedia sebagai fixture.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Buka transaksi fixture' }));
    expect(screen.getByText(/Transaksi fixture siap ditinjau/)).toBeTruthy();
    expect(RECURRING_LAYOUT.minimumWidth).toBe(320);
    expect(RECURRING_LAYOUT.minimumTouchTarget).toBeGreaterThanOrEqual(48);
  });

  it('covers wizard editing, cadence/mode controls, retries, and list filters', () => {
    renderRecurring('partial');
    fireEvent.press(screen.getByRole('button', { name: 'Coba lagi recurring' }));
    fireEvent.press(screen.getByRole('button', { name: 'Buat recurring' }));
    fireEvent.changeText(screen.getByLabelText('Nama recurring'), 'Listrik rumah');
    fireEvent.changeText(screen.getByLabelText('Nominal recurring'), '450000');
    for (const label of ['daily', 'weekly', 'monthly', 'yearly'])
      fireEvent.press(screen.getByRole('button', { name: label }));
    fireEvent.press(screen.getByRole('button', { name: 'fixed dipilih' }));
    fireEvent.press(screen.getByRole('button', { name: 'last_settled' }));
    fireEvent.press(screen.getByRole('button', { name: 'rolling_3' }));
    fireEvent.press(screen.getByRole('button', { name: 'Opt-in reminder fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Matikan reminder fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke daftar recurring' }));
    fireEvent.press(screen.getByRole('button', { name: 'Salin recurring sebelumnya' }));
    fireEvent.press(screen.getByRole('button', { name: 'Urutkan recurring' }));
    fireEvent.press(screen.getByRole('button', { name: 'Tampilkan recurring arsip' }));
    fireEvent.press(screen.getByRole('button', { name: 'Sembunyikan recurring arsip' }));
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('covers invalid wizard recovery and reminder kill-switch actions', () => {
    renderRecurring('matching_kill_switch');
    fireEvent.press(screen.getByRole('button', { name: 'Gunakan manual review' }));
    fireEvent.press(screen.getByRole('button', { name: 'Buat recurring' }));
    fireEvent.changeText(screen.getByLabelText('Nominal recurring'), '0');
    fireEvent.press(screen.getByRole('button', { name: 'Simpan recurring fixture' }));
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('does not call network or logging APIs and preserves safe static navigation', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    renderRecurring('partial');
    fireEvent.press(screen.getByRole('button', { name: 'Coba lagi recurring' }));
    fireEvent.press(screen.getByRole('button', { name: 'Segarkan fixture' }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    logSpy.mockRestore();
  });
});
