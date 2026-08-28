import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  NOTIFICATIONS_LAYOUT,
  createNotificationsFixture,
  type NotificationChannel,
  type NotificationsFixture,
  type NotificationScenario,
} from './notifications-fixture';

type NotificationView = 'hub' | 'widget' | 'shortcut';

const channelLabels: Record<NotificationChannel, string> = {
  recurring_bill: 'Recurring bill',
  debt_due: 'Debt due',
  budget_threshold: 'Budget threshold',
  goal_milestone: 'Goal milestone',
  sync_issue: 'Sync issue',
  security: 'Security',
  weekly_summary: 'Weekly summary',
};

const scenarioCopies: Record<NotificationScenario, string> = {
  ready: 'Pengaturan notifikasi fixture siap ditinjau.',
  permission_required: 'Izin notifikasi diminta saat reminder diaktifkan.',
  granted: 'Izin fixture aktif; preferensi tetap dapat diubah.',
  denied: 'Izin ditolak; reminder in-app tetap tersedia.',
  blocked: 'Izin diblokir; gunakan panduan Settings fixture.',
  loading: 'Memuat preferensi notifikasi fixture…',
  empty: 'Belum ada delivery; reminder in-app tetap dapat ditinjau.',
  error: 'Preferensi gagal dimuat; retry fixture tersedia.',
  offline: 'Offline: reminder cache terlihat dengan as-of aman.',
  stale: 'Data reminder stale; refresh fixture diperlukan.',
  unauthorized: 'Akses tidak berwenang; detail sensitif tidak dirender.',
  quiet_hours: 'Quiet hours aktif; security tetap mengikuti kebijakan eksplisit.',
  dst: 'Timezone Asia/Jakarta dan DST ditangani fixture.',
  dedupe: 'Dedupe lintas perangkat aktif untuk occurrence yang sama.',
  revoked: 'Akses dicabut; schedule dikunci dan fallback in-app tersedia.',
  tampered_link: 'Target notification tidak valid; safe fallback digunakan.',
  kill_switch: 'Kill switch aktif; scheduling baru dinonaktifkan.',
  widget_default: 'Widget default menyembunyikan nominal dan akun.',
  widget_reveal: 'Widget reveal hanya melalui opt-in dan device unlock fixture.',
};

export interface NotificationsWireframeProps {
  fixture?: NotificationsFixture;
  onBack?: () => void;
}

export function NotificationsWireframe({
  fixture: suppliedFixture,
  onBack,
}: NotificationsWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createNotificationsFixture());
  const fixture = suppliedFixture ?? fallbackFixture;
  const [view, setView] = useState<NotificationView>('hub');
  const [notice, setNotice] = useState('');
  const [privacyMode, setPrivacyMode] = useState(true);
  const [enabledChannels, setEnabledChannels] = useState(
    () =>
      new Set(
        fixture
          .channels()
          .filter((channel) => channel.enabled)
          .map((channel) => channel.type),
      ),
  );

  const show = (message: string) => setNotice(message);
  const toggleChannel = (channel: NotificationChannel) => {
    setEnabledChannels((current) => {
      const next = new Set(current);
      if (next.has(channel)) next.delete(channel);
      else next.add(channel);
      return next;
    });
    show(`${channelLabels[channel]} fixture diperbarui.`);
  };

  if (view === 'widget') {
    const preview = fixture.widgetPreview({ privacyMode, unlocked: false, optIn: false });
    return (
      <ScrollView
        contentContainerStyle={styles.content}
        style={{ backgroundColor: tokens.colors.canvas }}
      >
        <Button label="Back to notifications" variant="tertiary" onPress={() => setView('hub')} />
        <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
          Widget preview
        </Text>
        <Card padding="space4" style={styles.card} accessibilityLabel="Widget preview fixture">
          <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}>
            Widget preview (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            {preview.genericCopy
              ? 'Ada ringkasan keuangan untuk Anda.'
              : 'Reveal opt-in fixture aktif.'}
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Nominal: {preview.showsAmount ? 'reveal setelah unlock' : 'disembunyikan'} · akun:{' '}
            {preview.showsAccount ? 'reveal setelah unlock' : 'disembunyikan'}
          </Text>
          <Button
            label="Reveal opt-in widget"
            onPress={() => show('Reveal memerlukan privacy mode off, opt-in, dan unlock fixture.')}
          />
          {notice ? (
            <Text
              accessibilityRole="alert"
              style={[styles.notice, { color: tokens.colors.textPrimary }]}
            >
              {notice}
            </Text>
          ) : null}
        </Card>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Minimum width 320dp · touch target 48dp
        </Text>
      </ScrollView>
    );
  }

  if (view === 'shortcut') {
    return (
      <ScrollView
        contentContainerStyle={styles.content}
        style={{ backgroundColor: tokens.colors.canvas }}
      >
        <Button label="Back to notifications" variant="tertiary" onPress={() => setView('hub')} />
        <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
          Shortcut preview
        </Text>
        <Card padding="space4" style={styles.card} accessibilityLabel="Shortcut preview fixture">
          <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}>
            Shortcut ends at confirmation
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Tidak ada auto-post; capture fixture selalu meminta review.
          </Text>
          <Button
            label="Continue to confirmation fixture"
            onPress={() => show('Confirmation fixture dibuka; draft belum disimpan.')}
          />
          {notice ? (
            <Text
              accessibilityRole="alert"
              style={[styles.notice, { color: tokens.colors.textPrimary }]}
            >
              {notice}
            </Text>
          ) : null}
        </Card>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Minimum width 320dp · touch target 48dp
        </Text>
      </ScrollView>
    );
  }

  const permission = fixture.permissionSnapshot();
  const history = fixture.deliveryHistory();
  return (
    <ScrollView
      accessibilityLabel="Notifications widgets and shortcuts fixture"
      contentContainerStyle={[styles.content, { padding: tokens.spacing.space5 }]}
      style={{ backgroundColor: tokens.colors.canvas }}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
            Notifikasi, widget &amp; shortcut (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Reminder lokal deterministik, aman untuk ditinjau.
          </Text>
        </View>
        {onBack ? <Button label="Back" variant="tertiary" onPress={onBack} /> : null}
      </View>

      <Card variant="muted" style={styles.card} accessibilityLabel="Notification status fixture">
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          {scenarioCopies[fixture.scenario]}
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Permission: {permission.state} · {reducedMotion ? 'Animasi dikurangi' : 'Animasi aman'} ·
          on-device fixture, tanpa scheduling native.
        </Text>
        {permission.state === 'permission_required' ? (
          <Button
            label="Enable reminder permission"
            onPress={() => show(`Permission fixture: ${fixture.requestPermission().state}.`)}
          />
        ) : null}
        {permission.state === 'denied' || permission.state === 'blocked' ? (
          <Button
            label="Open in-app reminder fallback"
            variant="secondary"
            onPress={() => show('Reminder in-app tetap tersedia tanpa izin notifikasi.')}
          />
        ) : null}
        {fixture.scenario === 'error' || fixture.scenario === 'stale' ? (
          <Button
            label="Retry notification settings"
            variant="secondary"
            onPress={() => show(fixture.retry().kind)}
          />
        ) : null}
      </Card>

      <Card padding="space4" style={styles.card} accessibilityLabel="Notification privacy controls">
        <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
          Privacy &amp; lock screen
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Default generic: “Ada pengingat keuangan untuk Anda.” Detail amount membutuhkan opt-in dan
          unlock.
        </Text>
        <Button
          label={privacyMode ? 'Privacy mode aktif' : 'Aktifkan privacy mode'}
          variant="secondary"
          onPress={() => {
            setPrivacyMode((current) => !current);
            show('Privacy mode fixture diperbarui.');
          }}
        />
        <Button
          label="Request amount preview opt-in"
          onPress={() => show(fixture.setPrivacyLevel('amount').kind)}
        />
        <Button label="Preview widget" variant="secondary" onPress={() => setView('widget')} />
      </Card>

      <Card padding="space4" style={styles.card} accessibilityLabel="Notification channels">
        <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
          Channels
        </Text>
        {fixture.channels().map((channel) => (
          <Button
            key={channel.type}
            label={`${enabledChannels.has(channel.type) ? 'Disable' : 'Enable'} ${channelLabels[channel.type]}`}
            variant="tertiary"
            accessibilityLabel={`${enabledChannels.has(channel.type) ? 'Disable' : 'Enable'} ${channelLabels[channel.type]} channel`}
            onPress={() => toggleChannel(channel.type)}
          />
        ))}
      </Card>

      <Card padding="space4" style={styles.card} accessibilityLabel="Quiet hours and dedupe">
        <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
          Quiet hours &amp; delivery safety
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          22:00–07:00 · Asia/Jakarta · DST-safe · security mengikuti pilihan eksplisit.
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Dedupe occurrence lintas perangkat dan threshold hysteresis aktif.
        </Text>
        <Button
          label="Snooze budget reminder"
          variant="secondary"
          onPress={() => show(fixture.snooze('budget_threshold').kind)}
        />
        <Button
          label="Validate notification link"
          variant="secondary"
          onPress={() => show(fixture.resolveDeepLink('stale').kind)}
        />
      </Card>

      <Card padding="space4" style={styles.card} accessibilityLabel="Delivery history">
        <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
          Delivery history
        </Text>
        {fixture.scenario === 'empty' ? (
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Belum ada delivery fixture.
          </Text>
        ) : null}
        {history.map((item) => (
          <Text
            key={item.channel}
            style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}
          >
            {channelLabels[item.channel]} · {item.outcome} · {item.ageBucket} · {item.attemptBucket}
          </Text>
        ))}
      </Card>

      <Card padding="space4" style={styles.card} accessibilityLabel="Shortcut launcher previews">
        <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
          Shortcut launcher preview
        </Text>
        <Button label="Open expense shortcut" onPress={() => setView('shortcut')} />
        <Button
          label="Open income shortcut"
          variant="secondary"
          onPress={() => setView('shortcut')}
        />
        <Button
          label="Open voice shortcut"
          variant="secondary"
          onPress={() => setView('shortcut')}
        />
        <Button
          label="Open receipt shortcut"
          variant="secondary"
          onPress={() => setView('shortcut')}
        />
      </Card>

      <Card padding="space4" style={styles.card} accessibilityLabel="Safe recovery actions">
        <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
          Recovery
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          No promotional push default-on, no critical alert, dan tidak ada native scheduler pada
          fixture.
        </Text>
        <Button
          label="Open safe fallback"
          variant="secondary"
          onPress={() => show(fixture.resolveDeepLink('tampered').kind)}
        />
        <Button
          label="Preview kill-switch result"
          variant="secondary"
          onPress={() =>
            show(
              fixture.killSwitch().inAppFallback ? 'In-app fallback aktif.' : 'Review diperlukan.',
            )
          }
        />
      </Card>

      {notice ? (
        <Text
          accessibilityRole="alert"
          style={[styles.notice, { color: tokens.colors.textPrimary }]}
        >
          {notice}
        </Text>
      ) : null}
      <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
        Minimum width 320dp · touch target 48dp · screen-reader labels tersedia
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 16,
    maxWidth: NOTIFICATIONS_LAYOUT.maximumContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: { gap: 8 },
  headerCopy: { gap: 6 },
  card: { gap: 12 },
  notice: { paddingVertical: 8 },
});
