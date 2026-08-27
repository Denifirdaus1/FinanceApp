import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, SensitiveValue } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  DASHBOARD_LAYOUT,
  dashboardStateLabel,
  createDashboardFixture,
  formatDashboardMoney,
  type DashboardFixture,
  type DashboardPeriod,
  type DashboardQuickAction,
} from './dashboard-fixture';

type DashboardRoute = '/capture' | '/receipt-capture' | '/voice-capture' | '/transfers';

export interface DashboardWireframeProps {
  fixture?: DashboardFixture;
  onQuickAction?: (route: DashboardRoute) => void;
  onOpenSync?: () => void;
}

const PERIODS: { id: DashboardPeriod; label: string }[] = [
  { id: 'today', label: 'Hari ini' },
  { id: 'week', label: 'Minggu ini' },
  { id: 'month', label: 'Bulan ini' },
];

const QUICK_ACTIONS: { id: DashboardQuickAction; label: string }[] = [
  { id: 'manual', label: 'Catat manual' },
  { id: 'receipt', label: 'Scan struk' },
  { id: 'voice', label: 'Input suara' },
  { id: 'transfer', label: 'Transfer' },
];

function cardValue(value: string | null, currency: 'IDR', hidden: boolean): string {
  if (value === null) return '—';
  return hidden ? '••••' : (formatDashboardMoney(value, currency) ?? '—');
}

export function DashboardWireframe({
  fixture: suppliedFixture,
  onQuickAction,
  onOpenSync,
}: DashboardWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createDashboardFixture());
  const activeFixture = suppliedFixture ?? fallbackFixture;
  const [privacyMode, setPrivacyMode] = useState(false);
  const [period, setPeriod] = useState<DashboardPeriod>(activeFixture.snapshot.period);
  const [notice, setNotice] = useState('');

  const togglePrivacy = () => {
    const next = activeFixture.togglePrivacy();
    setPrivacyMode(next.privacyMode);
    setNotice(next.privacyMode ? 'Nominal disembunyikan.' : 'Nominal ditampilkan.');
  };

  const runQuickAction = (action: DashboardQuickAction) => {
    const result = activeFixture.quickAction(action);
    if (onQuickAction) {
      onQuickAction(result.route);
      return;
    }
    setNotice(`Fixture membuka ${result.route}.`);
  };

  const refresh = () => setNotice(`Dashboard diperbarui ${activeFixture.refresh().asOf}.`);

  const snapshot = activeFixture.snapshot;
  const isLoading = snapshot.state === 'loading';
  const isEmpty = snapshot.state === 'empty';
  const isSessionExpired = snapshot.state === 'session_expired';

  return (
    <ScrollView
      accessibilityLabel="Dashboard fixture"
      contentContainerStyle={[styles.content, { padding: tokens.spacing.space5 }]}
      style={{ backgroundColor: tokens.colors.canvas }}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
            Dashboard (fixture)
          </Text>
          <Text style={[tokens.typography.label, { color: tokens.colors.textSecondary }]}>
            Beranda
          </Text>
          <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textSecondary }]}>
            Selamat pagi · Kamis, 27 Agustus 2026
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Asia/Jakarta · data lokal terproteksi
          </Text>
        </View>
        <Button
          label={privacyMode ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
          variant="secondary"
          accessibilityLabel={privacyMode ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
          onPress={togglePrivacy}
          style={styles.headerAction}
        />
      </View>

      <Text
        accessibilityRole="text"
        style={[tokens.typography.body, styles.status, { color: tokens.colors.textSecondary }]}
      >
        {dashboardStateLabel(snapshot)}
      </Text>

      <View accessibilityRole="radiogroup" style={styles.periods}>
        {PERIODS.map((item) => (
          <Button
            key={item.id}
            label={item.label}
            variant={period === item.id ? 'primary' : 'secondary'}
            accessibilityLabel={`Periode ${item.label}`}
            onPress={() => {
              setPeriod(activeFixture.switchPeriod(item.id).period);
              setNotice(`Periode ${item.label.toLowerCase()} dipilih.`);
            }}
            style={styles.periodButton}
          />
        ))}
      </View>

      {isLoading ? (
        <Card variant="muted" style={styles.card} accessibilityLabel="Skeleton dashboard">
          <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textSecondary }]}>
            Memuat ringkasan tanpa angka palsu…
          </Text>
        </Card>
      ) : null}

      {isEmpty ? (
        <Card variant="muted" style={styles.card}>
          <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
            Mulai dengan akun atau transaksi pertama
          </Text>
          <Text
            style={[
              tokens.typography.body,
              styles.cardCopy,
              { color: tokens.colors.textSecondary },
            ]}
          >
            Dashboard akan terisi setelah fixture akun atau transaksi tersedia.
          </Text>
          <Button
            label="Tambah akun pertama"
            onPress={() => setNotice('Fixture tambah akun dibuka.')}
            style={styles.action}
          />
          <Button
            label="Catat transaksi pertama"
            variant="secondary"
            onPress={() => runQuickAction('manual')}
            style={styles.action}
          />
        </Card>
      ) : null}

      {!isLoading && !isEmpty && !isSessionExpired ? (
        <View accessibilityLabel="Ringkasan keuangan" style={styles.cards}>
          {(
            [
              ['Saldo tersedia', snapshot.cards.availableBalanceMinor],
              ['Pemasukan hari ini', snapshot.cards.incomeTodayMinor],
              ['Pengeluaran hari ini', snapshot.cards.expenseTodayMinor],
              ['Arus kas bulan berjalan', snapshot.cards.cashflowMtdMinor],
            ] as const
          ).map(([label, value]) => (
            <Card key={label} style={styles.summaryCard} accessibilityLabel={label}>
              <Text style={[tokens.typography.label, { color: tokens.colors.textSecondary }]}>
                {label}
              </Text>
              <SensitiveValue
                value={cardValue(value, snapshot.cards.currency, false)}
                hidden={privacyMode}
                accessibilityLabel={privacyMode ? 'Nominal disembunyikan' : label}
                style={styles.money}
              />
            </Card>
          ))}
        </View>
      ) : null}

      {snapshot.state === 'offline' ? (
        <Card variant="muted" style={styles.card} accessibilityLabel="Dashboard offline">
          <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
            Offline: menampilkan cache lokal.
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Waktu as-of tetap terlihat agar freshness dapat dinilai.
          </Text>
        </Card>
      ) : null}

      {snapshot.state === 'partial' ? (
        <Button
          label="Coba lagi budget"
          variant="secondary"
          onPress={() => setNotice(`Bagian budget ${activeFixture.retry('budget').kind}.`)}
          style={styles.action}
        />
      ) : null}

      {snapshot.fx.missingCount > 0 ? (
        <Card variant="muted" style={styles.card} accessibilityLabel="Missing FX warning">
          <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
            {snapshot.fx.missingCount} transaksi belum memiliki kurs.
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Total yang dapat dihitung ditampilkan; tidak ada fallback 1:1.
          </Text>
        </Card>
      ) : null}

      {isSessionExpired ? (
        <Card variant="muted" style={styles.card} accessibilityLabel="Sesi dashboard berakhir">
          <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
            Login diperlukan
          </Text>
          <Text
            style={[
              tokens.typography.body,
              styles.cardCopy,
              { color: tokens.colors.textSecondary },
            ]}
          >
            Tampilan finansial dikunci dengan aman sampai sesi dipulihkan.
          </Text>
          <Button
            label="Buka status sinkronisasi"
            variant="secondary"
            onPress={() => {
              onOpenSync?.();
              setNotice('Status sinkronisasi fixture dibuka.');
            }}
            style={styles.action}
          />
        </Card>
      ) : null}

      {snapshot.state === 'permission_denied' ? (
        <Card variant="muted" style={styles.card}>
          <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
            Akses terbatas: beberapa kartu read-only.
          </Text>
          <Button
            label="Buka status sinkronisasi"
            variant="secondary"
            onPress={() => {
              onOpenSync?.();
              setNotice('Status sinkronisasi fixture dibuka.');
            }}
            style={styles.action}
          />
        </Card>
      ) : null}

      {!isLoading && !isSessionExpired ? (
        <>
          <Text
            style={[
              tokens.typography.heading2,
              styles.sectionHeading,
              { color: tokens.colors.textPrimary },
            ]}
          >
            Ringkasan hari ini
          </Text>
          {snapshot.sections.map((section) => (
            <Card
              key={section.id}
              variant={section.state === 'failed' ? 'muted' : 'surface'}
              style={styles.card}
            >
              <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
                {section.title}
              </Text>
              <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
                {section.state === 'failed' ? 'Bagian ini perlu dicoba lagi.' : section.summary}
              </Text>
              {section.id === 'review' ? (
                <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
                  Item review tersedia tanpa membocorkan nominal atau merchant.
                </Text>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}

      <Text
        style={[
          tokens.typography.heading2,
          styles.sectionHeading,
          { color: tokens.colors.textPrimary },
        ]}
      >
        Aksi cepat
      </Text>
      <View style={styles.actions}>
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.id}
            label={action.label}
            variant="secondary"
            onPress={() => runQuickAction(action.id)}
            style={styles.quickAction}
          />
        ))}
      </View>

      <Button
        label="Buka status sinkronisasi"
        variant="tertiary"
        accessibilityLabel="Open sync status"
        onPress={() => {
          onOpenSync?.();
          setNotice('Status sinkronisasi fixture dibuka.');
        }}
        style={styles.action}
      />
      <Button label="Segarkan fixture" variant="tertiary" onPress={refresh} style={styles.action} />

      {reducedMotion ? (
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Animasi dikurangi sesuai preferensi perangkat.
        </Text>
      ) : null}
      <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
        Lebar minimum {DASHBOARD_LAYOUT.minimumWidth}dp · target sentuh minimal{' '}
        {DASHBOARD_LAYOUT.minimumTouchTarget}dp
      </Text>
      {notice ? (
        <Text
          accessibilityRole="alert"
          style={[tokens.typography.body, styles.notice, { color: tokens.colors.primary }]}
        >
          {notice}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', width: '100%', maxWidth: DASHBOARD_LAYOUT.maximumContentWidth },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: { flex: 1 },
  headerAction: { minWidth: DASHBOARD_LAYOUT.minimumTouchTarget },
  status: { marginTop: 10 },
  periods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  periodButton: { flexGrow: 1, minWidth: DASHBOARD_LAYOUT.minimumTouchTarget },
  cards: { gap: 10, marginTop: 16 },
  summaryCard: { minHeight: 88 },
  money: { marginTop: 6 },
  card: { marginTop: 12 },
  cardCopy: { marginTop: 6 },
  action: { marginTop: 10 },
  sectionHeading: { marginTop: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  quickAction: { flexGrow: 1, minWidth: DASHBOARD_LAYOUT.minimumTouchTarget },
  notice: { marginTop: 12 },
});
