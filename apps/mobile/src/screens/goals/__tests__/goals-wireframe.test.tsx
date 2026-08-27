import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { GoalsWireframe } from '../goals-wireframe';
import {
  GOAL_LAYOUT,
  calculateGoalProgress,
  createGoalsFixture,
  formatGoalMoney,
  requiredPeriodicMinor,
  validateGoalDraft,
  type GoalDraft,
  type GoalScenario,
} from '../goals-fixture';

jest.setTimeout(30000);

function renderGoals(scenario?: GoalScenario) {
  return render(
    <ThemeProvider reducedMotion>
      <GoalsWireframe fixture={createGoalsFixture(scenario)} />
    </ThemeProvider>,
  );
}

const validDraft: GoalDraft = {
  name: 'Dana liburan',
  kind: 'savings',
  currency: 'IDR',
  targetMinor: '5000000',
  startDate: '2026-08-01',
  deadline: '2026-12-31',
  cadence: 'monthly',
  customPeriodDays: null,
  linkedAccountIds: ['account-cash-fixture'],
  reminderOptIn: false,
  icon: 'savings',
  color: 'mint',
};

describe('U15 F12 goals and sinking funds wireframe', () => {
  it('connects F12 to authenticated Planning route and manifest', async () => {
    expect(ROUTE_MANIFEST.find((entry) => entry.featureId === 'F12')).toMatchObject({
      routeId: 'goals',
      path: '/planning/goals',
      navigationGroup: 'planning',
      tab: 'planning',
      title: 'Tujuan & sinking funds',
      readiness: 'WIREFRAME READY',
    });
    expect(GOAL_LAYOUT).toMatchObject({ minimumWidth: 320, minimumTouchTarget: 48 });
    defaultSessionAdapter.setSignedIn();
    renderRouter('app', { initialUrl: '/planning/goals' });
    expect(await routerScreen.findByText('Goals (fixture)')).toBeTruthy();
  });

  it('lists active goals by default and supports lifecycle actions', () => {
    const fixture = createGoalsFixture();
    expect(fixture.list().items).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: 'active' })]),
    );
    expect(fixture.list().items).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ status: 'archived' })]),
    );
    expect(fixture.filterStatus('archived').items).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: 'archived' })]),
    );
    expect(fixture.copyPrevious()).toMatchObject({
      kind: 'copied',
      name: expect.stringContaining('(salinan)'),
    });
    expect(fixture.pause('goal-travel')).toMatchObject({ kind: 'paused' });
    expect(fixture.complete('goal-travel')).toMatchObject({ kind: 'completed' });
    expect(fixture.archive('goal-travel', true)).toMatchObject({ kind: 'archived' });
    expect(fixture.reopen('goal-travel')).toMatchObject({ kind: 'reopened' });
    expect(fixture.reorder('goal-travel', 0)).toMatchObject({ kind: 'reordered' });
  });

  it('validates draft fields and previews mathematical periodic need', () => {
    expect(validateGoalDraft(validDraft)).toEqual([]);
    expect(
      validateGoalDraft({ ...validDraft, name: ' ', targetMinor: '0', currency: 'idr' }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Nama'),
        expect.stringContaining('target'),
        expect.stringContaining('currency'),
      ]),
    );
    expect(validateGoalDraft({ ...validDraft, deadline: '2026-07-31' })).toEqual(
      expect.arrayContaining([expect.stringContaining('deadline')]),
    );
    expect(validateGoalDraft({ ...validDraft, cadence: 'custom', customPeriodDays: 0 })).toEqual(
      expect.arrayContaining([expect.stringContaining('cadence')]),
    );
    expect(createGoalsFixture().preview(validDraft)).toMatchObject({
      firstPeriod: expect.any(String),
      requiredLabel: expect.stringContaining('perkiraan matematis'),
    });
    expect(formatGoalMoney('125000', 'IDR')).toContain('Rp');
    expect(formatGoalMoney('125000.5', 'IDR')).toBeNull();
  });

  it('computes contribution, withdrawal, pending, remaining, overfunding and milestones with BigInt', () => {
    expect(
      calculateGoalProgress({
        targetMinor: '1000000',
        contributionMinor: '1200000',
        withdrawalMinor: '100000',
        pendingMinor: '50000',
        today: '2026-08-01',
        deadline: '2026-08-31',
        cadence: 'daily',
      }),
    ).toMatchObject({
      currentMinor: '1100000',
      pendingMinor: '50000',
      remainingMinor: '0',
      overfundedMinor: '100000',
      visualProgressPercent: 100,
      progressLabel: expect.stringContaining('overfunded'),
      status: 'overfunded',
    });
    expect(
      calculateGoalProgress({
        targetMinor: '1000000',
        contributionMinor: '100000',
        withdrawalMinor: '150000',
        pendingMinor: '0',
        today: '2026-08-01',
        deadline: null,
        cadence: 'monthly',
      }).visualProgressPercent,
    ).toBe(0);
    expect(
      calculateGoalProgress({
        targetMinor: '1000000',
        contributionMinor: '200000',
        withdrawalMinor: '0',
        pendingMinor: '0',
        today: '2026-08-31',
        deadline: '2026-08-31',
        cadence: 'monthly',
      }).requiredMinor,
    ).toBeNull();
    expect(
      calculateGoalProgress({
        targetMinor: '1000000',
        contributionMinor: '200000',
        withdrawalMinor: '0',
        pendingMinor: '0',
        today: '2026-09-01',
        deadline: '2026-08-31',
        cadence: 'weekly',
      }).status,
    ).toBe('past_due_active');
    expect(requiredPeriodicMinor('600000', '2026-08-01', '2026-08-31', 'daily')).toBe('19355');
    expect(requiredPeriodicMinor('600000', '2026-08-01', '2026-08-31', 'weekly')).toBe('120000');
  });

  it('keeps allocation explicit, capped, and separate from income or withdrawal', () => {
    const fixture = createGoalsFixture();
    expect(fixture.businessRules()).toMatchObject({
      transferIncome: false,
      transferCashflow: false,
      draftCounted: false,
      voidCounted: false,
      missingFxCount: 1,
    });
    expect(fixture.candidateTransfers()).toEqual(
      expect.arrayContaining([expect.objectContaining({ selectable: true })]),
    );
    expect(fixture.allocate('transfer-candidate', '200000', '500000', true)).toMatchObject({
      kind: 'applied',
      contribution: true,
      noAutoCount: true,
    });
    expect(fixture.allocate('transfer-candidate', '600000', '500000', true)).toMatchObject({
      kind: 'rejected_mutation',
      reason: expect.stringContaining('melebihi'),
    });
    expect(fixture.allocate('transfer-candidate', '200000', '500000', false)).toMatchObject({
      kind: 'review_required',
    });
    expect(fixture.withdraw('100000', false)).toMatchObject({ kind: 'confirmation_required' });
    expect(fixture.withdraw('100000', true)).toMatchObject({ kind: 'withdrawn' });
  });

  it('exposes detail/history, offline conflict, and recovery states safely', () => {
    const fixture = createGoalsFixture();
    expect(fixture.detail('goal-travel')).toMatchObject({
      formula: expect.stringContaining('remaining'),
      transactionRoute: '/transactions',
      milestones: expect.arrayContaining([25, 50, 75, 100]),
    });
    expect(fixture.targetHistory('goal-travel')).toEqual(expect.any(Array));
    expect(createGoalsFixture('offline').save(validDraft)).toMatchObject({
      kind: 'queued',
      syncStatus: 'pending-sync',
    });
    expect(createGoalsFixture('conflict').save(validDraft)).toMatchObject({
      kind: 'conflict_copy',
      name: expect.stringContaining('(salinan)'),
    });
    expect(createGoalsFixture('permission_revoked').readOnly()).toMatchObject({
      kind: 'read_only',
    });
    expect(createGoalsFixture('too_many_lines').recovery()).toMatchObject({ kind: 'guidance' });
    expect(createGoalsFixture('stale').retry()).toMatchObject({ kind: 'refreshed' });
    expect(createGoalsFixture('reminder_kill_switch').reminder()).toMatchObject({
      kind: 'manual_only',
    });
  });

  it('renders every deterministic state, privacy masking, wizard, and live actions', () => {
    const cases: [GoalScenario, RegExp][] = [
      ['loading', /Memuat goal/],
      ['empty', /Belum ada goal/],
      ['offline', /Offline/],
      ['stale', /stale/],
      ['partial', /Bagian ini perlu dicoba lagi/],
      ['missing_fx', /belum memiliki kurs/],
      ['invalid_legacy', /tidak dapat digunakan/],
      ['permission_revoked', /read-only/],
      ['archived_paused', /arsip/],
      ['overfunded', /overfunded/],
      ['past_due_active', /past_due_active/],
      ['reminder_kill_switch', /reminder/i],
      ['too_many_lines', /terlalu banyak/i],
    ];
    for (const [scenario, copy] of cases) {
      const rendered = renderGoals(scenario);
      expect(screen.getAllByText(copy).length).toBeGreaterThan(0);
      rendered.unmount();
    }
    renderGoals();
    fireEvent.press(screen.getByRole('button', { name: 'Sembunyikan nominal' }));
    expect(screen.getByText(/Nominal disembunyikan/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Buat goal' }));
    expect(screen.getByText('Wizard goal (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke daftar goal' }));
    expect(screen.getByText('Goals (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Buat goal' }));
    fireEvent.press(screen.getByRole('button', { name: 'Simpan goal' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Goals (fixture)')).toBeTruthy();
    expect(screen.getByText(/Minimum 320dp/)).toBeTruthy();
  });

  it('keeps retry and reminder controls offline without network or sensitive logging', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    renderGoals('partial');
    fireEvent.press(screen.getByRole('button', { name: 'Coba lagi goal' }));
    fireEvent.press(screen.getByRole('button', { name: 'Segarkan fixture' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('covers detail drill-down, wizard editing, and every live CTA', () => {
    const onDrillDown = jest.fn();
    const rendered = render(
      <ThemeProvider reducedMotion>
        <GoalsWireframe fixture={createGoalsFixture()} onDrillDown={onDrillDown} />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Buka detail goal' }));
    fireEvent.press(screen.getByRole('button', { name: 'Tambah kontribusi' }));
    fireEvent.press(screen.getByRole('button', { name: 'Tarik dana' }));
    fireEvent.press(screen.getByRole('button', { name: 'Lihat riwayat target' }));
    fireEvent.press(screen.getByRole('button', { name: 'Lihat transaksi fixture' }));
    expect(onDrillDown).toHaveBeenCalledWith('/transactions');
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke daftar goal' }));
    fireEvent.press(screen.getByRole('button', { name: 'Salin goal sebelumnya' }));
    fireEvent.press(screen.getByRole('button', { name: 'Urutkan goal' }));
    fireEvent.press(screen.getByRole('button', { name: 'Tampilkan goal arsip' }));
    fireEvent.press(screen.getByRole('button', { name: 'Buka kembali goal' }));
    fireEvent.press(screen.getByRole('button', { name: 'Buat goal' }));
    fireEvent.changeText(screen.getByDisplayValue('Goal baru'), 'Goal fixture');
    fireEvent.changeText(screen.getByDisplayValue('1000000'), '2000000');
    fireEvent.press(screen.getByRole('button', { name: 'Harian' }));
    fireEvent.press(screen.getByRole('button', { name: 'Mingguan' }));
    fireEvent.press(screen.getByRole('button', { name: 'Custom' }));
    fireEvent.press(screen.getByRole('button', { name: 'Pilih sinking fund' }));
    fireEvent.press(screen.getByRole('button', { name: 'Opt-in reminder' }));
    fireEvent.press(screen.getByRole('button', { name: 'Simpan goal' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    rendered.unmount();
  });

  it('covers schedule and invalid aggregate boundaries without floating money', () => {
    expect(requiredPeriodicMinor('600000', '2026-08-01', '2026-08-31', 'monthly')).toBe('300000');
    expect(requiredPeriodicMinor('600000', '2026-08-01', '2026-08-31', 'custom', 10)).toBe(
      '150000',
    );
    expect(requiredPeriodicMinor('0', '2026-08-01', '2026-08-31', 'daily')).toBeNull();
    expect(requiredPeriodicMinor('600000', 'bad', '2026-08-31', 'daily')).toBeNull();
    expect(() =>
      calculateGoalProgress({
        targetMinor: '0',
        contributionMinor: '1',
        withdrawalMinor: '0',
        pendingMinor: '0',
        today: '2026-08-01',
        deadline: null,
        cadence: 'daily',
      }),
    ).toThrow();
    expect(
      validateGoalDraft({
        ...validDraft,
        linkedAccountIds: [],
        cadence: 'custom',
        customPeriodDays: 367,
      }),
    ).toEqual(
      expect.arrayContaining([expect.stringContaining('akun'), expect.stringContaining('cadence')]),
    );
  });
});
