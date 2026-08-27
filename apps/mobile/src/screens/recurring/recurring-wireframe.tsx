import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input, SensitiveValue } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  RECURRING_LAYOUT,
  createRecurringFixture,
  formatRecurringMoney,
  type RecurringDraft,
  type RecurringFixture,
  type RecurringScenario,
} from './recurring-fixture';

type ViewName = 'list' | 'wizard' | 'occurrence' | 'detail';
type TransactionRoute = '/transactions';

export interface RecurringWireframeProps {
  fixture?: RecurringFixture;
  onDrillDown?: (route: TransactionRoute) => void;
}

const initialDraft: RecurringDraft = {
  name: 'Recurring baru',
  kind: 'expense',
  amountMode: 'fixed',
  amountMinor: '350000',
  currency: 'IDR',
  accountId: 'account-cash-fixture',
  destinationAccountId: null,
  categoryId: 'category-bills',
  cadence: 'monthly',
  interval: 1,
  anchorDate: '2026-01-31',
  dueDate: '2026-08-31',
  timezone: 'Asia/Jakarta',
  monthEndPolicy: 'clamp',
  weekendPolicy: 'keep',
  endCondition: 'none',
  endAfterOccurrences: null,
  endDate: null,
  reminderOptIn: false,
  postingMode: 'draft',
  varianceAbsoluteMinor: '50000',
  variancePercent: 10,
};

function scenarioCopy(scenario: RecurringScenario): string {
  const copy: Record<RecurringScenario, string> = {
    populated: 'Data recurring siap ditinjau.',
    loading: 'Memuat recurring fixture…',
    empty: 'Belum ada recurring. Buat rule pertama sebagai fixture.',
    offline: 'Offline: perubahan akan queued sebagai pending fixture.',
    stale: 'Data stale: horizon terakhir tetap ditampilkan.',
    partial: 'Bagian ini perlu dicoba lagi.',
    variable_estimate: 'estimasi variabel berdasarkan histori fixture.',
    matched_pending: 'Occurrence matched_pending: menunggu posted dan cleared.',
    paid: 'Occurrence paid fixture.',
    due: 'Occurrence due fixture.',
    overdue: 'Occurrence overdue fixture.',
    skipped: 'Occurrence skipped fixture.',
    snoozed: 'Occurrence snoozed; due date tidak berubah.',
    archived_paused: 'Rule paused dan histori arsip tetap dapat dibaca.',
    permission_revoked: 'Akses berubah; mode read-only.',
    materialization_failure: 'materialization failure; retry incremental tersedia.',
    rule_conflict: 'konflik rule: review perubahan dan gunakan salinan.',
    matching_kill_switch: 'matching dimatikan; gunakan manual review.',
    push_kill_switch: 'Push dimatikan; local list tetap aktif.',
    invalid: 'Konfigurasi recurring tidak valid; periksa kembali.',
  };
  return copy[scenario];
}

export function RecurringWireframe({
  fixture: suppliedFixture,
  onDrillDown,
}: RecurringWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createRecurringFixture());
  const fixture = suppliedFixture ?? fallbackFixture;
  const [view, setView] = useState<ViewName>('list');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState<RecurringDraft>(initialDraft);
  const [showArchived, setShowArchived] = useState(false);

  const showResult = (result: string) => setNotice(result);
  const preview = fixture.preview();
  const list = showArchived
    ? fixture.filterStatus('archived')
    : fixture.list().filter((item) => item.status !== 'archived');
  const saveDraft = () => {
    const result = fixture.save(draft);
    showResult(
      result.status === 'invalid'
        ? (result.errors?.[0] ?? 'Periksa kembali recurring.')
        : result.copy,
    );
    if (result.status === 'saved' || result.status === 'queued') setView('list');
  };
  const drillDown = () => {
    if (onDrillDown) onDrillDown('/transactions');
    else showResult('Transaksi fixture siap ditinjau tanpa parameter sensitif.');
  };

  return (
    <ScrollView
      accessibilityLabel="Recurring fixture"
      contentContainerStyle={[styles.content, { padding: tokens.spacing.space5 }]}
      style={{ backgroundColor: tokens.colors.canvas }}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
            Recurring (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Tagihan dan langganan lokal untuk ditinjau.
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

      <Card variant="muted" style={styles.statusCard} accessibilityLabel="Status recurring fixture">
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          {scenarioCopy(fixture.scenario)}
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Status deterministik · {reducedMotion ? 'Animasi dikurangi' : 'Animasi aman'} · timezone
          Asia/Jakarta
        </Text>
        {fixture.scenario === 'partial' || fixture.scenario === 'materialization_failure' ? (
          <Button
            label="Coba lagi recurring"
            variant="secondary"
            onPress={() =>
              showResult(
                fixture.retry().kind === 'incremental_retry'
                  ? 'Retry incremental berhasil sebagai fixture.'
                  : 'Retry recurring berhasil sebagai fixture.',
              )
            }
            style={styles.smallButton}
          />
        ) : null}
        {fixture.scenario === 'matching_kill_switch' ? (
          <Button
            label="Gunakan manual review"
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
        <Card accessibilityLabel="Wizard recurring fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Wizard recurring (fixture)
          </Text>
          <Input
            label="Nama recurring"
            value={draft.name}
            onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
            accessibilityLabel="Nama recurring"
          />
          <Input
            label="Nominal minor unit"
            value={draft.amountMinor}
            onChangeText={(amountMinor) => setDraft((current) => ({ ...current, amountMinor }))}
            keyboardType="number-pad"
            accessibilityLabel="Nominal recurring"
          />
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Currency {draft.currency} · akun fixture · {draft.timezone} · auto-post hanya copy
            fixture.
          </Text>
          <Text
            style={[
              tokens.typography.label,
              styles.fieldLabel,
              { color: tokens.colors.textSecondary },
            ]}
          >
            Cadence dan amount mode
          </Text>
          <View style={styles.wrapRow}>
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((cadence) => (
              <Button
                key={cadence}
                label={cadence === draft.cadence ? `${cadence} dipilih` : cadence}
                variant={cadence === draft.cadence ? 'primary' : 'secondary'}
                onPress={() => {
                  setDraft((current) => ({ ...current, cadence }));
                  showResult(`Cadence ${cadence} dipilih.`);
                }}
                style={styles.smallButton}
              />
            ))}
            {(['fixed', 'last_settled', 'rolling_3'] as const).map((amountMode) => (
              <Button
                key={amountMode}
                label={amountMode === draft.amountMode ? `${amountMode} dipilih` : amountMode}
                variant="secondary"
                onPress={() => {
                  setDraft((current) => ({ ...current, amountMode }));
                  showResult(`Mode ${amountMode} dipilih.`);
                }}
                style={styles.smallButton}
              />
            ))}
          </View>
          <Button
            label={draft.reminderOptIn ? 'Matikan reminder fixture' : 'Opt-in reminder fixture'}
            variant="secondary"
            onPress={() => {
              setDraft((current) => ({ ...current, reminderOptIn: !current.reminderOptIn }));
              showResult('Preferensi reminder berubah di fixture.');
            }}
            style={styles.smallButton}
          />
          <Card
            variant="muted"
            style={styles.previewCard}
            accessibilityLabel="Preview enam occurrence"
          >
            <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
              Preview enam occurrence · {preview.estimateLabel}
            </Text>
            {preview.occurrences.map((date) => (
              <Text
                key={date}
                style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}
              >
                {date} ·{' '}
                {privacyMode ? '••••' : formatRecurringMoney(draft.amountMinor, draft.currency)} ·
                estimated
              </Text>
            ))}
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
              {preview.postingCopy}
            </Text>
          </Card>
          <View style={styles.wrapRow}>
            <Button
              label="Simpan recurring fixture"
              onPress={saveDraft}
              style={styles.smallButton}
            />
            <Button
              label="Kembali ke daftar recurring"
              variant="secondary"
              onPress={() => setView('list')}
              style={styles.smallButton}
            />
          </View>
        </Card>
      ) : view === 'occurrence' ? (
        <Card accessibilityLabel="Occurrence detail fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Occurrence detail (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Status: {fixture.currentOccurrence()} · due local date disamarkan sebagai fixture.
          </Text>
          <SensitiveValue value={formatRecurringMoney('350000', 'IDR')} hidden={privacyMode} />
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Candidate reason: tanggal, nominal, dan payee fixture cocok; konfirmasi manual
            diperlukan.
          </Text>
          {(
            [
              'Konfirmasi match',
              'Unmatch occurrence',
              'Lewati occurrence',
              'Snooze reminder',
              'Edit occurrence',
              'Edit future occurrences',
            ] as const
          ).map((label) => (
            <Button
              key={label}
              label={label}
              variant="secondary"
              onPress={() => showResult(`${label} menghasilkan state fixture.`)}
              style={styles.actionButton}
            />
          ))}
          <Button
            label="Kembali ke daftar recurring"
            variant="secondary"
            onPress={() => setView('list')}
            style={styles.actionButton}
          />
        </Card>
      ) : view === 'detail' ? (
        <Card accessibilityLabel="Detail recurring fixture" style={styles.section}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            Detail recurring fixture
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Formula: occurrence bukan actual sebelum source posted dan cleared/reconciled. Transfer
            tidak menjadi spending.
          </Text>
          <Button
            label="Lihat histori recurring"
            variant="secondary"
            onPress={() => showResult('Histori tetap tersedia sebagai fixture.')}
            style={styles.actionButton}
          />
          <Button
            label="Buka transaksi fixture"
            variant="secondary"
            onPress={drillDown}
            style={styles.actionButton}
          />
          <Button
            label="Kembali ke daftar recurring"
            variant="secondary"
            onPress={() => setView('list')}
            style={styles.actionButton}
          />
        </Card>
      ) : (
        <>
          <View style={styles.wrapRow}>
            <Button
              label="Buat recurring"
              onPress={() => setView('wizard')}
              style={styles.smallButton}
            />
            <Button
              label="Salin recurring sebelumnya"
              variant="secondary"
              onPress={() => showResult(`Fixture ${fixture.copyPrevious().name} siap diedit.`)}
              style={styles.smallButton}
            />
            <Button
              label="Cek occurrence"
              variant="secondary"
              onPress={() => setView('occurrence')}
              style={styles.smallButton}
            />
            <Button
              label="Urutkan recurring"
              variant="secondary"
              onPress={() => showResult('Urutan recurring berdasarkan due date fixture.')}
              style={styles.smallButton}
            />
            <Button
              label={showArchived ? 'Sembunyikan recurring arsip' : 'Tampilkan recurring arsip'}
              variant="secondary"
              onPress={() => setShowArchived((current) => !current)}
              style={styles.smallButton}
            />
            <Button
              label="Segarkan fixture"
              variant="secondary"
              onPress={() => showResult('Fixture disegarkan tanpa network.')}
              style={styles.smallButton}
            />
          </View>
          {list.length === 0 ? (
            <Card variant="muted" style={styles.section}>
              <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
                {fixture.scenario === 'loading' ? 'Memuat recurring…' : 'Belum ada recurring.'}
              </Text>
              <Button
                label="Buat recurring"
                onPress={() => setView('wizard')}
                style={styles.actionButton}
              />
            </Card>
          ) : (
            list.map((item) => (
              <Card
                key={item.id}
                variant="muted"
                style={styles.section}
                accessibilityLabel={`Recurring ${item.status}`}
              >
                <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
                  {item.name}
                </Text>
                <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
                  {item.kind} · {item.status} · due {item.nextDueDate}
                </Text>
                <SensitiveValue
                  value={formatRecurringMoney(item.amountMinor, item.currency)}
                  hidden={privacyMode}
                />
                <View style={styles.wrapRow}>
                  <Button
                    label="Buka detail recurring"
                    variant="secondary"
                    onPress={() => setView('detail')}
                    style={styles.smallButton}
                  />
                  <Button
                    label="Pause recurring"
                    variant="secondary"
                    onPress={() => showResult(`State ${fixture.pause().status} fixture.`)}
                    style={styles.smallButton}
                  />
                  <Button
                    label="Akhiri recurring"
                    variant="secondary"
                    onPress={() => showResult(`State ${fixture.end().status} fixture.`)}
                    style={styles.smallButton}
                  />
                  <Button
                    label="Arsipkan recurring"
                    variant="secondary"
                    onPress={() => showResult(`State ${fixture.archive(true).status} fixture.`)}
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
    maxWidth: RECURRING_LAYOUT.maximumContentWidth,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerCopy: { flex: 1, gap: 4 },
  headerAction: { minHeight: RECURRING_LAYOUT.minimumTouchTarget },
  statusCard: { gap: 8 },
  notice: { padding: 12 },
  section: { gap: 12 },
  previewCard: { gap: 6 },
  fieldLabel: { marginTop: 4 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallButton: { minHeight: RECURRING_LAYOUT.minimumTouchTarget },
  actionButton: { minHeight: RECURRING_LAYOUT.minimumTouchTarget },
});
