import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  CONNECTIONS_LAYOUT,
  createConnectionsFixture,
  type ConnectionHealth,
  type ConnectionsFixture,
  type ConnectionScenario,
} from './connections-fixture';

const scenarioCopy: Record<ConnectionScenario, string> = {
  ready: 'Koneksi fixture siap ditinjau.',
  consent_required: 'Persetujuan eksplisit diperlukan sebelum connect.',
  callback_loading: 'Callback hosted fixture sedang dimuat.',
  callback_cancelled: 'Connect dibatalkan dengan aman.',
  state_mismatch: 'Callback tidak cocok; tidak ada koneksi dibuat.',
  forbidden: 'Provider menolak akses; fallback tersedia.',
  callback_error: 'Provider fixture mengalami error; retry tersedia.',
  discovery: 'Akun fixture ditemukan dan menunggu mapping.',
  mapping: 'Mapping akun fixture siap dikonfirmasi.',
  syncing: 'Sinkronisasi awal berada di staging.',
  active: 'Koneksi aktif pada fixture.',
  reauth_required: 'Autentikasi ulang diperlukan pada fixture.',
  pending: 'Koneksi menunggu proses fixture.',
  disconnected: 'Koneksi terputus; histori fixture tetap aman.',
  provider_outage: 'Provider sedang mengalami gangguan; data terakhir diberi label stale.',
  cursor_error: 'Cursor fixture tidak valid; pemulihan manual tersedia.',
  webhook_replay: 'Replay event fixture diterima secara idempotent.',
  replay_error: 'Replay event perlu ditinjau manual.',
  reconciliation: 'Review rekonsiliasi fixture tersedia.',
  duplicates: 'Kemungkinan duplikat perlu ditinjau manual.',
  consent_expired: 'Consent berakhir; sinkronisasi dihentikan sementara.',
  revoked: 'Akses dicabut; scope dikunci.',
  offline: 'Offline: snapshot imported read-only tetap terlihat.',
  kill_switch: 'Kill switch aktif; connect baru dinonaktifkan.',
};

const healthLabels: Record<ConnectionHealth, string> = {
  active: 'Active',
  reauth_required: 'Re-auth required',
  pending: 'Pending',
  disconnected: 'Disconnected',
};

export interface ConnectionsWireframeProps {
  fixture?: ConnectionsFixture;
  onBack?: () => void;
}

export function ConnectionsWireframe({
  fixture: suppliedFixture,
  onBack,
}: ConnectionsWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createConnectionsFixture());
  const fixture = suppliedFixture ?? fallbackFixture;
  const [notice, setNotice] = useState('');
  const [consentReviewed, setConsentReviewed] = useState(false);
  const [discoveryVisible, setDiscoveryVisible] = useState(false);

  const announce = (message: string) => setNotice(message);
  const consent = fixture.consent();
  const callback = fixture.callback();
  const health = fixture.health();

  return (
    <ScrollView
      accessibilityLabel="Bank and e-wallet connections fixture"
      contentContainerStyle={[styles.content, { padding: tokens.spacing.space5 }]}
      style={{ backgroundColor: tokens.colors.canvas }}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text
            accessibilityRole="header"
            style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}
          >
            Bank &amp; e-wallet sync (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Connect read-only untuk meninjau staging; tidak ada sinkronisasi provider nyata.
          </Text>
        </View>
        {onBack ? <Button label="Back" variant="tertiary" onPress={onBack} /> : null}
      </View>

      <Card variant="muted" style={styles.card} accessibilityLabel="Connection status fixture">
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          {scenarioCopy[fixture.scenario]}
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Health: {healthLabels[health.state]} ·{' '}
          {reducedMotion ? 'Animasi dikurangi' : 'Animasi aman'}
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Provider: fixture provider · refresh manual/daily fixture · scope read-only
        </Text>
        {fixture.scenario === 'offline' ? (
          <Button
            label="Review offline snapshot"
            onPress={() => announce(fixture.offlineSnapshot().staleLabel)}
          />
        ) : null}
        {fixture.scenario === 'provider_outage' ? (
          <Button
            label="Review stale last-known"
            onPress={() =>
              announce('Last-known fixture ditampilkan; tidak memakai nilai nol atau fallback 1:1.')
            }
          />
        ) : null}
      </Card>

      <Card padding="space4" style={styles.card} accessibilityLabel="Connection consent disclosure">
        <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
          Consent &amp; scope
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Read-only · provider class fixture · retention session fixture. Credential tetap diproses
          di provider; aplikasi tidak meminta password, PIN, atau OTP.
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Status: {consent.granted || consentReviewed ? 'reviewed' : 'not granted'} · connect online
          required
        </Text>
        <Button
          label="Review consent"
          onPress={() => {
            setConsentReviewed(true);
            announce('Consent fixture siap ditinjau.');
          }}
        />
        <Button
          label="Grant read-only consent fixture"
          variant="secondary"
          onPress={() => announce(fixture.grantConsent().kind)}
        />
        <Button
          label="Revoke consent fixture"
          variant="tertiary"
          onPress={() => announce(fixture.revokeConsent().kind)}
        />
      </Card>

      <Card padding="space4" style={styles.card} accessibilityLabel="Hosted callback fixture">
        <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
          Hosted callback / PKCE
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          {callback.message} Ref callback hanya opaque dan tidak membawa data sensitif.
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          State: {callback.kind}
        </Text>
        <Button label="Retry connect fixture" onPress={() => announce(fixture.retry().message)} />
        <Button
          label="Use CSV fallback"
          variant="secondary"
          onPress={() => announce(fixture.csvFallback().route)}
        />
      </Card>

      <Card padding="space4" style={styles.card} accessibilityLabel="Account discovery and mapping">
        <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
          Account discovery &amp; mapping
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Preview staging, bukan ledger.
        </Text>
        <Button
          label="Discover accounts fixture"
          onPress={() => {
            setDiscoveryVisible(true);
            announce('Akun fixture ditemukan; mapping belum final.');
          }}
        />
        {discoveryVisible ? (
          <View style={styles.discovery}>
            {fixture.discoverAccounts().map((account) => (
              <Text
                key={account.label}
                style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}
              >
                {account.label} · {account.currencyBucket}
              </Text>
            ))}
            <Button
              label="Map to existing account"
              onPress={() => announce(fixture.mapAccount('existing').destination)}
            />
            <Button
              label="Map to new account"
              variant="secondary"
              onPress={() => announce(fixture.mapAccount('new').destination)}
            />
          </View>
        ) : null}
        <Button
          label="Review initial sync staging"
          variant="secondary"
          onPress={() => {
            const progress = fixture.initialSync();
            announce(
              progress.staging
                ? `Staging ${progress.progressBucket}; ledger tetap kosong.`
                : 'Staging selesai ditinjau.',
            );
          }}
        />
      </Card>

      <Card padding="space4" style={styles.card} accessibilityLabel="Reconciliation and provenance">
        <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
          Review &amp; provenance
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Pending → posted merge, reversal, refund, dan duplicate selalu membutuhkan review manual.
        </Text>
        <Button
          label="Open reconciliation review"
          onPress={() => announce(fixture.reviewLink().path)}
        />
        <Button
          label="Review duplicate candidates"
          variant="secondary"
          onPress={() => announce('Review duplicate fixture dibuka.')}
        />
        <Button
          label="Show reversal provenance"
          variant="tertiary"
          onPress={() => announce(fixture.provenance('reversal').source)}
        />
        <Button
          label="Show refund provenance"
          variant="tertiary"
          onPress={() => announce(fixture.provenance('refund').source)}
        />
        <Button
          label="Retry webhook/cursor fixture"
          variant="secondary"
          onPress={() => announce(fixture.integrationEvent().recovery)}
        />
      </Card>

      <Card padding="space4" style={styles.card} accessibilityLabel="Disconnect connection fixture">
        <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
          Disconnect
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Pilih nasib histori secara eksplisit; fixture tidak mengklaim penghapusan server.
        </Text>
        <Button
          label="Disconnect, retain history"
          onPress={() => announce(fixture.disconnect('retain').historicalChoice)}
        />
        <Button
          label="Disconnect, choose delete history"
          variant="destructive"
          onPress={() =>
            announce('Pilihan delete dicatat sebagai fixture; deletion nyata tidak dilakukan.')
          }
        />
      </Card>

      <Card padding="space4" style={styles.card} accessibilityLabel="Connection safety recovery">
        <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
          Safety &amp; recovery
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Offline imported snapshot read-only. Kill switch menyembunyikan connect baru, histori
          tetap dapat ditinjau.
        </Text>
        <Button
          label="Preview kill switch"
          onPress={() =>
            announce(
              fixture.killSwitch().manualFallback ? 'Manual fallback aktif.' : 'Review diperlukan.',
            )
          }
        />
        <Button
          label="Review safe metadata"
          variant="secondary"
          onPress={() => announce(fixture.safeMetadata().status)}
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
        Minimum width 320dp · touch target 48dp · reduced motion &amp; screen-reader labels
        supported
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    maxWidth: CONNECTIONS_LAYOUT.contentMaxWidth,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 24,
  },
  header: { gap: 8 },
  headerCopy: { gap: 6 },
  card: { width: '100%', gap: 12 },
  discovery: { gap: 8 },
  notice: { paddingVertical: 8 },
});
