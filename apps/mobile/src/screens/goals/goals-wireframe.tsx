import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input, SensitiveValue } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  GOAL_LAYOUT,
  createGoalsFixture,
  formatGoalMoney,
  type GoalCadence,
  type GoalDraft,
  type GoalScenario,
  type GoalsFixture,
} from './goals-fixture';

type GoalTransactionRoute = '/transactions';
type GoalView = 'list' | 'wizard' | 'detail';

export interface GoalsWireframeProps {
  fixture?: GoalsFixture;
  onDrillDown?: (route: GoalTransactionRoute) => void;
}

const scenarios: { id: GoalScenario; label: string }[] = [
  { id: 'offline', label: 'Offline' },
  { id: 'stale', label: 'Data stale' },
  { id: 'missing_fx', label: 'FX belum tersedia' },
  { id: 'partial', label: 'Bagian gagal' },
];

const initialDraft: GoalDraft = {
  name: 'Goal baru',
  kind: 'savings',
  currency: 'IDR',
  targetMinor: '1000000',
  startDate: '2026-08-01',
  deadline: '2026-12-31',
  cadence: 'monthly',
  customPeriodDays: null,
  linkedAccountIds: ['account-cash-fixture'],
  reminderOptIn: false,
  icon: 'savings',
  color: 'mint',
};

function scenarioCopy(scenario: GoalScenario): string {
  switch (scenario) {
    case 'loading':
      return 'Memuat goal…';
    case 'empty':
      return 'Belum ada goal. Buat goal pertama tanpa memindahkan uang.';
    case 'offline':
      return 'Offline: perubahan goal masuk antrean pending-sync fixture.';
    case 'stale':
      return 'Data stale: tampilkan as-of terakhir dan segarkan fixture.';
    case 'partial':
      return 'Bagian ini perlu dicoba lagi; detail lain tetap tersedia.';
    case 'missing_fx':
      return '1 kontribusi belum memiliki kurs; total ditampilkan sebagai partial.';
    case 'invalid_legacy':
      return 'Goal versi lama tidak dapat digunakan; buat salinan baru.';
    case 'permission_revoked':
      return 'Akses berubah; goal menjadi read-only.';
    case 'archived_paused':
      return 'Goal arsip dan paused ditampilkan untuk ditinjau.';
    case 'overfunded':
      return 'Goal overfunded; kelebihan tetap terlihat dan tidak hilang.';
    case 'past_due_active':
      return 'Status past_due_active; goal tetap aktif tanpa rekomendasi wajib.';
    case 'reminder_kill_switch':
      return 'Reminder maintenance; jalur manual tetap tersedia.';
    case 'too_many_lines':
      return 'Terlalu banyak allocation line; gunakan perubahan bertahap.';
    case 'conflict':
      return 'Konflik fixture: perubahan disiapkan sebagai salinan.';
    default:
      return 'Fixture goal siap ditinjau secara lokal.';
  }
}

function displayMoney(minor: string, hidden: boolean): string {
  return hidden ? '••••' : (formatGoalMoney(minor) ?? '—');
}

export function GoalsWireframe({ fixture: suppliedFixture, onDrillDown }: GoalsWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createGoalsFixture());
  const fixture = suppliedFixture ?? fallbackFixture;
  const [view, setView] = useState<GoalView>('list');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState<GoalDraft>(initialDraft);
  const [showArchived, setShowArchived] = useState(false);
  const [activeScenario, setActiveScenario] = useState<GoalScenario>(fixture.scenario);
  const snapshot = fixture.list();
  const detail = fixture.detail('fixture');
  const statusNotice = scenarioCopy(activeScenario);

  const showResult = (message: string) => setNotice(message);

  const saveDraft = () => {
    const result = fixture.save(draft);
    if (result.kind === 'invalid') {
      showResult(result.errors?.[0] ?? 'Periksa kembali goal.');
      return;
    }
    const resultCopy =
      result.kind === 'queued'
        ? 'Goal disimpan sebagai pending-sync fixture.'
        : result.kind === 'conflict_copy'
          ? `Konflik ditangani sebagai ${result.name}.`
          : 'Goal disimpan di fixture lokal.';
    showResult(resultCopy);
    setView('list');
  };

  const drillDown = () => {
    if (onDrillDown) onDrillDown(detail.transactionRoute);
    else showResult('Drill-down transaksi fixture dibuka dengan konteks goal yang sama.');
  };

  return (
    <ScrollView
      accessibilityLabel="Goals fixture"
      contentContainerStyle={[styles.content, { padding: tokens.spacing.space5 }]}
      style={{ backgroundColor: tokens.colors.canvas }}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
            Goals (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Tujuan dan sinking funds untuk ditinjau lokal.
          </Text>
        </View>
        <Button
          label={privacyMode ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
          variant="secondary"
          onPress={() => {
            setPrivacyMode((current) => !current);
            showResult(!privacyMode ? 'Nominal disembunyikan.' : 'Nominal ditampilkan.');
          }}
          accessibilityLabel={privacyMode ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
          style={styles.headerAction}
        />
      </View>

      <Card variant="muted" style={styles.statusCard} accessibilityLabel="Status goal fixture">
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          {statusNotice}
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Status deterministik · {reducedMotion ? 'Animasi dikurangi' : 'Animasi aman'}
        </Text>
        {activeScenario === 'partial' ? (
          <Button
            label="Coba lagi goal"
            variant="secondary"
            onPress={() => showResult('Retry bagian goal berhasil sebagai fixture.')}
            style={styles.smallButton}
          />
        ) : null}
        {activeScenario === 'reminder_kill_switch' ? (
          <Button
            label="Gunakan reminder manual"
            variant="secondary"
            onPress={() => showResult(fixture.reminder().message)}
            style={styles.smallButton}
          />
        ) : null}
      </Card>

      {view === 'wizard' ? (
        <Card accessibilityLabel="Wizard goal fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Wizard goal (fixture)
          </Text>
          <Input
            label="Nama goal"
            value={draft.name}
            onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
            accessibilityLabel="Nama goal"
          />
          <Input
            label="Target minor unit"
            value={draft.targetMinor}
            onChangeText={(targetMinor) => setDraft((current) => ({ ...current, targetMinor }))}
            keyboardType="number-pad"
            accessibilityLabel="Target goal"
          />
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Currency IDR · akun terhubung: fixture cash · tanggal mulai 1 Agustus 2026
          </Text>
          <Text
            style={[
              tokens.typography.label,
              styles.fieldLabel,
              { color: tokens.colors.textSecondary },
            ]}
          >
            Cadence
          </Text>
          <View style={styles.wrapRow}>
            {(['daily', 'weekly', 'monthly', 'custom'] as GoalCadence[]).map((cadence) => (
              <Button
                key={cadence}
                label={
                  cadence === 'daily'
                    ? 'Harian'
                    : cadence === 'weekly'
                      ? 'Mingguan'
                      : cadence === 'monthly'
                        ? 'Bulanan'
                        : 'Custom'
                }
                variant={draft.cadence === cadence ? 'primary' : 'secondary'}
                onPress={() => {
                  setDraft((current) => ({ ...current, cadence }));
                  showResult(`Cadence ${cadence} dipilih.`);
                }}
                style={styles.smallButton}
              />
            ))}
          </View>
          <View style={styles.wrapRow}>
            <Button
              label={draft.kind === 'savings' ? 'Savings dipilih' : 'Pilih savings'}
              variant="secondary"
              onPress={() => {
                setDraft((current) => ({ ...current, kind: 'savings' }));
                showResult('Jenis savings dipilih.');
              }}
              style={styles.smallButton}
            />
            <Button
              label={draft.kind === 'sinking_fund' ? 'Sinking fund dipilih' : 'Pilih sinking fund'}
              variant="secondary"
              onPress={() => {
                setDraft((current) => ({ ...current, kind: 'sinking_fund' }));
                showResult('Jenis sinking fund dipilih.');
              }}
              style={styles.smallButton}
            />
            <Button
              label={draft.reminderOptIn ? 'Matikan reminder' : 'Opt-in reminder'}
              variant="secondary"
              onPress={() => {
                setDraft((current) => ({ ...current, reminderOptIn: !current.reminderOptIn }));
                showResult('Preferensi reminder berubah di fixture.');
              }}
              style={styles.smallButton}
            />
          </View>
          <Card
            variant="muted"
            style={styles.previewCard}
            accessibilityLabel="Preview goal dan kebutuhan periodik"
          >
            <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
              Preview periode pertama
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
              {fixture.preview(draft).firstPeriod}
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
              {fixture.preview(draft).requiredLabel}
            </Text>
            <SensitiveValue
              value={
                fixture.preview(draft).requiredMinor
                  ? displayMoney(fixture.preview(draft).requiredMinor as string, privacyMode)
                  : 'Tidak ada rekomendasi'
              }
              hidden={privacyMode}
            />
          </Card>
          <View style={styles.wrapRow}>
            <Button label="Simpan goal" onPress={saveDraft} style={styles.smallButton} />
            <Button
              label="Kembali ke daftar goal"
              variant="secondary"
              onPress={() => {
                setView('list');
                showResult('Draft goal tetap tersedia di sesi fixture.');
              }}
              style={styles.smallButton}
            />
          </View>
        </Card>
      ) : view === 'detail' ? (
        <Card accessibilityLabel="Detail goal fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Detail goal
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Formula: {detail.formula}
          </Text>
          <View style={styles.metricGrid}>
            {[
              ['Actual contribution', detail.actualMinor],
              ['Withdrawal', detail.withdrawalMinor],
              ['Pending', detail.pendingMinor],
              ['Remaining', detail.remainingMinor],
              ['Overfunded', detail.overfundedMinor],
            ].map(([label, value]) => (
              <Card
                key={label}
                variant="muted"
                style={styles.metricCard}
                accessibilityLabel={`${label} goal`}
              >
                <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
                  {label}
                </Text>
                <SensitiveValue
                  value={displayMoney(value ?? '0', privacyMode)}
                  hidden={privacyMode}
                />
              </Card>
            ))}
          </View>
          <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
            Progress {privacyMode ? 'disembunyikan' : detail.progressLabel}
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Milestone: 25 · 50 · 75 · 100% · sumber/as-of fixture
          </Text>
          <Button
            label="Tambah kontribusi"
            onPress={() =>
              showResult('Pilih kandidat transfer atau manual opening adjustment fixture.')
            }
            style={styles.smallButton}
          />
          <Button
            label="Tarik dana"
            variant="secondary"
            onPress={() => showResult('Konfirmasi dampak withdrawal dibuka sebagai fixture.')}
            style={styles.smallButton}
          />
          <Button
            label="Lihat riwayat target"
            variant="secondary"
            onPress={() =>
              showResult(
                `${fixture.targetHistory('fixture').length} perubahan target fixture tersedia.`,
              )
            }
            style={styles.smallButton}
          />
          <Button label="Lihat transaksi fixture" onPress={drillDown} style={styles.smallButton} />
          <Button
            label="Kembali ke daftar goal"
            variant="secondary"
            onPress={() => setView('list')}
            style={styles.smallButton}
          />
        </Card>
      ) : (
        <>
          <View style={styles.wrapRow}>
            <Button
              label="Buat goal"
              onPress={() => setView('wizard')}
              style={styles.smallButton}
            />
            <Button
              label="Salin goal sebelumnya"
              variant="secondary"
              onPress={() => showResult(`Fixture disalin sebagai ${fixture.copyPrevious().name}.`)}
              style={styles.smallButton}
            />
            <Button
              label="Buka detail goal"
              variant="secondary"
              onPress={() => setView('detail')}
              style={styles.smallButton}
            />
            <Button
              label="Urutkan goal"
              variant="secondary"
              onPress={() => showResult('Goal diurutkan berdasarkan deadline fixture.')}
              style={styles.smallButton}
            />
            <Button
              label={showArchived ? 'Sembunyikan arsip' : 'Tampilkan goal arsip'}
              variant="secondary"
              onPress={() => {
                setShowArchived((current) => !current);
                showResult(showArchived ? 'Goal arsip disembunyikan.' : 'Goal arsip ditampilkan.');
              }}
              style={styles.smallButton}
            />
            <Button
              label="Segarkan fixture"
              variant="secondary"
              onPress={() => showResult('Fixture goal disegarkan tanpa network.')}
              style={styles.smallButton}
            />
          </View>
          {activeScenario === 'loading' ? (
            <Card variant="muted" style={styles.section} accessibilityLabel="Memuat goal">
              <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
                Memuat goal…
              </Text>
              <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
                Skeleton tanpa angka palsu.
              </Text>
            </Card>
          ) : null}
          {activeScenario === 'empty' ? (
            <Card variant="muted" style={styles.section}>
              <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
                Belum ada goal
              </Text>
              <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
                Buat goal tidak memindahkan uang.
              </Text>
            </Card>
          ) : null}
          {activeScenario === 'permission_revoked' ||
          activeScenario === 'invalid_legacy' ||
          activeScenario === 'too_many_lines' ? (
            <Card variant="muted" style={styles.section}>
              <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
                {statusNotice}
              </Text>
              <Button
                label="Buat salinan aman"
                variant="secondary"
                onPress={() => {
                  setView('wizard');
                  showResult('Salinan fixture siap diedit.');
                }}
                style={styles.smallButton}
              />
            </Card>
          ) : null}
          <View style={styles.list}>
            {(showArchived ? fixture.filterStatus('archived').items : snapshot.items).map(
              (item) => (
                <Card
                  key={item.id}
                  style={styles.goalCard}
                  accessibilityLabel={`Goal ${item.status}`}
                >
                  <View style={styles.cardTitleRow}>
                    <Text
                      style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}
                    >
                      {activeScenario === 'overfunded' ? 'overfunded' : item.status}
                    </Text>
                  </View>
                  <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
                    {item.kind} · {item.currency} · {item.deadline ?? 'Tanpa deadline'}
                  </Text>
                  <SensitiveValue
                    value={displayMoney(item.targetMinor, privacyMode)}
                    hidden={privacyMode}
                  />
                  <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
                    {privacyMode
                      ? 'Progress disembunyikan'
                      : `Progress ${item.progressPercent}% · milestone ${item.milestone}%`}
                  </Text>
                  <View style={styles.wrapRow}>
                    <Button
                      label="Pause"
                      variant="secondary"
                      onPress={() =>
                        showResult(
                          fixture.pause(item.id).kind === 'paused'
                            ? 'Goal dipause.'
                            : 'Aksi goal selesai.',
                        )
                      }
                      style={styles.smallButton}
                    />
                    <Button
                      label="Selesai"
                      variant="secondary"
                      onPress={() => showResult('Goal ditandai selesai sebagai fixture.')}
                      style={styles.smallButton}
                    />
                    <Button
                      label="Arsipkan"
                      variant="secondary"
                      onPress={() =>
                        showResult(
                          fixture.archive(item.id, true).kind === 'archived'
                            ? 'Goal diarsipkan.'
                            : 'Arsip dibatalkan.',
                        )
                      }
                      style={styles.smallButton}
                    />
                  </View>
                </Card>
              ),
            )}
          </View>
          {showArchived ? (
            <Button
              label="Buka kembali goal"
              variant="secondary"
              onPress={() => showResult('Goal dibuka kembali sebagai fixture aktif.')}
              style={styles.smallButton}
            />
          ) : null}
        </>
      )}

      {activeScenario !== 'populated' &&
      activeScenario !== 'empty' &&
      activeScenario !== 'loading' ? (
        <View style={styles.wrapRow}>
          {scenarios.map((item) => (
            <Button
              key={item.id}
              label={item.label}
              variant={activeScenario === item.id ? 'primary' : 'secondary'}
              onPress={() => {
                setActiveScenario(item.id);
                showResult(`${item.label} dipilih.`);
              }}
              style={styles.smallButton}
            />
          ))}
        </View>
      ) : null}
      {activeScenario === 'missing_fx' ? (
        <Card variant="muted" style={styles.section}>
          <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
            Missing FX tidak dianggap nol atau 1:1.
          </Text>
        </Card>
      ) : null}
      {activeScenario === 'offline' ? (
        <Card variant="muted" style={styles.section}>
          <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
            Queued status: perubahan goal menunggu sinkronisasi.
          </Text>
        </Card>
      ) : null}
      <Text
        style={[tokens.typography.caption, styles.footer, { color: tokens.colors.textSecondary }]}
      >
        Minimum 320dp · touch target 48dp · progress dan formula dapat dibaca screen reader.
      </Text>
      {notice ? (
        <Text
          accessibilityRole="alert"
          style={[tokens.typography.body, styles.notice, { color: tokens.colors.info }]}
        >
          {notice}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    width: '100%',
    maxWidth: GOAL_LAYOUT.maximumContentWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: { flex: 1, gap: 4 },
  headerAction: { minHeight: GOAL_LAYOUT.minimumTouchTarget },
  statusCard: { gap: 8 },
  section: { gap: 12 },
  previewCard: { gap: 6 },
  fieldLabel: { marginTop: 4 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallButton: { minHeight: GOAL_LAYOUT.minimumTouchTarget },
  list: { gap: 12 },
  goalCard: { gap: 8 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCard: { flexGrow: 1, flexBasis: '45%', gap: 4 },
  footer: { lineHeight: 20 },
  notice: { paddingVertical: 4 },
});
