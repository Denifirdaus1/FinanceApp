export const NOTIFICATIONS_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  maximumContentWidth: 720,
} as const;

export const NOTIFICATION_CHANNELS = [
  'recurring_bill',
  'debt_due',
  'budget_threshold',
  'goal_milestone',
  'sync_issue',
  'security',
  'weekly_summary',
] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export type NotificationPermission = 'permission_required' | 'granted' | 'denied' | 'blocked';
export type NotificationPrivacyLevel = 'generic' | 'amount';
export type NotificationScenario =
  | 'ready'
  | NotificationPermission
  | 'loading'
  | 'empty'
  | 'error'
  | 'offline'
  | 'stale'
  | 'unauthorized'
  | 'quiet_hours'
  | 'dst'
  | 'dedupe'
  | 'revoked'
  | 'tampered_link'
  | 'kill_switch'
  | 'widget_default'
  | 'widget_reveal';

export interface NotificationChannelState {
  type: NotificationChannel;
  enabled: boolean;
  delivery: 'local_fixture' | 'push_fixture';
  privacyLevel: 'generic';
  securityRequired: boolean;
}

export interface NotificationPermissionSnapshot {
  state: NotificationPermission;
  requestedJustInTime: true;
  nativePermissionRequested: false;
}

export interface NotificationDeliveryMetadata {
  channel: NotificationChannel;
  outcome: 'delivered' | 'deferred' | 'cancelled';
  ageBucket: 'today' | 'under_7d';
  attemptBucket: 'first' | 'retry';
}

export type PrivacyUpdateResult =
  | { kind: 'unlock_required'; privacyLevel: 'generic' }
  | { kind: 'updated'; privacyLevel: NotificationPrivacyLevel };

const CHANNELS: NotificationChannelState[] = NOTIFICATION_CHANNELS.map((type) => ({
  type,
  enabled: type === 'security' || type === 'recurring_bill',
  delivery: type === 'security' ? 'push_fixture' : 'local_fixture',
  privacyLevel: 'generic',
  securityRequired: type === 'security',
}));

function permissionFor(scenario: NotificationScenario): NotificationPermission {
  if (scenario === 'denied' || scenario === 'blocked' || scenario === 'granted') return scenario;
  return scenario === 'permission_required' ? 'permission_required' : 'granted';
}

export function createNotificationsFixture(scenario: NotificationScenario = 'ready') {
  let privacyLevel: NotificationPrivacyLevel = 'generic';
  const permission = permissionFor(scenario);
  const history: NotificationDeliveryMetadata[] = [
    {
      channel: 'recurring_bill',
      outcome: scenario === 'quiet_hours' ? 'deferred' : 'delivered',
      ageBucket: 'today',
      attemptBucket: 'first',
    },
    {
      channel: 'security',
      outcome: scenario === 'revoked' ? 'cancelled' : 'delivered',
      ageBucket: 'under_7d',
      attemptBucket: 'retry',
    },
  ];

  return {
    scenario,
    permissionSnapshot(): NotificationPermissionSnapshot {
      return { state: permission, requestedJustInTime: true, nativePermissionRequested: false };
    },
    requestPermission(): NotificationPermissionSnapshot {
      const state = permission === 'permission_required' ? 'granted' : permission;
      return { state, requestedJustInTime: true, nativePermissionRequested: false };
    },
    channels(): NotificationChannelState[] {
      return CHANNELS.map((channel) => ({ ...channel }));
    },
    setPrivacyLevel(
      requested: NotificationPrivacyLevel,
      guard: { unlocked: boolean; optIn: boolean } = { unlocked: false, optIn: false },
    ): PrivacyUpdateResult {
      if (requested === 'amount' && (!guard.unlocked || !guard.optIn)) {
        return { kind: 'unlock_required', privacyLevel: 'generic' };
      }
      privacyLevel = requested;
      return { kind: 'updated', privacyLevel };
    },
    quietHoursSnapshot() {
      return {
        timezone: 'Asia/Jakarta' as const,
        quietStart: '22:00' as const,
        quietEnd: '07:00' as const,
        dstSafe: true as const,
        securityBypass: true as const,
      };
    },
    snooze(channel: NotificationChannel) {
      return {
        kind: 'snoozed' as const,
        channel,
        dueDateChanged: false as const,
        reminderKeyStable: true as const,
      };
    },
    hysteresisSnapshot() {
      return { dedupe: true as const, rearmRequiresRecovery: true as const };
    },
    dedupe(_firstDevice: string, _secondDevice: string) {
      return { duplicate: true as const, deliveries: 1 as const, idempotent: true as const };
    },
    deliveryHistory(): NotificationDeliveryMetadata[] {
      return history.map((item) => ({ ...item }));
    },
    invalidToken() {
      return { tokenRemoved: true as const, scheduleCancelled: true as const };
    },
    logout() {
      return { scheduleCancelled: true as const, actualDeletion: false as const };
    },
    revoke() {
      return { locked: true as const, actualPurge: false as const, inAppFallback: true as const };
    },
    resolveDeepLink(_target: string) {
      return { kind: 'safe_fallback' as const, renderedSensitiveData: false as const };
    },
    offlineSnapshot() {
      return {
        cachedVisible: true as const,
        schedulingActive: false as const,
        asOfBucket: 'recent' as const,
        inAppFallback: true as const,
      };
    },
    killSwitch() {
      return {
        newScheduling: false as const,
        inAppFallback: true as const,
        securityVisible: true as const,
      };
    },
    widgetPreview(
      options: { privacyMode: boolean; unlocked: boolean; optIn: boolean } = {
        privacyMode: true,
        unlocked: false,
        optIn: false,
      },
    ) {
      const reveal = !options.privacyMode && options.unlocked && options.optIn;
      return {
        showsAmount: reveal,
        showsAccount: reveal,
        genericCopy: !reveal,
        state: reveal ? ('revealed_opt_in' as const) : ('privacy_default' as const),
      };
    },
    shortcutPreview(action: 'expense' | 'income' | 'voice' | 'receipt') {
      return {
        action,
        destination: 'confirmation' as const,
        autoPosted: false as const,
        nativeShortcutRegistered: false as const,
      };
    },
    retry() {
      return {
        kind: scenario === 'error' ? ('recovered' as const) : ('fixture_refreshed' as const),
        networkCalled: false as const,
      };
    },
  };
}

export type NotificationsFixture = ReturnType<typeof createNotificationsFixture>;
