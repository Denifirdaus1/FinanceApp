import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input, SensitiveValue } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  DEBT_LAYOUT,
  createDebtFixture,
  formatDebtMoney,
  type DebtDraft,
  type DebtFixture,
  type DebtScenario,
} from './debt-fixture';

type DebtView = 'list' | 'wizard' | 'detail' | 'payment' | 'statement' | 'history' | 'scenario';

const initialDraft: DebtDraft = {
  name: 'Debt baru',
  kind: 'installment',
  trackingMode: 'ledger',
  currency: 'IDR',
  openingOutstandingMinor: '10000000',
  openingAsOf: '2026-01-01',
  creditLimitMinor: null,
  accountId: 'account-loan-fixture',
  statementDate: '2026-08-15',
  dueDate: '2026-08-25',
  minimumDueMinor: '500000',
  aprBps: 1200,
  periods: 12,
  paymentsPerYear: 12,
  reminderOptIn: false,
};

function scenarioCopy(scenario: DebtScenario): string {
  const copies: Record<DebtScenario, string> = {
    populated: 'Data debt siap ditinjau.',
    loading: 'Memuat debt fixture…',
    empty: 'Belum ada debt. Tambahkan pencatatan debt pertama.',
    offline: 'Offline: perubahan akan queued sebagai fixture.',
    stale: 'forecast stale: horizon terakhir tetap terlihat.',
    partial_fx: 'FX belum tersedia: native balance tetap terlihat, aggregate base partial.',
    statement_assisted: 'Mode statement-assisted aktif; rekonsiliasi tetap eksplisit.',
    statement_mismatch: 'Selisih statement menunggu konfirmasi adjustment.',
    pending: 'Payment pending: actual outstanding belum berubah.',
    permission_revoked: 'Akses berubah; debt menjadi read-only.',
    archived_closed: 'Debt arsip/closed; histori tetap terbaca.',
    negative_amortization: 'negative amortization: payment tidak menutup interest dan fee.',
    amortization_kill_switch: 'Forecast amortization dalam maintenance; actual ledger tetap aktif.',
    reminder_kill_switch: 'Reminder kill-switch: gunakan in-app review.',
    too_large_schedule: 'Schedule terlalu besar untuk fixture preview.',
    conflict: 'konflik mutation; review atau buat salinan.',
    invalid: 'Konfigurasi debt tidak valid; periksa kembali.',
    materialization_failure: 'Materialization failure; retry incremental tersedia.',
  };
  return copies[scenario];
}

export interface DebtWireframeProps {
  fixture?: DebtFixture;
  onDrillDown?: (route: '/transactions') => void;
}

export function DebtWireframe({ fixture: suppliedFixture, onDrillDown }: DebtWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createDebtFixture());
  const fixture = suppliedFixture ?? fallbackFixture;
  const [view, setView] = useState<DebtView>('list');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState<DebtDraft>(initialDraft);

  const showResult = (message: string) => setNotice(message);
  const backToList = () => setView('list');
  const backToDetail = () => setView('detail');
  const drillDown = () => {
    if (onDrillDown) onDrillDown('/transactions');
    else showResult('Transaksi fixture siap ditinjau tanpa parameter sensitif.');
  };

  return (
    <ScrollView
      accessibilityLabel="Debt fixture"
      contentContainerStyle={[styles.content, { padding: tokens.spacing.space5 }]}
      style={{ backgroundColor: tokens.colors.canvas }}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
            Debt &amp; Loans (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Pencatatan kewajiban dan pinjaman untuk ditinjau lokal.
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
      <Card variant="muted" style={styles.statusCard} accessibilityLabel="Status debt fixture">
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          {scenarioCopy(fixture.scenario)}
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Deterministic fixture · {reducedMotion ? 'Animasi dikurangi' : 'Animasi aman'} · tidak ada
          fasilitas pinjaman nyata.
        </Text>
        {fixture.scenario === 'partial_fx' ||
        fixture.scenario === 'statement_mismatch' ||
        fixture.scenario === 'materialization_failure' ? (
          <Button
            label="Coba lagi debt"
            variant="secondary"
            onPress={() =>
              showResult(
                fixture.retry().kind === 'incremental_retry'
                  ? 'Retry incremental berhasil sebagai fixture.'
                  : 'Retry debt berhasil sebagai fixture.',
              )
            }
            style={styles.smallButton}
          />
        ) : null}
        {fixture.scenario === 'reminder_kill_switch' ? (
          <Button
            label="Gunakan in-app review"
            variant="secondary"
            onPress={() => showResult(fixture.reminder().copy)}
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

      {view === 'wizard' ? (
        <Card accessibilityLabel="Wizard debt fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Wizard debt (fixture)
          </Text>
          <Input
            label="Nama debt"
            value={draft.name}
            onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
            accessibilityLabel="Nama debt"
          />
          <Input
            label="Opening outstanding"
            value={draft.openingOutstandingMinor}
            onChangeText={(openingOutstandingMinor) =>
              setDraft((current) => ({ ...current, openingOutstandingMinor }))
            }
            keyboardType="number-pad"
            accessibilityLabel="Opening outstanding"
          />
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Jenis installment · ledger · IDR · as-of 1 Januari 2026 · akun liability fixture
            opsional.
          </Text>
          <View style={styles.wrapRow}>
            <Button
              label="Ledger tracking"
              variant="primary"
              onPress={() => showResult('Ledger tracking dipilih di fixture.')}
              style={styles.smallButton}
            />
            <Button
              label="Statement-assisted tracking"
              variant="secondary"
              onPress={() => showResult('Statement-assisted dipilih di fixture.')}
              style={styles.smallButton}
            />
            <Button
              label={draft.reminderOptIn ? 'Matikan reminder fixture' : 'Opt-in reminder fixture'}
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
            accessibilityLabel="Preview amortization fixture"
          >
            <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
              Preview fixed-rate schedule
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
              Formula dan estimasi payment ditampilkan sebagai forecast; lender statement tetap
              menjadi acuan.
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
              12 periode · 12 pembayaran per tahun · reminder tidak menjadwalkan notifikasi nyata.
            </Text>
          </Card>
          <View style={styles.wrapRow}>
            <Button
              label="Simpan debt fixture"
              onPress={() => {
                const result = fixture.save(draft);
                showResult(
                  result.status === 'invalid'
                    ? (result.errors?.[0] ?? 'Periksa debt.')
                    : result.copy,
                );
              }}
              style={styles.smallButton}
            />
            <Button
              label="Kembali ke daftar debt"
              variant="secondary"
              onPress={backToList}
              style={styles.smallButton}
            />
          </View>
        </Card>
      ) : view === 'detail' ? (
        <Card accessibilityLabel="Detail debt fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Detail debt (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Actual outstanding berasal dari ledger actual atau formula statement-assisted; forecast
            tidak mengubah saldo.
          </Text>
          <SensitiveValue value={formatDebtMoney('10000000', 'IDR')} hidden={privacyMode} />
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Pending principal ditampilkan terpisah · next due dan minimum due dari fixture ·
            reconciliation status dapat ditinjau.
          </Text>
          <View style={styles.wrapRow}>
            <Button
              label="Catat pembayaran"
              onPress={() => setView('payment')}
              style={styles.smallButton}
            />
            <Button
              label="Rekonsiliasi statement"
              variant="secondary"
              onPress={() => setView('statement')}
              style={styles.smallButton}
            />
            <Button
              label="Lihat histori debt"
              variant="secondary"
              onPress={() => setView('history')}
              style={styles.smallButton}
            />
            <Button
              label="Skenario extra principal"
              variant="secondary"
              onPress={() => setView('scenario')}
              style={styles.smallButton}
            />
            <Button
              label="Buka transaksi fixture"
              variant="secondary"
              onPress={drillDown}
              style={styles.smallButton}
            />
          </View>
          <Button
            label="Kembali ke daftar debt"
            variant="secondary"
            onPress={backToList}
            style={styles.actionButton}
          />
        </Card>
      ) : view === 'payment' ? (
        <Card accessibilityLabel="Pembayaran debt fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Pembayaran debt (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Source account fixture · total cash paid dialokasikan ke principal, interest, fee,
            adjustment.
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Principal adalah transfer ke liability, bukan expense. Interest dan fee menjadi expense
            terpisah. Group atomic dan idempotent.
          </Text>
          <Button
            label="Review payment group"
            onPress={() => showResult('Payment group valid dan siap dikonfirmasi sebagai fixture.')}
            style={styles.actionButton}
          />
          <Button
            label="Konfirmasi payment fixture"
            onPress={() =>
              showResult(
                fixture.paymentResult().status === 'queued'
                  ? 'Payment queued sebagai pending fixture.'
                  : 'Payment fixture terkonfirmasi tanpa posting nyata.',
              )
            }
            style={styles.actionButton}
          />
          <Button
            label="Kembali ke detail debt"
            variant="secondary"
            onPress={backToDetail}
            style={styles.actionButton}
          />
        </Card>
      ) : view === 'statement' ? (
        <Card accessibilityLabel="Rekonsiliasi statement fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Rekonsiliasi statement (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Closing statement dibandingkan calculated balance at cutoff. Opening balance tidak
            diubah diam-diam.
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
            Selisih statement: {privacyMode ? '••••' : formatDebtMoney('100000', 'IDR')} ·
            adjustment explicit
          </Text>
          <Button
            label="Review adjustment"
            onPress={() => showResult('Adjustment preview menunggu konfirmasi eksplisit.')}
            style={styles.actionButton}
          />
          <Button
            label="Konfirmasi adjustment fixture"
            onPress={() =>
              showResult(
                fixture.reconcileStatement(true).openingChanged
                  ? 'Opening berubah.'
                  : 'Adjustment fixture diterapkan; opening balance tetap.',
              )
            }
            style={styles.actionButton}
          />
          <Button
            label="Kembali ke detail debt"
            variant="secondary"
            onPress={backToDetail}
            style={styles.actionButton}
          />
        </Card>
      ) : view === 'history' ? (
        <Card accessibilityLabel="Histori debt fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Histori debt (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Payment, statement observation, archive, dan reconciliation tetap dapat dibaca.
          </Text>
          <Button
            label="Kembali ke detail debt"
            variant="secondary"
            onPress={backToDetail}
            style={styles.actionButton}
          />
        </Card>
      ) : view === 'scenario' ? (
        <Card accessibilityLabel="Skenario debt fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Skenario extra principal (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Skenario ini hanya preview lokal dan tidak membuat transaksi atau mengubah actual
            outstanding.
          </Text>
          <Button
            label="Jalankan skenario fixture"
            onPress={() =>
              showResult(
                fixture.extraPrincipal('200000').actualChanged
                  ? 'Saldo berubah.'
                  : 'Skenario dihitung tanpa mengubah saldo actual.',
              )
            }
            style={styles.actionButton}
          />
          <Button
            label="Kembali ke detail debt"
            variant="secondary"
            onPress={backToDetail}
            style={styles.actionButton}
          />
        </Card>
      ) : (
        <>
          <View style={styles.wrapRow}>
            <Button
              label="Buat debt"
              onPress={() => setView('wizard')}
              style={styles.smallButton}
            />
            <Button
              label="Urutkan debt"
              variant="secondary"
              onPress={() => showResult('Debt diurutkan berdasarkan due date fixture.')}
              style={styles.smallButton}
            />
            <Button
              label="Segarkan fixture"
              variant="secondary"
              onPress={() => showResult('Fixture disegarkan tanpa network.')}
              style={styles.smallButton}
            />
          </View>
          {fixture.list().length === 0 ? (
            <Card variant="muted" style={styles.section}>
              <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
                {fixture.scenario === 'loading' ? 'Memuat debt…' : 'Belum ada debt.'}
              </Text>
              <Button
                label="Buat debt"
                onPress={() => setView('wizard')}
                style={styles.actionButton}
              />
            </Card>
          ) : (
            fixture.list().map((debt) => (
              <Card
                key={debt.id}
                variant="muted"
                style={styles.section}
                accessibilityLabel={`Debt ${debt.status}`}
              >
                <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
                  {debt.name}
                </Text>
                <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
                  {debt.kind} · {debt.status} · due {debt.dueDate} · minimum due fixture
                </Text>
                <SensitiveValue
                  value={formatDebtMoney(debt.outstandingMinor, debt.currency)}
                  hidden={privacyMode}
                />
                <View style={styles.wrapRow}>
                  <Button
                    label="Buka detail debt"
                    variant="secondary"
                    onPress={() => setView('detail')}
                    style={styles.smallButton}
                  />
                  <Button
                    label="Archive debt"
                    variant="secondary"
                    onPress={() =>
                      showResult(
                        fixture.archive(true).status === 'archived'
                          ? 'Debt diarsipkan sebagai fixture.'
                          : 'Archive dibatalkan.',
                      )
                    }
                    style={styles.smallButton}
                  />
                  <Button
                    label="Reopen debt"
                    variant="secondary"
                    onPress={() => showResult(`Debt ${fixture.reopen().status} sebagai fixture.`)}
                    style={styles.smallButton}
                  />
                </View>
              </Card>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    alignSelf: 'center',
    width: '100%',
    maxWidth: DEBT_LAYOUT.maximumContentWidth,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerCopy: { flex: 1, gap: 4 },
  headerAction: { minHeight: DEBT_LAYOUT.minimumTouchTarget },
  statusCard: { gap: 8 },
  notice: { padding: 12 },
  section: { gap: 12 },
  previewCard: { gap: 6 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallButton: { minHeight: DEBT_LAYOUT.minimumTouchTarget },
  actionButton: { minHeight: DEBT_LAYOUT.minimumTouchTarget },
});
