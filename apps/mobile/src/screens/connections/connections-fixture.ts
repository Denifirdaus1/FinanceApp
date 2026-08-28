export const CONNECTIONS_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  contentMaxWidth: 720,
} as const;

export type ConnectionScenario =
  | 'ready'
  | 'consent_required'
  | 'callback_loading'
  | 'callback_cancelled'
  | 'state_mismatch'
  | 'forbidden'
  | 'callback_error'
  | 'discovery'
  | 'mapping'
  | 'syncing'
  | 'active'
  | 'reauth_required'
  | 'pending'
  | 'disconnected'
  | 'provider_outage'
  | 'cursor_error'
  | 'webhook_replay'
  | 'replay_error'
  | 'reconciliation'
  | 'duplicates'
  | 'consent_expired'
  | 'revoked'
  | 'offline'
  | 'kill_switch';

export type ConnectionHealth = 'active' | 'reauth_required' | 'pending' | 'disconnected';
export type DisconnectChoice = 'retain' | 'delete';
export type CallbackState =
  'loading' | 'cancelled' | 'state_mismatch' | 'forbidden' | 'error' | 'ready';

const CALLBACK_STATES: Record<ConnectionScenario, CallbackState> = {
  ready: 'ready',
  consent_required: 'ready',
  callback_loading: 'loading',
  callback_cancelled: 'cancelled',
  state_mismatch: 'state_mismatch',
  forbidden: 'forbidden',
  callback_error: 'error',
  discovery: 'ready',
  mapping: 'ready',
  syncing: 'ready',
  active: 'ready',
  reauth_required: 'ready',
  pending: 'ready',
  disconnected: 'ready',
  provider_outage: 'ready',
  cursor_error: 'ready',
  webhook_replay: 'ready',
  replay_error: 'ready',
  reconciliation: 'ready',
  duplicates: 'ready',
  consent_expired: 'ready',
  revoked: 'ready',
  offline: 'ready',
  kill_switch: 'ready',
};

const HEALTH_SCENARIOS: Partial<Record<ConnectionScenario, ConnectionHealth>> = {
  active: 'active',
  reauth_required: 'reauth_required',
  pending: 'pending',
  disconnected: 'disconnected',
};

function callbackMessage(kind: CallbackState): string {
  if (kind === 'loading') return 'Callback fixture sedang diproses.';
  if (kind === 'cancelled') return 'Connect dibatalkan; tidak ada koneksi dibuat.';
  if (kind === 'state_mismatch') return 'Callback tidak cocok; ulangi connect dengan aman.';
  if (kind === 'forbidden') return 'Provider menolak akses; gunakan fallback CSV.';
  if (kind === 'error') return 'Provider tidak tersedia; retry atau gunakan fallback CSV.';
  return 'Callback fixture berhasil; lanjutkan peninjauan koneksi.';
}

export function createConnectionsFixture(scenario: ConnectionScenario = 'consent_required') {
  let consentGranted = scenario !== 'consent_required';
  let mappedDestination: 'existing_account' | 'new_account' | null = null;
  let retryResult: ReturnType<typeof retryFor> | null = null;

  return {
    scenario,
    consent() {
      return {
        granted: consentGranted,
        scope: 'read_only' as const,
        disclosure: 'Connect hanya meminta read-only untuk meninjau data fixture.',
        providerClass: 'fixture_provider' as const,
        cadence: 'manual_or_daily_fixture' as const,
        retention: 'session_fixture' as const,
        credentialsHandledByProvider: true as const,
        noNativeOAuth: true as const,
      };
    },
    grantConsent() {
      consentGranted = true;
      return { kind: 'consent_granted' as const, connectOnlineRequired: true as const };
    },
    revokeConsent() {
      consentGranted = false;
      return {
        kind: 'consent_revoked' as const,
        syncStopped: true as const,
        historicalChoiceRequired: true as const,
        actualDeletion: false as const,
      };
    },
    callback() {
      const kind = CALLBACK_STATES[scenario];
      return {
        kind,
        message: callbackMessage(kind),
        opaqueConnectionRef: kind === 'ready' ? ('opaque-fixture-ref' as const) : undefined,
        renderedSensitiveData: false as const,
        rawCallbackPersisted: false as const,
      };
    },
    discoverAccounts() {
      return [
        {
          label: 'Akun terdeteksi 1',
          currencyBucket: 'base_currency',
          sensitiveData: false as const,
        },
        {
          label: 'Akun terdeteksi 2',
          currencyBucket: 'base_currency',
          sensitiveData: false as const,
        },
      ];
    },
    mapAccount(destination: 'existing' | 'new') {
      mappedDestination = destination === 'existing' ? 'existing_account' : 'new_account';
      return {
        mapped: true as const,
        destination: mappedDestination,
        sensitiveData: false as const,
      };
    },
    initialSync() {
      return {
        staging: true as const,
        ledgerWritten: false as const,
        progressBucket: scenario === 'syncing' ? ('partial' as const) : ('complete' as const),
        historicalRange: 'fixture_window' as const,
      };
    },
    health() {
      return {
        state: HEALTH_SCENARIOS[scenario] ?? ('pending' as const),
        providerAvailable: scenario !== 'provider_outage',
        reconnectRequired: scenario === 'reauth_required' || scenario === 'consent_expired',
      };
    },
    staleSnapshot() {
      return {
        stale: true as const,
        source: 'last_known_fixture' as const,
        zeroFallback: false as const,
        valueKnown: true as const,
        providerOutage: scenario === 'provider_outage',
      };
    },
    integrationEvent() {
      const kind =
        scenario === 'cursor_error' || scenario === 'webhook_replay' || scenario === 'replay_error'
          ? scenario
          : 'replay_error';
      return {
        kind,
        cursorAccepted: kind !== 'cursor_error',
        webhookReplaySafe: kind === 'webhook_replay',
        recovery: kind === 'replay_error' ? 'manual_review' : 'retry_fixture',
      } as const;
    },
    pendingPostedMerge() {
      return {
        merged: true as const,
        stagingOnly: true as const,
        duplicate: false as const,
        provenanceVisible: true as const,
      };
    },
    duplicateReview() {
      return {
        requiresReview: true as const,
        autoMerged: false as const,
        linkToReview: '/transactions/review' as const,
      };
    },
    reviewLink() {
      return { path: '/transactions/review' as const, sensitiveParams: false as const };
    },
    provenance(kind: 'reversal' | 'refund' | 'pending_posted') {
      return { kind, source: 'provider_fixture' as const, originalPreserved: true as const };
    },
    disconnect(choice: DisconnectChoice) {
      return {
        kind: 'disconnected' as const,
        historicalChoice: choice,
        futureSyncStopped: true as const,
        actualDeletion: false as const,
        historyStillReadable: choice === 'retain',
      };
    },
    csvFallback() {
      return { available: true as const, route: '/profile/import-export' as const };
    },
    killSwitch() {
      return {
        connectEnabled: false as const,
        syncEnabled: false as const,
        historicalView: true as const,
        manualFallback: true as const,
      };
    },
    offlineSnapshot() {
      return {
        readOnly: true as const,
        connectOnlineRequired: true as const,
        cachedSnapshot: true as const,
        staleLabel: 'as-of fixture terakhir' as const,
      };
    },
    retry() {
      if (!retryResult) retryResult = retryFor(scenario);
      return retryResult;
    },
    safeMetadata() {
      return {
        entityType: 'connection' as const,
        status: 'fixture_review' as const,
        attemptBucket: 'first' as const,
        ageBucket: 'recent' as const,
        providerClass: 'fixture_provider' as const,
        containsPayload: false as const,
      };
    },
    mappedDestination() {
      return mappedDestination;
    },
  };
}

function retryFor(scenario: ConnectionScenario) {
  if (scenario === 'offline')
    return {
      kind: 'offline' as const,
      message: 'Offline: snapshot read-only tetap tersedia.',
      networkCalled: false as const,
    };
  if (scenario === 'forbidden' || scenario === 'revoked')
    return {
      kind: 'access_review' as const,
      message: 'Akses perlu ditinjau ulang.',
      networkCalled: false as const,
    };
  if (
    scenario === 'provider_outage' ||
    scenario === 'callback_error' ||
    scenario === 'replay_error'
  )
    return {
      kind: 'provider_retry' as const,
      message: 'Retry provider fixture tersedia.',
      networkCalled: false as const,
    };
  return {
    kind: 'fixture_refreshed' as const,
    message: 'Fixture diperbarui tanpa network.',
    networkCalled: false as const,
  };
}

export type ConnectionsFixture = ReturnType<typeof createConnectionsFixture>;
