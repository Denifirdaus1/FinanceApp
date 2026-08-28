import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input, SensitiveValue } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  FORECAST_LAYOUT,
  createForecastFixture,
  formatForecastMoney,
  type ForecastScenario,
  type ScenarioDraft,
} from './forecast-fixture';

type ScreenView = 'calendar' | 'agenda' | 'forecast' | 'scenario' | 'event';

const initialScenario: ScenarioDraft = {
  name: 'Scenario baru',
  horizonDays: 30,
  accountIds: ['account-cash-fixture'],
  includePending: true,
  includeRecurring: true,
  includeGoalPlans: true,
  includeDebtSchedule: true,
  includeOverdueAsToday: false,
  overrides: [],
};

function scenarioCopy(scenario: ForecastScenario): string {
  const copies: Record<ForecastScenario, string> = {
    populated: 'Kalender dan forecast fixture siap ditinjau.',
    loading: 'Memuat kalender fixture…',
    empty: 'Belum ada event. Tambahkan recurring atau transaksi fixture.',
    offline: 'Offline: coverage lokal dan as-of terakhir ditampilkan.',
    stale: 'forecast stale: sumber terakhir perlu diperbarui.',
    partial_fx: 'FX belum tersedia: kurva native tetap terlihat, aggregate partial.',
    orphan: 'orphan event perlu ditinjau ulang.',
    conflict: 'konflik scenario membutuhkan review.',
    recomputing: 'recomputing forecast fixture berlangsung.',
    unauthorized: 'Anda tidak berwenang melihat forecast ini.',
    kill_switch: 'Forecast dalam maintenance; kalender actual tetap aktif.',
    no_projected: 'Tidak ada projected event; saldo datar hanya asumsi.',
    overdue: 'overdue terlihat di agenda tetapi belum diaplikasikan ke forecast.',
    invalid: 'Konfigurasi forecast tidak valid; gunakan default fixture.',
  };
  return copies[scenario];
}

export interface ForecastWireframeProps {
  fixture?: ReturnType<typeof createForecastFixture>;
  onDrillDown?: (route: '/transactions') => void;
}

export function ForecastWireframe({
  fixture: suppliedFixture,
  onDrillDown,
}: ForecastWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createForecastFixture());
  const fixture = suppliedFixture ?? fallbackFixture;
  const [view, setView] = useState<ScreenView>('calendar');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [pendingVisible, setPendingVisible] = useState(true);
  const [notice, setNotice] = useState('');
  const [scenarioDraft, setScenarioDraft] = useState<ScenarioDraft>(initialScenario);
  const [selectedHorizon, setSelectedHorizon] = useState(30);

  const showResult = (message: string) => setNotice(message);
  const drillDown = () => {
    if (onDrillDown) onDrillDown('/transactions');
    else showResult('Transaksi fixture siap ditinjau tanpa parameter sensitif.');
  };

  return (
    <ScrollView
      accessibilityLabel="Calendar and forecast fixture"
      contentContainerStyle={[styles.content, { padding: tokens.spacing.space5 }]}
      style={{ backgroundColor: tokens.colors.canvas }}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
            Calendar &amp; Forecast (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Agenda lokal dan estimasi saldo dengan provenance yang terlihat.
          </Text>
        </View>
        <Button
          label={privacyMode ? 'Nominal disembunyikan' : 'Sembunyikan nominal'}
          variant="secondary"
          accessibilityLabel={privacyMode ? 'Nominal disembunyikan' : 'Sembunyikan nominal'}
          onPress={() => {
            setPrivacyMode((current) => !current);
            showResult(!privacyMode ? 'Nominal disembunyikan.' : 'Nominal ditampilkan.');
          }}
          style={styles.headerAction}
        />
      </View>
      <Card
        variant="muted"
        style={styles.statusCard}
        accessibilityLabel="Status calendar forecast fixture"
      >
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          {scenarioCopy(fixture.scenario)}
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          As-of 28 Agustus 2026 · Asia/Jakarta ·{' '}
          {reducedMotion ? 'Animasi dikurangi' : 'Animasi aman'} · legenda actual/projected tidak
          bergantung warna.
        </Text>
        {fixture.scenario === 'partial_fx' || fixture.scenario === 'recomputing' ? (
          <Button
            label="Coba lagi forecast"
            variant="secondary"
            onPress={() =>
              showResult(
                fixture.retry().kind === 'recomputed'
                  ? 'Forecast selesai dihitung ulang sebagai fixture.'
                  : 'Forecast fixture disegarkan.',
              )
            }
            style={styles.smallButton}
          />
        ) : null}
      </Card>
      {notice ? (
        <Text
          accessibilityRole="alert"
          style={[tokens.typography.body, styles.notice, { color: tokens.colors.textPrimary }]}
        >
          {notice}
        </Text>
      ) : null}
      <View style={styles.wrapRow}>
        <Button
          label="Kalender"
          variant={view === 'calendar' ? 'primary' : 'secondary'}
          onPress={() => setView('calendar')}
          style={styles.smallButton}
        />
        <Button
          label="Agenda"
          variant={view === 'agenda' ? 'primary' : 'secondary'}
          onPress={() => setView('agenda')}
          style={styles.smallButton}
        />
        <Button
          label="Forecast"
          variant={view === 'forecast' ? 'primary' : 'secondary'}
          onPress={() => setView('forecast')}
          style={styles.smallButton}
        />
        <Button
          label="Filter event"
          variant="secondary"
          onPress={() =>
            showResult(
              'Filter account/type/status/currency/category/date diterapkan atomically sebagai fixture.',
            )
          }
          style={styles.smallButton}
        />
        <Button
          label="Tampilkan pending"
          variant="secondary"
          onPress={() => setPendingVisible(true)}
          style={styles.smallButton}
        />
        <Button
          label="Sembunyikan pending"
          variant="secondary"
          onPress={() => setPendingVisible(false)}
          style={styles.smallButton}
        />
        <Button
          label="Buat scenario"
          variant="secondary"
          onPress={() => setView('scenario')}
          style={styles.smallButton}
        />
        <Button
          label="Segarkan fixture"
          variant="secondary"
          onPress={() => showResult('Fixture disegarkan tanpa network.')}
          style={styles.smallButton}
        />
      </View>

      {view === 'scenario' ? (
        <Card accessibilityLabel="Scenario forecast fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Scenario forecast (fixture)
          </Text>
          <Input
            label="Nama scenario"
            value={scenarioDraft.name}
            onChangeText={(name) => setScenarioDraft((current) => ({ ...current, name }))}
            accessibilityLabel="Nama scenario"
          />
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Inclusion toggles: pending, recurring, goal plans, debt schedule, overdue as today.
            Override hanya untuk scenario dan tidak mengubah base data.
          </Text>
          <View style={styles.wrapRow}>
            {[7, 30, 90, 365].map((days) => (
              <Button
                key={days}
                label={`${days} hari`}
                variant={scenarioDraft.horizonDays === days ? 'primary' : 'secondary'}
                onPress={() => setScenarioDraft((current) => ({ ...current, horizonDays: days }))}
                style={styles.smallButton}
              />
            ))}
          </View>
          <Button
            label="Simpan scenario fixture"
            onPress={() => {
              const result = fixture.createScenario(scenarioDraft);
              showResult(
                result.status === 'invalid'
                  ? (result.errors?.[0] ?? 'Periksa scenario.')
                  : result.status === 'needs_re_review'
                    ? 'Scenario conflict perlu ditinjau ulang.'
                    : result.status === 'queued'
                      ? 'Scenario queued sebagai fixture.'
                      : 'Scenario tersimpan sebagai fixture.',
              );
            }}
            style={styles.actionButton}
          />
          <Button
            label="Reset scenario fixture"
            variant="secondary"
            onPress={() => {
              setScenarioDraft(initialScenario);
              showResult('Scenario kembali ke base fixture.');
            }}
            style={styles.actionButton}
          />
          <Button
            label="Kembali ke kalender"
            variant="secondary"
            onPress={() => setView('calendar')}
            style={styles.actionButton}
          />
        </Card>
      ) : view === 'agenda' ? (
        <Card accessibilityLabel="Agenda harian fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Agenda harian fixture
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Actual · projected · informational boundary dipisahkan. Overdue tidak otomatis
            mengurangi saldo.
          </Text>
          {fixture
            .events()
            .filter((event) => pendingVisible || event.type !== 'pending')
            .map((event) => (
              <Text
                key={event.eventKey}
                style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}
              >
                {event.type} · {event.classification} ·{' '}
                {event.applied ? 'diterapkan' : 'tidak diterapkan'}
              </Text>
            ))}
          <Button
            label="Buka detail event"
            onPress={() => setView('event')}
            style={styles.actionButton}
          />
        </Card>
      ) : view === 'forecast' ? (
        <Card accessibilityLabel="Forecast saldo fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Forecast saldo fixture
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Forecast horizon {selectedHorizon} hari · starting balance/as-of/source coverage/formula
            version disclosed.
          </Text>
          <View style={styles.wrapRow}>
            {[7, 30, 90, 365].map((days) => (
              <Button
                key={days}
                label={`${days} hari`}
                variant={selectedHorizon === days ? 'primary' : 'secondary'}
                onPress={() => {
                  setSelectedHorizon(days);
                  showResult(`Horizon ${days} hari dipilih.`);
                }}
                style={styles.smallButton}
              />
            ))}
          </View>
          <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
            Tabel aksesibel: date · account curve · consolidated curve · status partial/complete.
          </Text>
          <SensitiveValue value={formatForecastMoney('1000000', 'IDR')} hidden={privacyMode} />
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Transfer internal net-zero pada consolidated bila kedua leg dipilih; per-account curve
            tetap menunjukkan dampak.
          </Text>
          <Button
            label="Buka detail event"
            onPress={() => setView('event')}
            style={styles.actionButton}
          />
        </Card>
      ) : view === 'event' ? (
        <Card accessibilityLabel="Detail event forecast fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Detail event forecast (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Provenance: actual/posted-cleared atau projected/pending-recurring. Data source
            duplicate suppression dan formula version terlihat.
          </Text>
          <Button
            label="Buka transaksi fixture"
            variant="secondary"
            onPress={drillDown}
            style={styles.actionButton}
          />
          <Button
            label="Kembali ke kalender"
            variant="secondary"
            onPress={() => setView('calendar')}
            style={styles.actionButton}
          />
        </Card>
      ) : (
        <Card accessibilityLabel="Month calendar fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Agustus 2026 · kalender month fixture
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Event actual dan projected memakai legenda teks/icon; tanggal business source tidak
            ditulis ulang saat timezone berubah.
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Agenda mingguan tersedia melalui tab Agenda. Low-balance marker: netral. Missing FX:
            partial/gap, bukan nol atau 1:1.
          </Text>
          <Button
            label="Buka detail event"
            onPress={() => setView('event')}
            style={styles.actionButton}
          />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    alignSelf: 'center',
    width: '100%',
    maxWidth: FORECAST_LAYOUT.maximumContentWidth,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerCopy: { flex: 1, gap: 4 },
  headerAction: { minHeight: FORECAST_LAYOUT.minimumTouchTarget },
  statusCard: { gap: 8 },
  notice: { padding: 12 },
  section: { gap: 12 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallButton: { minHeight: FORECAST_LAYOUT.minimumTouchTarget },
  actionButton: { minHeight: FORECAST_LAYOUT.minimumTouchTarget },
});
