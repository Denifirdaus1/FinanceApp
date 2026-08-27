import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input, SensitiveValue } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  BUDGET_LAYOUT,
  createBudgetsFixture,
  formatBudgetMoney,
  type BudgetDraft,
  type BudgetScenario,
  type BudgetsFixture,
} from './budgets-fixture';

type BudgetTransactionRoute = '/transactions';
type BudgetView = 'list' | 'wizard' | 'detail';

export interface BudgetsWireframeProps {
  fixture?: BudgetsFixture;
  onDrillDown?: (route: BudgetTransactionRoute) => void;
}

const scenarios: { id: BudgetScenario; label: string }[] = [
  { id: 'offline', label: 'Offline' },
  { id: 'stale', label: 'Data stale' },
  { id: 'missing_fx', label: 'FX belum tersedia' },
  { id: 'partial', label: 'Bagian gagal' },
];

const initialDraft: BudgetDraft = {
  name: 'Budget baru',
  currency: 'IDR',
  categoryLines: [{ categoryId: 'category-food', plannedMinor: '500000' }],
  cadence: 'monthly',
  timezone: 'Asia/Jakarta',
  anchorDate: '2026-08-01',
  startDay: 1,
  rolloverMode: 'positive-only',
  rolloverCapMinor: null,
  threshold: { kind: 'preset', percent: 80 },
};

function scenarioCopy(scenario: BudgetScenario): string {
  switch (scenario) {
    case 'loading':
      return 'Memuat budget…';
    case 'empty':
      return 'Belum ada budget. Mulai dari budget pertama atau catat transaksi.';
    case 'offline':
      return 'Offline: perubahan budget akan masuk antrean fixture.';
    case 'stale':
      return 'Data stale: tampilkan as-of terakhir dan coba segarkan fixture.';
    case 'partial':
      return 'Bagian ini perlu dicoba lagi; kartu lain tetap tersedia.';
    case 'missing_fx':
      return '1 kategori belum memiliki kurs; total ditampilkan sebagai partial.';
    case 'invalid_legacy':
      return 'Budget versi lama tidak dapat digunakan; buat salinan baru.';
    case 'permission_revoked':
      return 'Akses berubah; mode read-only untuk budget ini.';
    case 'archived_paused':
      return 'Budget arsip dan paused ditampilkan untuk ditinjau.';
    case 'too_many_lines':
      return 'Budget memiliki terlalu banyak line; kurangi kategori untuk melanjutkan.';
    case 'rollover_maintenance':
      return 'Rollover sedang maintenance; preview terakhir tetap terlihat.';
    default:
      return 'Fixture tersinkron lokal untuk ditinjau.';
  }
}

function displayMoney(minor: string, hidden: boolean): string {
  return hidden ? '••••' : (formatBudgetMoney(minor) ?? '—');
}

export function BudgetsWireframe({ fixture: suppliedFixture, onDrillDown }: BudgetsWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createBudgetsFixture());
  const fixture = suppliedFixture ?? fallbackFixture;
  const [view, setView] = useState<BudgetView>('list');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState<BudgetDraft>(initialDraft);
  const [showArchived, setShowArchived] = useState(false);
  const [activeScenario, setActiveScenario] = useState<BudgetScenario>(fixture.scenario);
  const snapshot = fixture.list();
  const metrics = fixture.detail('fixture');
  const statusNotice = scenarioCopy(activeScenario);

  const showResult = (message: string) => setNotice(message);

  const saveDraft = () => {
    const result = fixture.save(draft);
    if (result.kind === 'invalid') {
      showResult(result.errors?.[0] ?? 'Periksa kembali budget.');
      return;
    }
    showResult(
      result.kind === 'queued'
        ? 'Budget disimpan sebagai queued fixture.'
        : result.kind === 'conflict_copy'
          ? `Konflik ditangani sebagai ${result.name}.`
          : 'Budget disimpan di fixture lokal.',
    );
    setView('list');
  };

  const drillDown = () => {
    if (onDrillDown) onDrillDown(metrics.transactionRoute);
    else showResult('Drill-down transaksi fixture dibuka dengan filter budget yang sama.');
  };

  return (
    <ScrollView
      accessibilityLabel="Budgets fixture"
      contentContainerStyle={[styles.content, { padding: tokens.spacing.space5 }]}
      style={{ backgroundColor: tokens.colors.canvas }}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
            Budgets (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Atur rencana pengeluaran tanpa menyimpan data nyata.
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

      <Card variant="muted" style={styles.statusCard} accessibilityLabel="Status budget fixture">
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          {statusNotice}
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Status deterministik · {reducedMotion ? 'Animasi dikurangi' : 'Animasi aman'}
        </Text>
        {activeScenario === 'partial' ? (
          <Button
            label="Coba lagi budget"
            variant="secondary"
            onPress={() => showResult('Retry bagian budget berhasil sebagai fixture.')}
            style={styles.smallButton}
          />
        ) : null}
        {activeScenario === 'rollover_maintenance' ? (
          <Button
            label="Coba recompute lagi"
            variant="secondary"
            onPress={() => showResult(fixture.recompute().message)}
            style={styles.smallButton}
          />
        ) : null}
      </Card>

      {view === 'wizard' ? (
        <Card accessibilityLabel="Wizard budget fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Wizard budget (fixture)
          </Text>
          <Input
            label="Nama budget"
            value={draft.name}
            onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
            accessibilityLabel="Nama budget"
          />
          <Text
            style={[
              tokens.typography.label,
              styles.fieldLabel,
              { color: tokens.colors.textSecondary },
            ]}
          >
            Periode
          </Text>
          <View style={styles.wrapRow}>
            {(['weekly', 'monthly', 'custom_days'] as const).map((cadence) => (
              <Button
                key={cadence}
                label={
                  cadence === 'custom_days'
                    ? 'Custom'
                    : cadence === 'weekly'
                      ? 'Mingguan'
                      : 'Bulanan'
                }
                variant={draft.cadence === cadence ? 'primary' : 'secondary'}
                onPress={() => {
                  setDraft((current) => ({ ...current, cadence }));
                  showResult(`Periode ${cadence} dipilih.`);
                }}
                style={styles.smallButton}
              />
            ))}
          </View>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Currency IDR · timezone Asia/Jakarta · anchor 1 Agustus 2026
          </Text>
          <Text
            style={[
              tokens.typography.label,
              styles.fieldLabel,
              { color: tokens.colors.textSecondary },
            ]}
          >
            Rollover dan threshold
          </Text>
          <View style={styles.wrapRow}>
            {(['none', 'positive-only', 'full-balance', 'positive-capped'] as const).map((mode) => (
              <Button
                key={mode}
                label={mode}
                variant={draft.rolloverMode === mode ? 'primary' : 'secondary'}
                onPress={() => {
                  setDraft((current) => ({ ...current, rolloverMode: mode }));
                  showResult(`Rollover ${mode} dipilih.`);
                }}
                style={styles.smallButton}
              />
            ))}
            <Button
              label="Threshold 80%"
              variant="secondary"
              onPress={() => {
                setDraft((current) => ({ ...current, threshold: { kind: 'preset', percent: 80 } }));
                showResult('Threshold 80% dipilih.');
              }}
              style={styles.smallButton}
            />
            <Button
              label="Threshold 100%"
              variant="secondary"
              onPress={() => {
                setDraft((current) => ({
                  ...current,
                  threshold: { kind: 'preset', percent: 100 },
                }));
                showResult('Threshold 100% dipilih.');
              }}
              style={styles.smallButton}
            />
          </View>
          <Card
            variant="muted"
            style={styles.previewCard}
            accessibilityLabel="Preview periode dan rollover"
          >
            <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
              Preview periode pertama
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
              {fixture.preview(draft).firstPeriod}
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
              {fixture.preview(draft).rolloverSimulation}
            </Text>
          </Card>
          <View style={styles.wrapRow}>
            <Button label="Simpan budget" onPress={saveDraft} style={styles.smallButton} />
            <Button
              label="Kembali ke daftar budget"
              variant="secondary"
              onPress={() => {
                setView('list');
                showResult('Draft tetap tersedia di sesi fixture.');
              }}
              style={styles.smallButton}
            />
          </View>
        </Card>
      ) : view === 'detail' ? (
        <Card accessibilityLabel="Detail budget fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Detail budget
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Formula: {metrics.formula}
          </Text>
          <View style={styles.metricGrid}>
            {[
              ['Planned', metrics.plannedMinor],
              ['Actual', metrics.actualMinor],
              ['Committed pending', metrics.committedMinor],
              ['Forecast recurring', metrics.forecastMinor],
              ['Available', metrics.availableMinor],
              ['Overspent', metrics.overspentMinor],
            ].map(([label, value]) => (
              <Card
                key={label}
                variant="muted"
                style={styles.metricCard}
                accessibilityLabel={`${label} budget`}
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
            Usage {metrics.usagePercent === null ? 'tidak tersedia' : `${metrics.usagePercent}%`}
          </Text>
          <Button label="Lihat transaksi fixture" onPress={drillDown} style={styles.smallButton} />
          <Button
            label="Kembali ke daftar budget"
            variant="secondary"
            onPress={() => setView('list')}
            style={styles.smallButton}
          />
        </Card>
      ) : (
        <>
          <View style={styles.wrapRow}>
            <Button
              label="Buat budget"
              onPress={() => setView('wizard')}
              style={styles.smallButton}
            />
            <Button
              label="Salin budget sebelumnya"
              variant="secondary"
              onPress={() => showResult(`Fixture disalin sebagai ${fixture.copyPrevious().name}.`)}
              style={styles.smallButton}
            />
            <Button
              label="Buka detail budget"
              variant="secondary"
              onPress={() => setView('detail')}
              style={styles.smallButton}
            />
            <Button
              label={showArchived ? 'Sembunyikan arsip' : 'Tampilkan budget arsip'}
              variant="secondary"
              onPress={() => {
                setShowArchived((current) => !current);
                showResult(
                  showArchived ? 'Budget arsip disembunyikan.' : 'Budget arsip ditampilkan.',
                );
              }}
              style={styles.smallButton}
            />
            <Button
              label="Urutkan budget"
              variant="secondary"
              onPress={() => showResult('Budget diurutkan berdasarkan periode fixture.')}
              style={styles.smallButton}
            />
            <Button
              label="Segarkan fixture"
              variant="secondary"
              onPress={() => showResult('Fixture budget disegarkan tanpa network.')}
              style={styles.smallButton}
            />
          </View>
          {activeScenario === 'loading' ? (
            <SkeletonCopy tokens={tokens} />
          ) : activeScenario === 'empty' ? (
            <Card variant="muted" style={styles.section}>
              <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
                Belum ada budget
              </Text>
              <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
                Mulai dari transaksi atau budget pertama.
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
                  style={styles.budgetCard}
                  accessibilityLabel={`Budget ${item.status}`}
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
                      {item.status}
                    </Text>
                  </View>
                  <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
                    {item.period} · {item.categoryLabel}
                  </Text>
                  <SensitiveValue
                    value={displayMoney(item.plannedMinor, privacyMode)}
                    hidden={privacyMode}
                  />
                  <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
                    Progress {privacyMode ? 'disembunyikan' : `${item.progressPercent}%`}
                  </Text>
                  <View style={styles.wrapRow}>
                    <Button
                      label="Pause"
                      variant="secondary"
                      onPress={() =>
                        showResult(
                          fixture.pause(item.id).kind === 'paused'
                            ? 'Budget dipause.'
                            : 'Aksi budget selesai.',
                        )
                      }
                      style={styles.smallButton}
                    />
                    <Button
                      label="Arsipkan"
                      variant="secondary"
                      onPress={() =>
                        showResult(
                          fixture.archive(item.id, true).kind === 'archived'
                            ? 'Budget diarsipkan.'
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
              label="Pulihkan budget"
              variant="secondary"
              onPress={() => showResult('Budget dipulihkan sebagai fixture aktif.')}
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
            Queued status: perubahan lokal menunggu sinkronisasi.
          </Text>
        </Card>
      ) : null}
      <Text
        style={[tokens.typography.caption, styles.footer, { color: tokens.colors.textSecondary }]}
      >
        Minimum 320dp · touch target 48dp · formula dan status dapat dibaca screen reader.
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

function SkeletonCopy({ tokens }: { tokens: ReturnType<typeof useTheme>['tokens'] }) {
  return (
    <Card variant="muted" style={styles.section} accessibilityLabel="Memuat budget">
      <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
        Memuat budget…
      </Text>
      <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
        Skeleton tanpa angka palsu.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    width: '100%',
    maxWidth: BUDGET_LAYOUT.maximumContentWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: { flex: 1, gap: 4 },
  headerAction: { minHeight: BUDGET_LAYOUT.minimumTouchTarget },
  statusCard: { gap: 8 },
  section: { gap: 12 },
  previewCard: { gap: 6 },
  fieldLabel: { marginTop: 4 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallButton: { minHeight: BUDGET_LAYOUT.minimumTouchTarget },
  list: { gap: 12 },
  budgetCard: { gap: 8 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCard: { flexGrow: 1, flexBasis: '45%', gap: 4 },
  footer: { lineHeight: 20 },
  notice: { paddingVertical: 4 },
});
