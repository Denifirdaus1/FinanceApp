import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, SensitiveValue } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  REPORTS_LAYOUT,
  createReportsFixture,
  formatReportMoney,
  reportsStateLabel,
  type ReportFilterDraft,
  type ReportRange,
  type ReportSection,
  type ReportTab,
  type ReportsFixture,
} from './reports-fixture';

type ReportTransactionRoute = '/transactions';

export interface ReportsWireframeProps {
  fixture?: ReportsFixture;
  onDrillDown?: (route: ReportTransactionRoute) => void;
}

const RANGES: { id: ReportRange; label: string }[] = [
  { id: 'this_week', label: 'Minggu ini' },
  { id: 'this_month', label: 'Bulan ini' },
  { id: 'last_month', label: 'Bulan lalu' },
  { id: 'year_to_date', label: 'Tahun berjalan' },
  { id: 'last_12_months', label: '12 bulan' },
  { id: 'custom', label: 'Custom' },
];

const FILTERS: ReportFilterDraft = {
  accountIds: ['fixture-account'],
  categoryIds: [],
  tagIds: [],
  entryTypes: ['expense'],
  lifecycleStatuses: ['posted'],
  clearingStatuses: ['cleared'],
  currencies: ['IDR'],
  includeRefunds: true,
};

function displayMoney(minor: string, hidden: boolean): string {
  if (hidden) return '••••';
  return formatReportMoney(minor) ?? '—';
}

export function ReportsWireframe({ fixture: suppliedFixture, onDrillDown }: ReportsWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createReportsFixture());
  const fixture = suppliedFixture ?? fallbackFixture;
  const snapshot = fixture.snapshot;
  const [tab, setTab] = useState<ReportTab>(snapshot.tab);
  const [range, setRange] = useState<ReportRange>(snapshot.range);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [comparison, setComparison] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const isLoading = snapshot.state === 'loading';
  const isEmpty = snapshot.state === 'empty';
  const isPermissionDenied = snapshot.state === 'permission_denied';

  const handleDrillDown = (section: ReportSection) => {
    const result = fixture.drillDown(section);
    if (onDrillDown) onDrillDown(result.route);
    else setNotice(`Drill-down ${section} fixture dibuka dengan filter yang sama.`);
  };

  const togglePrivacy = () => {
    setPrivacyMode((current) => !current);
    setNotice(!privacyMode ? 'Nominal disembunyikan.' : 'Nominal ditampilkan.');
  };

  return (
    <ScrollView
      accessibilityLabel="Reports fixture"
      contentContainerStyle={[styles.content, { padding: tokens.spacing.space5 }]}
      style={{ backgroundColor: tokens.colors.canvas }}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
            Reports (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Ringkasan arus kas dan net worth
          </Text>
        </View>
        <Button
          label={privacyMode ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
          variant="secondary"
          onPress={togglePrivacy}
          accessibilityLabel={privacyMode ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
          style={styles.headerAction}
        />
      </View>

      <Text style={[tokens.typography.body, styles.status, { color: tokens.colors.textSecondary }]}>
        {reportsStateLabel(snapshot)}
      </Text>

      <View accessibilityRole="tablist" style={styles.segmentRow}>
        {(['cashflow', 'net_worth'] as ReportTab[]).map((item) => (
          <Button
            key={item}
            label={item === 'cashflow' ? 'Cashflow' : 'Net Worth'}
            variant={tab === item ? 'primary' : 'secondary'}
            onPress={() => {
              setTab(fixture.toggleTab(item).tab);
              setNotice(`${item === 'cashflow' ? 'Cashflow' : 'Net worth'} dipilih.`);
            }}
            style={styles.segment}
          />
        ))}
      </View>

      <Text
        style={[tokens.typography.label, styles.fieldLabel, { color: tokens.colors.textSecondary }]}
      >
        Rentang laporan
      </Text>
      <View style={styles.wrapRow}>
        {RANGES.map((item) => (
          <Button
            key={item.id}
            label={item.label}
            variant={range === item.id ? 'primary' : 'secondary'}
            onPress={() => {
              setRange(fixture.setRange(item.id).range);
              setNotice(`Rentang ${item.label.toLowerCase()} dipilih.`);
            }}
            style={styles.smallButton}
          />
        ))}
      </View>

      <View style={styles.wrapRow}>
        <Button
          label={comparison ? 'Matikan perbandingan' : 'Bandingkan periode'}
          variant="secondary"
          onPress={() => {
            const next = !comparison;
            setComparison(next);
            setNotice(fixture.toggleComparison(next).comparisonLabel);
          }}
          style={styles.smallButton}
        />
        <Button
          label={committed ? 'Sembunyikan committed' : 'Tampilkan committed'}
          variant="secondary"
          onPress={() => {
            const next = !committed;
            setCommitted(next);
            setNotice(
              `Committed ${fixture.toggleCommitted(next).committedVisible ? 'ditampilkan' : 'disembunyikan'}.`,
            );
          }}
          style={styles.smallButton}
        />
      </View>

      <Card variant="muted" style={styles.filterCard} accessibilityLabel="Filter laporan">
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          Filter aktif: 0
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Akun · kategori · tag · status · mata uang · refund
        </Text>
        <View style={styles.wrapRow}>
          <Button
            label="Terapkan filter"
            variant="secondary"
            onPress={() => setNotice(`Filter aktif: ${fixture.applyFilters(FILTERS).filterCount}.`)}
            style={styles.smallButton}
          />
          <Button
            label="Batalkan filter"
            variant="tertiary"
            onPress={() =>
              setNotice(`Filter tetap ${fixture.cancelFilters().changed ? 'berubah' : 'sama'}.`)
            }
            style={styles.smallButton}
          />
        </View>
      </Card>

      {isLoading ? (
        <Card variant="muted" style={styles.card} accessibilityLabel="Skeleton laporan">
          <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textSecondary }]}>
            Memuat laporan tanpa angka palsu…
          </Text>
        </Card>
      ) : null}

      {isEmpty ? (
        <Card variant="muted" style={styles.card}>
          <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
            Belum ada transaksi
          </Text>
          <Text
            style={[
              tokens.typography.body,
              styles.cardCopy,
              { color: tokens.colors.textSecondary },
            ]}
          >
            Gunakan rentang ini setelah transaksi fixture pertama dicatat.
          </Text>
          <Button
            label="Catat transaksi"
            onPress={() => setNotice('Fixture catat transaksi dibuka.')}
            style={styles.action}
          />
        </Card>
      ) : null}

      {isPermissionDenied ? (
        <Card variant="muted" style={styles.card}>
          <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
            Laporan read-only karena akses terbatas.
          </Text>
          <Button
            label="Coba lagi laporan"
            onPress={() => setNotice('Recovery laporan fixture selesai.')}
            style={styles.action}
          />
        </Card>
      ) : null}

      {!isLoading && !isEmpty && !isPermissionDenied ? (
        <>
          <View
            accessibilityLabel={tab === 'cashflow' ? 'Ringkasan cashflow' : 'Ringkasan net worth'}
            style={styles.cards}
          >
            {tab === 'cashflow' ? (
              <>
                <SummaryCard
                  label="Earned income"
                  value={snapshot.cashflow.grossIncomeMinor}
                  hidden={privacyMode}
                  tokens={tokens}
                />
                <SummaryCard
                  label="Gross expense"
                  value={snapshot.cashflow.grossExpenseMinor}
                  hidden={privacyMode}
                  tokens={tokens}
                />
                <SummaryCard
                  label="Refund"
                  value={snapshot.cashflow.refundsMinor}
                  hidden={privacyMode}
                  tokens={tokens}
                />
                <SummaryCard
                  label="Net expense"
                  value={snapshot.cashflow.netExpenseMinor}
                  hidden={privacyMode}
                  tokens={tokens}
                />
                <SummaryCard
                  label="Net cashflow"
                  value={snapshot.cashflow.netCashflowMinor}
                  hidden={privacyMode}
                  tokens={tokens}
                />
              </>
            ) : (
              <>
                <SummaryCard
                  label="Total aset"
                  value={snapshot.netWorth.assetsMinor}
                  hidden={privacyMode}
                  tokens={tokens}
                />
                <SummaryCard
                  label="Total liabilitas"
                  value={snapshot.netWorth.liabilitiesMinor}
                  hidden={privacyMode}
                  tokens={tokens}
                />
                <SummaryCard
                  label="Total net worth"
                  value={snapshot.netWorth.netWorthMinor}
                  hidden={privacyMode}
                  tokens={tokens}
                />
                <SummaryCard
                  label="Perubahan absolut"
                  value={snapshot.netWorth.absoluteChangeMinor}
                  hidden={privacyMode}
                  tokens={tokens}
                />
              </>
            )}
          </View>
          {committed && tab === 'cashflow' ? (
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
              Committed expense:{' '}
              {privacyMode ? '••••' : displayMoney(snapshot.cashflow.committedExpenseMinor, false)}
            </Text>
          ) : null}
          {comparison ? (
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
              Periode pembanding: periode sebelumnya dengan panjang sama.
            </Text>
          ) : null}
          <Card style={styles.card} accessibilityLabel="Tren laporan dengan tabel">
            <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
              Tren waktu
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
              Representasi tabel setara untuk pembaca layar · granularity{' '}
              {tab === 'net_worth' ? 'bulanan' : 'mingguan'}
            </Text>
            {snapshot.chart.table.map((row) => (
              <View
                key={row.label}
                accessible
                accessibilityLabel={`${row.label}, ${privacyMode ? 'Nominal disembunyikan' : displayMoney(row.valueMinor, false)}`}
                style={styles.tableRow}
              >
                <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
                  {row.label}
                </Text>
                <SensitiveValue value={displayMoney(row.valueMinor, false)} hidden={privacyMode} />
              </View>
            ))}
          </Card>
          <Text
            style={[
              tokens.typography.heading3,
              styles.sectionHeading,
              { color: tokens.colors.textPrimary },
            ]}
          >
            Breakdown
          </Text>
          {(['category', 'merchant', 'account'] as ReportSection[]).map((section) => (
            <Button
              key={section}
              label={`Buka breakdown ${section}`}
              variant="secondary"
              onPress={() => handleDrillDown(section)}
              style={styles.action}
            />
          ))}
          <Card variant="muted" style={styles.card}>
            <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
              Metodologi
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              {snapshot.methodology.actual}
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              {snapshot.methodology.committed}
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              {snapshot.methodology.refund}
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              {snapshot.methodology.transfer}
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
              As-of {snapshot.methodology.asOf} · {snapshot.methodology.coverage} · base currency{' '}
              {snapshot.methodology.baseCurrency}
            </Text>
          </Card>
        </>
      ) : null}

      {snapshot.fx.missingCount > 0 ? (
        <Card variant="muted" style={styles.card} accessibilityLabel="Partial FX report">
          <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
            {snapshot.fx.missingCount} transaksi belum memiliki kurs.
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Aggregate parsial dipertahankan; tidak ada fallback nol atau 1:1.
          </Text>
        </Card>
      ) : null}
      {snapshot.state === 'partial' ? (
        <Button
          label="Coba lagi net worth"
          variant="secondary"
          onPress={() => setNotice(`Bagian ini ${fixture.retry('net_worth').kind}.`)}
          style={styles.action}
        />
      ) : null}
      {snapshot.state === 'kill_switch' ? (
        <Text
          style={[tokens.typography.body, styles.notice, { color: tokens.colors.textSecondary }]}
        >
          Export disembunyikan; report local-only tetap dapat ditinjau.
        </Text>
      ) : null}

      <Text
        style={[
          tokens.typography.heading3,
          styles.sectionHeading,
          { color: tokens.colors.textPrimary },
        ]}
      >
        Preset & export fixture
      </Text>
      <View style={styles.wrapRow}>
        <Button
          label="Simpan preset fixture"
          variant="secondary"
          onPress={() => setNotice(`Preset ${fixture.savePreset('Laporan aman').kind}.`)}
          style={styles.smallButton}
        />
        <Button
          label="Buka export preview"
          variant="secondary"
          disabled={snapshot.state === 'kill_switch'}
          onPress={() => setExportOpen(true)}
          style={styles.smallButton}
        />
      </View>
      {exportOpen ? (
        <Card variant="muted" style={styles.card} accessibilityLabel="Export CSV fixture">
          <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
            Export CSV fixture
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Kolom aman · rentang {range} · row-count bucket 1–10.
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            File tidak terenkripsi setelah dibagikan. Formula spreadsheet dinetralkan.
          </Text>
          <Button
            label="Konfirmasi export"
            onPress={() => {
              const result = fixture.confirmExport(true);
              setNotice(
                result.kind === 'failed'
                  ? 'Export fixture gagal; temporary result dibersihkan.'
                  : 'Export fixture berhasil; temporary result dibersihkan.',
              );
            }}
            style={styles.action}
          />
          <Button
            label="Batalkan export"
            variant="secondary"
            onPress={() => {
              setExportOpen(false);
              setNotice('Export dibatalkan; temporary result dibersihkan.');
            }}
            style={styles.action}
          />
          {snapshot.state === 'export_failure' ? (
            <Button
              label="Coba export lagi"
              variant="tertiary"
              onPress={() => setNotice(`Export ${fixture.retryExport().kind}.`)}
              style={styles.action}
            />
          ) : null}
        </Card>
      ) : null}

      <Button
        label="Segarkan fixture"
        variant="tertiary"
        onPress={() => setNotice(`Laporan diperbarui ${fixture.refresh().asOf}.`)}
        style={styles.action}
      />
      <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
        Timezone Asia/Jakarta · Minimum {REPORTS_LAYOUT.minimumWidth}dp · target sentuh{' '}
        {REPORTS_LAYOUT.minimumTouchTarget}dp
      </Text>
      {reducedMotion ? (
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Animasi dikurangi sesuai preferensi perangkat.
        </Text>
      ) : null}
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

function SummaryCard({
  label,
  value,
  hidden,
  tokens,
}: {
  label: string;
  value: string;
  hidden: boolean;
  tokens: ReturnType<typeof useTheme>['tokens'];
}) {
  return (
    <Card style={styles.summaryCard} accessibilityLabel={label}>
      <Text style={[tokens.typography.label, { color: tokens.colors.textSecondary }]}>{label}</Text>
      <SensitiveValue
        value={displayMoney(value, false)}
        hidden={hidden}
        accessibilityLabel={hidden ? 'Nominal disembunyikan' : label}
        style={styles.money}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', width: '100%', maxWidth: REPORTS_LAYOUT.maximumContentWidth },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: { flex: 1 },
  headerAction: { minWidth: REPORTS_LAYOUT.minimumTouchTarget },
  status: { marginTop: 10 },
  segmentRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  segment: { flex: 1, minWidth: REPORTS_LAYOUT.minimumTouchTarget },
  fieldLabel: { marginTop: 18 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  smallButton: { flexGrow: 1, minWidth: REPORTS_LAYOUT.minimumTouchTarget },
  filterCard: { marginTop: 16 },
  cards: { gap: 10, marginTop: 16 },
  summaryCard: { minHeight: 82 },
  money: { marginTop: 5 },
  card: { marginTop: 12 },
  cardCopy: { marginTop: 6 },
  action: { marginTop: 10 },
  sectionHeading: { marginTop: 20 },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  notice: { marginTop: 12 },
});
