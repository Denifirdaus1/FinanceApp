import { fireEvent, render, screen } from '@testing-library/react-native';

import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { ConnectionsWireframe } from '../connections-wireframe';
import {
  createConnectionsFixture,
  type ConnectionScenario,
} from '../connections-fixture';

describe('U25 F22 bank and e-wallet sync wireframe', () => {
  it('keeps the F22 route authenticated and ready in the manifest', () => {
    expect(ROUTE_MANIFEST).toContainEqual(
      expect.objectContaining({
        featureId: 'F22',
        path: '/profile/connections',
        navigationGroup: 'profile',
        readiness: 'WIREFRAME READY',
      }),
    );
  });

  it('discloses consent before connect and keeps it read-only', () => {
    const fixture = createConnectionsFixture('consent_required');
    expect(fixture.consent()).toEqual(
      expect.objectContaining({
        granted: false,
        scope: 'read_only',
        providerClass: 'fixture_provider',
        retention: 'session_fixture',
      }),
    );
    expect(fixture.consent().disclosure).toContain('read-only');
    expect(fixture.consent().credentialsHandledByProvider).toBe(true);
  });

  it.each<ConnectionScenario>([
    'callback_loading',
    'callback_cancelled',
    'state_mismatch',
    'forbidden',
    'callback_error',
  ])('resolves hosted callback scenario %s without raw callback data', (scenario) => {
    const callback = createConnectionsFixture(scenario).callback();
    expect(callback.kind).toBe(scenario.replace('callback_', '') === 'loading' ? 'loading' : expect.any(String));
    expect(callback.renderedSensitiveData).toBe(false);
    expect(JSON.stringify(callback)).not.toMatch(/token|secret|password|pin|otp|account[_ -]?id/i);
    if (scenario === 'callback_loading' || scenario === 'callback_cancelled') {
      expect(callback.opaqueConnectionRef).toBeUndefined();
    }
  });

  it('discovers safe accounts and maps to existing or new account', () => {
    const fixture = createConnectionsFixture('discovery');
    expect(fixture.discoverAccounts()).toEqual([
      expect.objectContaining({ label: expect.any(String), sensitiveData: false }),
    ]);
    expect(fixture.mapAccount('existing')).toEqual(
      expect.objectContaining({ mapped: true, destination: 'existing_account' }),
    );
    expect(fixture.mapAccount('new')).toEqual(
      expect.objectContaining({ mapped: true, destination: 'new_account' }),
    );
  });

  it('keeps initial sync in staging and exposes progress', () => {
    const progress = createConnectionsFixture('syncing').initialSync();
    expect(progress).toEqual(
      expect.objectContaining({ staging: true, ledgerWritten: false, progressBucket: 'partial' }),
    );
  });

  it.each(['active', 'reauth_required', 'pending', 'disconnected'] as const)(
    'exposes health state %s',
    (scenario) => expect(createConnectionsFixture(scenario).health().state).toBe(scenario),
  );

  it('labels provider outage and stale last-known snapshot without zero fallback', () => {
    const snapshot = createConnectionsFixture('provider_outage').staleSnapshot();
    expect(snapshot).toEqual(
      expect.objectContaining({ stale: true, zeroFallback: false, source: 'last_known_fixture' }),
    );
  });

  it.each(['cursor_error', 'webhook_replay', 'replay_error'] as const)(
    'surfaces cursor/webhook recovery for %s',
    (scenario) => expect(createConnectionsFixture(scenario).integrationEvent().kind).toBe(scenario),
  );

  it('links staging review, pending-to-posted provenance and duplicate review', () => {
    const fixture = createConnectionsFixture('reconciliation');
    expect(fixture.reviewLink()).toEqual({ path: '/transactions/review', sensitiveParams: false });
    expect(fixture.pendingPostedMerge()).toEqual(
      expect.objectContaining({ merged: true, stagingOnly: true, duplicate: false }),
    );
    expect(fixture.provenance('reversal')).toEqual(
      expect.objectContaining({ kind: 'reversal', source: 'provider_fixture' }),
    );
    expect(fixture.duplicateReview()).toEqual(
      expect.objectContaining({ requiresReview: true, autoMerged: false }),
    );
  });

  it('supports consent expiry, revoke, and an explicit retain/delete choice safely', () => {
    const fixture = createConnectionsFixture('consent_expired');
    expect(fixture.revokeConsent()).toEqual(
      expect.objectContaining({ syncStopped: true, historicalChoiceRequired: true }),
    );
    expect(fixture.disconnect('retain')).toEqual(
      expect.objectContaining({ historicalChoice: 'retain', actualDeletion: false }),
    );
    expect(fixture.disconnect('delete')).toEqual(
      expect.objectContaining({ historicalChoice: 'delete', actualDeletion: false }),
    );
  });

  it('provides CSV fallback, kill switch, and offline read-only behavior', () => {
    const fixture = createConnectionsFixture('offline');
    expect(fixture.csvFallback()).toEqual({ available: true, route: '/profile/import-export' });
    expect(fixture.killSwitch()).toEqual(
      expect.objectContaining({ connectEnabled: false, historicalView: true }),
    );
    expect(fixture.offlineSnapshot()).toEqual(
      expect.objectContaining({ readOnly: true, connectOnlineRequired: true }),
    );
  });

  it('returns deterministic retry results and safe metadata only', () => {
    const fixture = createConnectionsFixture('callback_error');
    expect(fixture.retry()).toEqual(fixture.retry());
    expect(fixture.retry().networkCalled).toBe(false);
    expect(fixture.safeMetadata()).toEqual(
      expect.objectContaining({ entityType: 'connection', status: 'fixture_review' }),
    );
    expect(JSON.stringify(fixture.safeMetadata())).not.toMatch(/amount|balance|merchant|raw|token|id/i);
  });

  it('renders accessible controls and every primary CTA produces a visible result', () => {
    render(<ConnectionsWireframe fixture={createConnectionsFixture('consent_required')} />);
    expect(screen.getByLabelText('Bank and e-wallet connections fixture')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review consent' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Review consent' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Consent fixture siap ditinjau.');
    expect(screen.getByText(/320dp/)).toBeTruthy();
  });
});
