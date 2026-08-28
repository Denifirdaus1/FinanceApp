import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { NotificationsWireframe } from '../notifications-wireframe';
import {
  createNotificationsFixture,
  type NotificationChannel,
  type NotificationScenario,
} from '../notifications-fixture';

jest.setTimeout(30000);

describe('U22 F19 notifications, widgets, and shortcuts wireframe', () => {
  it('connects F19 to the authenticated Profile route and manifest', async () => {
    expect(ROUTE_MANIFEST.find((entry) => entry.featureId === 'F19')).toMatchObject({
      path: '/notifications',
      navigationGroup: 'profile',
      tab: 'profile',
      readiness: 'WIREFRAME READY',
    });
    defaultSessionAdapter.setSignedIn();
    renderRouter('app', { initialUrl: '/profile' });
    fireEvent.press(await routerScreen.findByRole('button', { name: 'Open notifications' }));
    expect(await routerScreen.findByText('Notifikasi, widget & shortcut (fixture)')).toBeTruthy();
  });

  it('exposes every channel with safe generic defaults', () => {
    const channels = createNotificationsFixture('ready').channels();
    const expected: NotificationChannel[] = [
      'recurring_bill',
      'debt_due',
      'budget_threshold',
      'goal_milestone',
      'sync_issue',
      'security',
      'weekly_summary',
    ];
    expect(channels.map((channel) => channel.type)).toEqual(expected);
    expect(channels.find((channel) => channel.type === 'security')?.enabled).toBe(true);
    expect(JSON.stringify(channels)).not.toMatch(
      /amount|merchant|account|household|token|credential|exact.?date/i,
    );
  });

  it.each([
    ['permission_required', 'permission_required'],
    ['granted', 'granted'],
    ['denied', 'denied'],
    ['blocked', 'blocked'],
  ] as [NotificationScenario, string][])(
    'models %s permission state with a deterministic result',
    (scenario, state) => {
      const fixture = createNotificationsFixture(scenario);
      expect(fixture.permissionSnapshot().state).toBe(state);
      expect(fixture.requestPermission().state).toBeTruthy();
    },
  );

  it('requires opt-in and unlock guard before amount privacy or widget reveal', () => {
    const fixture = createNotificationsFixture('ready');
    expect(fixture.setPrivacyLevel('amount')).toMatchObject({ kind: 'unlock_required' });
    expect(fixture.setPrivacyLevel('amount', { unlocked: true, optIn: true })).toMatchObject({
      kind: 'updated',
      privacyLevel: 'amount',
    });
    expect(fixture.widgetPreview()).toMatchObject({ showsAmount: false, showsAccount: false });
    expect(
      fixture.widgetPreview({ privacyMode: false, unlocked: true, optIn: true }),
    ).toMatchObject({
      showsAmount: true,
      showsAccount: true,
    });
  });

  it('handles quiet hours, DST, snooze, and threshold hysteresis without sensitive copy', () => {
    const fixture = createNotificationsFixture('quiet_hours');
    expect(fixture.quietHoursSnapshot()).toMatchObject({
      timezone: 'Asia/Jakarta',
      quietStart: '22:00',
      quietEnd: '07:00',
      dstSafe: true,
    });
    expect(fixture.snooze('budget_threshold')).toMatchObject({ kind: 'snoozed' });
    expect(fixture.hysteresisSnapshot()).toMatchObject({
      dedupe: true,
      rearmRequiresRecovery: true,
    });
  });

  it('deduplicates the same occurrence across devices and redacts delivery history', () => {
    const fixture = createNotificationsFixture('dedupe');
    expect(fixture.dedupe('device-a', 'device-b')).toMatchObject({
      duplicate: true,
      deliveries: 1,
      idempotent: true,
    });
    expect(JSON.stringify(fixture.deliveryHistory())).not.toMatch(
      /payload|amount|merchant|account|household|token|notification.?id/i,
    );
  });

  it('cancels invalid-token, logout, and revoked schedules safely', () => {
    const fixture = createNotificationsFixture('revoked');
    expect(fixture.invalidToken()).toMatchObject({ tokenRemoved: true, scheduleCancelled: true });
    expect(fixture.logout()).toMatchObject({ scheduleCancelled: true, actualDeletion: false });
    expect(fixture.revoke()).toMatchObject({ locked: true, actualPurge: false });
  });

  it('rejects tampered or stale deep links and uses safe fallback', () => {
    const fixture = createNotificationsFixture('tampered_link');
    expect(fixture.resolveDeepLink('tampered')).toMatchObject({
      kind: 'safe_fallback',
      renderedSensitiveData: false,
    });
    expect(createNotificationsFixture('ready').resolveDeepLink('stale')).toMatchObject({
      kind: 'safe_fallback',
      renderedSensitiveData: false,
    });
  });

  it('keeps offline cached reminders visible and kill switch honest', () => {
    expect(createNotificationsFixture('offline').offlineSnapshot()).toMatchObject({
      cachedVisible: true,
      schedulingActive: false,
      asOfBucket: 'recent',
    });
    expect(createNotificationsFixture('kill_switch').killSwitch()).toMatchObject({
      newScheduling: false,
      inAppFallback: true,
    });
  });

  it('ends every launcher shortcut at explicit capture confirmation', () => {
    const fixture = createNotificationsFixture('ready');
    for (const action of ['expense', 'income', 'voice', 'receipt'] as const) {
      expect(fixture.shortcutPreview(action)).toMatchObject({
        action,
        destination: 'confirmation',
        autoPosted: false,
      });
    }
  });

  it('renders permission, widget, shortcut, and recovery controls accessibly', () => {
    render(
      <ThemeProvider reducedMotion>
        <NotificationsWireframe fixture={createNotificationsFixture('permission_required')} />
      </ThemeProvider>,
    );
    expect(screen.getByText('Notifikasi, widget & shortcut (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Enable reminder permission' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Preview widget' }));
    expect(screen.getAllByText(/Widget preview/).length).toBeGreaterThan(0);
    fireEvent.press(screen.getByRole('button', { name: 'Back to notifications' }));
    fireEvent.press(screen.getByRole('button', { name: 'Open expense shortcut' }));
    expect(screen.getAllByText(/confirmation/).length).toBeGreaterThan(0);
    expect(screen.getByText(/320dp/)).toBeTruthy();
  });

  it('covers status recovery, channel toggles, privacy, history, and safe actions', () => {
    const scenarios: NotificationScenario[] = [
      'ready',
      'granted',
      'denied',
      'blocked',
      'loading',
      'empty',
      'error',
      'offline',
      'stale',
      'unauthorized',
      'quiet_hours',
      'dst',
      'dedupe',
      'revoked',
      'tampered_link',
      'kill_switch',
      'widget_default',
      'widget_reveal',
    ];
    for (const scenario of scenarios) {
      const rendered = render(
        <ThemeProvider>
          <NotificationsWireframe fixture={createNotificationsFixture(scenario)} />
        </ThemeProvider>,
      );
      if (scenario === 'denied' || scenario === 'blocked') {
        fireEvent.press(screen.getByRole('button', { name: 'Open in-app reminder fallback' }));
      }
      if (scenario === 'error' || scenario === 'stale') {
        fireEvent.press(screen.getByRole('button', { name: 'Retry notification settings' }));
      }
      fireEvent.press(screen.getByRole('button', { name: 'Privacy mode aktif' }));
      fireEvent.press(screen.getByRole('button', { name: 'Aktifkan privacy mode' }));
      fireEvent.press(screen.getByRole('button', { name: 'Request amount preview opt-in' }));
      fireEvent.press(screen.getByRole('button', { name: 'Snooze budget reminder' }));
      fireEvent.press(screen.getByRole('button', { name: 'Validate notification link' }));
      fireEvent.press(screen.getByRole('button', { name: 'Open safe fallback' }));
      fireEvent.press(screen.getByRole('button', { name: 'Preview kill-switch result' }));
      for (const channel of [
        'Recurring bill',
        'Debt due',
        'Budget threshold',
        'Goal milestone',
        'Sync issue',
        'Security',
        'Weekly summary',
      ]) {
        fireEvent.press(screen.getByRole('button', { name: new RegExp(channel) }));
      }
      rendered.unmount();
    }

    const rendered = render(
      <ThemeProvider>
        <NotificationsWireframe fixture={createNotificationsFixture()} />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Preview widget' }));
    fireEvent.press(screen.getByRole('button', { name: 'Reveal opt-in widget' }));
    fireEvent.press(screen.getByRole('button', { name: 'Back to notifications' }));
    for (const label of [
      'Open expense shortcut',
      'Open income shortcut',
      'Open voice shortcut',
      'Open receipt shortcut',
    ]) {
      fireEvent.press(screen.getByRole('button', { name: label }));
      fireEvent.press(screen.getByRole('button', { name: 'Continue to confirmation fixture' }));
      fireEvent.press(screen.getByRole('button', { name: 'Back to notifications' }));
    }
    rendered.unmount();
  });

  it('does not use network or logging for fixture actions', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    render(
      <ThemeProvider reducedMotion>
        <NotificationsWireframe fixture={createNotificationsFixture('offline')} />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Open safe fallback' }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    logSpy.mockRestore();
  });
});
