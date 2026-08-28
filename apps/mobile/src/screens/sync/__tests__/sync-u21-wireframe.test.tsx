import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { SyncWireframe } from '../sync-wireframe';
import { createOfflineFirstFixture, type OfflineFirstScenario } from '../sync-fixture';

describe('U21 F18 offline-first synchronization wireframe contracts', () => {
  it('exposes safe queue metadata, scope separation, ordering, and idempotency', () => {
    const fixture = createOfflineFirstFixture('offline');
    const queue = fixture.safeQueueMetadata();

    expect(queue.length).toBeGreaterThan(0);
    expect(queue[0]).toMatchObject({
      scope: expect.stringMatching(/user|household/),
      order: expect.stringMatching(/ordered|blocked/),
      idempotency: 'stable',
    });
    expect(JSON.stringify(queue)).not.toMatch(
      /payload|amount|merchant|note|entity.?id|token|account.?id|household.?id/i,
    );
  });

  it.each([
    ['airplane', 'offline'],
    ['slow', 'retry_after'],
    ['flapping', 'backoff'],
    ['online', 'success'],
  ] as [OfflineFirstScenario, string][])('classifies %s deterministically', (scenario, kind) => {
    const fixture = createOfflineFirstFixture(scenario);
    expect(fixture.networkSnapshot().mode).toBe(scenario);
    expect(fixture.retryMutation('stable-mutation')).toMatchObject({ kind, idempotent: true });
    expect(fixture.retryMutation('stable-mutation')).toEqual(
      fixture.retryMutation('stable-mutation'),
    );
  });

  it('keeps aggregate ordering atomic and resumes after lease or force-close recovery', () => {
    const fixture = createOfflineFirstFixture('lease_crashed');
    expect(fixture.aggregateSnapshot()).toMatchObject({
      atomic: true,
      partial: false,
      ordering: 'per_aggregate',
    });
    expect(fixture.recoverySnapshot()).toMatchObject({
      resumable: true,
      duplicateSafe: true,
    });
  });

  it('requires review for finance-critical conflicts but auto-merges disjoint fields', () => {
    expect(createOfflineFirstFixture('auto_merge').conflictSnapshot()).toMatchObject({
      mode: 'auto_merge',
      requiresReview: false,
    });
    expect(createOfflineFirstFixture('critical_conflict').conflictSnapshot()).toMatchObject({
      mode: 'review',
      criticalField: 'amount',
      requiresReview: true,
      blindLastWriteWins: false,
    });
  });

  it('keeps revocation locked and exposes safe purge plus schema diagnostics', () => {
    const revoked = createOfflineFirstFixture('revoked');
    expect(revoked.accessSnapshot()).toMatchObject({ locked: true, purgeIsReal: false });
    expect(revoked.purgeAccess(true)).toMatchObject({ actualDeletion: false });

    const incompatible = createOfflineFirstFixture('schema_incompatible');
    expect(incompatible.schemaSnapshot()).toMatchObject({ pushBlocked: true });
    expect(incompatible.exportDiagnostic()).toMatchObject({ includesPayload: false });
  });

  it('handles pull cursor pages and corrupt cursor safely without exposing identifiers', () => {
    const fixture = createOfflineFirstFixture('cursor_corrupt');
    expect(fixture.pullPage('bad-cursor')).toMatchObject({
      cursorAccepted: false,
      recovery: 'restart_safe_cursor',
      tombstonesIncluded: true,
    });
    expect(JSON.stringify(fixture.pullPage('bad-cursor'))).not.toMatch(
      /entity.?id|account.?id|household.?id|transaction|amount/i,
    );
  });

  it('separates user and household scope and represents key/database health safely', () => {
    const fixture = createOfflineFirstFixture('database_corrupt');
    expect(fixture.scopeSnapshot()).toMatchObject({ user: 'available', household: 'locked' });
    expect(fixture.databaseSnapshot()).toMatchObject({
      keyState: 'corrupt',
      persistenceImplemented: false,
    });
  });

  it('renders U21 recovery controls with accessible, visible deterministic results', () => {
    render(
      <ThemeProvider reducedMotion>
        <SyncWireframe fixture={createOfflineFirstFixture('flapping')} />
      </ThemeProvider>,
    );

    expect(screen.getByText('Sinkronisasi (fixture)')).toBeTruthy();
    expect(screen.getByText(/Mode jaringan/)).toBeTruthy();
    expect(screen.getByText(/Diagnostic aman/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Retry sync' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Open diagnostic preview' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/320dp/)).toBeTruthy();
  });
});
