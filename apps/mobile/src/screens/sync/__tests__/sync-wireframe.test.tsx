import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { SyncWireframe } from '../sync-wireframe';
import {
  createSyncFixture,
  type ConflictChoice,
  type RetryOutcome,
  type SyncScenario,
} from '../sync-fixture';

jest.setTimeout(30000);

function renderWireframe(scenario?: SyncScenario) {
  return render(
    <ThemeProvider reducedMotion>
      <SyncWireframe fixture={createSyncFixture(scenario)} />
    </ThemeProvider>,
  );
}

describe('U09 F18 offline sync wireframe', () => {
  it('connects F18 to the Home route manifest and authenticated Home entry', async () => {
    expect(ROUTE_MANIFEST.find((entry) => entry.featureId === 'F18')).toMatchObject({
      path: '/sync',
      navigationGroup: 'home',
      tab: 'home',
      title: 'Offline-first & sinkronisasi',
      readiness: 'WIREFRAME READY',
    });
    defaultSessionAdapter.setSignedIn();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await routerScreen.findByRole('button', { name: 'Open sync status' }));
    expect(await routerScreen.findByText('Sinkronisasi (fixture)')).toBeTruthy();
  });

  it('exposes every sync status and only safe pending metadata', () => {
    const scenarios: SyncScenario[] = [
      'ready',
      'local_only',
      'loading',
      'empty',
      'offline',
      'needs_review',
      'failed',
      'schema_incompatible',
      'revoked',
      'kill_switch',
      'manual_only',
    ];
    for (const scenario of scenarios) {
      const fixture = createSyncFixture(scenario);
      expect(fixture.status.state).toBeTruthy();
      const safeMetadata = fixture.safePendingMetadata();
      if (scenario === 'empty') {
        expect(safeMetadata).toEqual([]);
      } else {
        expect(safeMetadata).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              entityType: expect.any(String),
              status: expect.any(String),
              retryState: expect.any(String),
              attempts: expect.any(Number),
              ageBucket: expect.any(String),
            }),
          ]),
        );
      }
      const serialized = JSON.stringify(safeMetadata);
      expect(serialized).not.toMatch(/payload|merchant|amount|entityId|token|household|account/i);
    }
  });

  it.each([
    ['ready', 'success'],
    ['offline', 'offline'],
    ['retry_401', 'reauth_required'],
    ['retry_403', 'access_revoked'],
    ['retry_409', 'conflict_review'],
    ['retry_429', 'retry_after'],
    ['retry_5xx', 'backoff'],
    ['non_retryable', 'review_required'],
  ] as [SyncScenario, RetryOutcome['kind']][])(
    'classifies %s retry as %s with deterministic idempotency',
    (scenario, expected) => {
      const fixture = createSyncFixture(scenario);
      const first = fixture.retryMutation(0);
      const second = fixture.retryMutation(0);
      expect(first).toMatchObject({ kind: expected });
      expect(second).toEqual(first);
    },
  );

  it('auto-merges non-overlap but requires explicit review for finance-critical amount', () => {
    expect(createSyncFixture('auto_merge').conflictReview()).toMatchObject({
      mergeAllowed: true,
      criticalFields: [],
    });
    expect(createSyncFixture('auto_merge').resolveConflict('merge')).toMatchObject({
      kind: 'auto_merged',
    });
    const critical = createSyncFixture('critical_conflict');
    expect(critical.conflictReview()).toMatchObject({
      mergeAllowed: false,
      criticalFields: ['amount'],
    });
    expect(critical.resolveConflict('merge')).toMatchObject({ kind: 'review_required' });
    for (const choice of ['device', 'server'] as ConflictChoice[]) {
      expect(critical.resolveConflict(choice)).toMatchObject({ kind: 'resolved' });
    }
  });

  it('keeps revoked scope locked and makes purge/re-auth safe and visible', () => {
    const fixture = createSyncFixture('revoked');
    expect(fixture.status).toMatchObject({ state: 'revoked', scopeLocked: true });
    expect(fixture.purgeAccess(false)).toMatchObject({ kind: 'reauth_required' });
    expect(fixture.purgeAccess(true)).toMatchObject({
      kind: 'purge_queued',
      actualDeletion: false,
      scopeLocked: true,
    });
  });

  it('blocks incompatible schema push and offers safe update/diagnostic actions', () => {
    const fixture = createSyncFixture('schema_incompatible');
    expect(fixture.retryMutation(0)).toMatchObject({ kind: 'schema_blocked' });
    expect(fixture.updateApp()).toMatchObject({ kind: 'update_handoff' });
    expect(fixture.exportDiagnostic()).toMatchObject({
      kind: 'diagnostic_ready',
      includesPayload: false,
    });
  });

  it('renders safe recovery actions, conflict choices, and narrow accessible layout', () => {
    renderWireframe('retry_429');
    expect(screen.getByText('Sinkronisasi (fixture)')).toBeTruthy();
    expect(screen.getByText(/retry-after/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Retry sync' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/Minimum width 320dp/)).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Review conflicts' }));
    expect(screen.getByText('Conflict review (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Use device version' }));
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('renders scenario-specific copy, reduced-motion paths, and back navigation', () => {
    const copies: [SyncScenario, RegExp][] = [
      ['empty', /Belum ada mutation/],
      ['local_only', /Tersimpan di perangkat/],
      ['loading', /Memuat status/],
      ['offline', /Offline:/],
      ['schema_incompatible', /Push diblokir/],
      ['revoked', /Scope terkunci/],
      ['kill_switch', /manual-only/],
      ['manual_only', /manual-only/],
      ['retry_401', /Sesi kedaluwarsa/],
      ['retry_403', /Akses dicabut/],
      ['retry_409', /Perlu diperiksa/],
      ['critical_conflict', /Perlu diperiksa/],
      ['needs_review', /Perlu diperiksa/],
      ['retry_429', /retry-after/],
      ['retry_5xx', /backoff/],
      ['failed', /backoff/],
      ['rollback', /Aggregate rollback/],
      ['auto_merge', /Fixture aman/],
      ['ready', /Fixture aman/],
    ];
    for (const [scenario, copy] of copies) {
      const rendered = renderWireframe(scenario);
      expect(screen.getAllByText(copy).length).toBeGreaterThan(0);
      rendered.unmount();
    }

    const back = jest.fn();
    render(
      <ThemeProvider>
        <SyncWireframe fixture={createSyncFixture()} onBack={back} />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(back).toHaveBeenCalledTimes(1);
    screen.unmount();

    renderWireframe('schema_incompatible');
    fireEvent.press(screen.getByRole('button', { name: 'Update app fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Export safe diagnostic' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    screen.unmount();

    renderWireframe('revoked');
    fireEvent.press(screen.getByRole('button', { name: 'Purge after re-auth' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    screen.unmount();

    renderWireframe('manual_only');
    fireEvent.press(screen.getByRole('button', { name: 'Open manual sync guide' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    screen.unmount();

    renderWireframe('auto_merge');
    fireEvent.press(screen.getByRole('button', { name: 'Review conflicts' }));
    fireEvent.press(screen.getByRole('button', { name: 'Back to sync hub' }));
    expect(screen.getByText('Sinkronisasi (fixture)')).toBeTruthy();
    screen.unmount();
  });

  it('shows schema, revoked, and manual-only actions without network or logging', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    for (const [scenario, button] of [
      ['schema_incompatible', 'Export safe diagnostic'],
      ['revoked', 'Request re-auth'],
      ['kill_switch', 'Open manual sync guide'],
    ] as const) {
      const rendered = renderWireframe(scenario);
      fireEvent.press(screen.getByRole('button', { name: button }));
      expect(screen.getByRole('alert')).toBeTruthy();
      rendered.unmount();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    logSpy.mockRestore();
  });
});
