import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, SensitiveValue } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  AI_INSIGHTS_LAYOUT,
  createAiInsightsFixture,
  type AiInsightsFixture,
  type InsightPeriod,
} from './ai-insights-fixture';

export interface AiInsightsWireframeProps {
  fixture?: AiInsightsFixture;
  onBack?: () => void;
  onOpenReport?: () => void;
}

const STATE_COPY: Record<string, string> = {
  ready: 'AI nonaktif; laporan deterministik tetap tersedia.',
  consent_required: 'Consent diperlukan sebelum pemrosesan fixture.',
  consented: 'Consent fixture aktif; data tetap agregat dan read-only.',
  offline: 'Offline snapshot tersedia; jawaban generatif ditunda.',
  missing_data: 'Sebagian data hilang; ketidakpastian ditampilkan.',
  timeout: 'Provider timeout fixture; gunakan laporan deterministik.',
  provider_outage: 'Provider outage fixture; gunakan laporan deterministik.',
  rate_limited: 'Rate limit fixture; coba lagi nanti.',
  quota_exceeded: 'Cost quota fixture tercapai; generation dihentikan.',
  unsafe_output: 'Output tidak aman ditahan; fallback tersedia.',
  access_error: 'Akses scope tidak dapat diverifikasi; fallback aman.',
  prompt_injection: 'Input tidak tepercaya diperlakukan sebagai data.',
  kill_switch: 'Kill switch aktif; laporan deterministik tetap hidup.',
  revoked: 'Consent dicabut; pemrosesan fixture dihentikan.',
  privacy_masked: 'Privacy mode aktif; nominal disamarkan.',
};

export function AiInsightsWireframe({
  fixture: suppliedFixture,
  onBack,
  onOpenReport,
}: AiInsightsWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createAiInsightsFixture());
  const fixture = suppliedFixture ?? fallbackFixture;
  const [consent, setConsent] = useState(fixture.consentSnapshot().enabled);
  const [disclosureOpen, setDisclosureOpen] = useState(false);
  const [period, setPeriod] = useState<InsightPeriod>('weekly');
  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(fixture.scenario === 'privacy_masked');
  const [notice, setNotice] = useState('');
  const insight = fixture.insights(period);

  const act = (message: string) => setNotice(message);
  const ask = () => {
    const result = fixture.ask('safe fixture question');
    act(
      result.kind === 'sourced_answer'
        ? 'Jawaban memakai fakta bersumber dan read-only.'
        : `Assistant ${result.kind}; fallback aman tersedia.`,
    );
  };

  return (
    <ScrollView
      accessibilityLabel="AI insights assistant fixture"
      contentContainerStyle={[styles.content, { padding: tokens.spacing.space5 }]}
      style={{ backgroundColor: tokens.colors.canvas }}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
            AI insights &amp; assistant (fixture)
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Discovery-gated · fakta deterministik lebih dulu · tidak ada auto-action.
          </Text>
        </View>
        <Button
          label="Kembali"
          variant="tertiary"
          onPress={() => onBack?.() ?? act('Kembali ke Reports fixture.')}
          accessibilityLabel="Kembali dari AI insights"
          style={styles.headerAction}
        />
      </View>

      <Text style={[tokens.typography.body, styles.status, { color: tokens.colors.textSecondary }]}>
        {STATE_COPY[fixture.scenario] ?? STATE_COPY.ready}
      </Text>

      <Card variant="muted" style={styles.card} accessibilityLabel="AI consent disclosure">
        <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
          Consent &amp; disclosure
        </Text>
        <Text style={[tokens.typography.body, styles.copy, { color: tokens.colors.textSecondary }]}>
          AI off-by-default. Core Reports tetap bisa dipakai tanpa model atau provider.
        </Text>
        <Button
          label="Buka disclosure AI"
          variant="secondary"
          onPress={() => setDisclosureOpen((value) => !value)}
          style={styles.action}
        />
        {disclosureOpen ? (
          <View style={styles.inner}>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
              Diproses: aggregated financial facts only · tujuan: penjelasan pola.
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
              Retensi: 30 hari atau local-only · provider class: provider-neutral fixture.
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
              Alternatif: deterministic reports. Raw receipt, audio, notes, email, dan identifier
              tidak diproses.
            </Text>
            <Button
              label={consent ? 'Cabut consent AI' : 'Aktifkan consent AI'}
              onPress={() => {
                const next = !consent;
                setConsent(fixture.setConsent(next).enabled);
                act(next ? 'Consent fixture aktif.' : 'Consent dicabut; pemrosesan dihentikan.');
              }}
              style={styles.action}
            />
          </View>
        ) : null}
      </Card>

      <Card variant="muted" style={styles.card} accessibilityLabel="Deterministic insight cards">
        <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
          Insight cards
        </Text>
        <View style={styles.row}>
          <Button
            label="Insight mingguan"
            variant={period === 'weekly' ? 'primary' : 'secondary'}
            onPress={() => {
              setPeriod('weekly');
              act('Insight mingguan dipilih.');
            }}
            style={styles.small}
          />
          <Button
            label="Pilih insight bulanan"
            variant={period === 'monthly' ? 'primary' : 'secondary'}
            onPress={() => {
              setPeriod('monthly');
              act('Insight bulanan dipilih.');
            }}
            style={styles.small}
          />
        </View>
        <Text
          style={[tokens.typography.caption, styles.copy, { color: tokens.colors.textSecondary }]}
        >
          Fakta {period} ditampilkan lebih dulu · label AI-generated · Mengapa saya melihat ini? ·
          sumber aggregate deterministik.
        </Text>
        {insight.facts.map((fact) => (
          <View
            key={fact.key}
            accessible
            accessibilityLabel={`${fact.key}, nilai disamarkan, sumber aggregate deterministik`}
            style={styles.factRow}
          >
            <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
              {fact.key.replace('_', ' ')}
            </Text>
            <SensitiveValue value={privacyMode ? '••••' : 'fixture bucket'} hidden={privacyMode} />
          </View>
        ))}
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          {insight.uncertainty}
        </Text>
        <Button
          label={privacyMode ? 'Tampilkan nilai fixture' : 'Aktifkan masking nominal'}
          variant="secondary"
          onPress={() => {
            setPrivacyMode((value) => !value);
            act('Privacy mode diperbarui.');
          }}
          style={styles.action}
        />
        <Button
          label="Buka laporan deterministik"
          variant="tertiary"
          onPress={() => onOpenReport?.() ?? act('Reports fixture dibuka.')}
          style={styles.action}
        />
      </Card>

      <Card variant="muted" style={styles.card} accessibilityLabel="Read only financial assistant">
        <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
          Assistant Q&amp;A
        </Text>
        <Text style={[tokens.typography.body, styles.copy, { color: tokens.colors.textSecondary }]}>
          Konfirmasi scope household dan rentang waktu sebelum read-only tools dijalankan.
        </Text>
        <Button
          label={scopeConfirmed ? 'Scope household terkonfirmasi' : 'Konfirmasi scope household'}
          variant="secondary"
          onPress={() => {
            const result = fixture.confirmScope({ household: 'current', timeRange: 'this_month' });
            setScopeConfirmed(result.confirmed);
            act('Scope household · bulan ini terkonfirmasi.');
          }}
          style={styles.action}
        />
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Tools allowlist: cashflow · budget variance · recurring changes · transaction summary ·
          net worth trend.
        </Text>
        <Button label="Kirim pertanyaan fixture" onPress={ask} style={styles.action} />
        <Button
          label="Tolak saran berisiko"
          variant="secondary"
          onPress={() =>
            act(
              `Safety ${fixture.unsupportedAdvice('buy stock').kind}; tidak ada autonomous action.`,
            )
          }
          style={styles.action}
        />
        <Button
          label="Simpan draft budget"
          variant="secondary"
          onPress={() =>
            act(
              `Draft ${fixture.draftAction('budget').destination} kembali ke confirmation normal.`,
            )
          }
          style={styles.action}
        />
        <Button
          label="Feedback membantu"
          variant="tertiary"
          onPress={() =>
            act(`Feedback ${fixture.feedback('helpful').rating} tercatat sebagai enum aman.`)
          }
          style={styles.action}
        />
        <Button
          label="Bersihkan percakapan"
          variant="tertiary"
          onPress={() =>
            act(
              `Percakapan dibersihkan: ${fixture.clearConversation().localOnly ? 'local-only' : 'fixture'}.`,
            )
          }
          style={styles.action}
        />
      </Card>

      <Card variant="muted" style={styles.card} accessibilityLabel="AI recovery fixture">
        <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
          Recovery
        </Text>
        <Text style={[tokens.typography.body, styles.copy, { color: tokens.colors.textSecondary }]}>
          Timeout, outage, 429, quota, unsafe output, access error, revoked consent, dan kill switch
          memakai fallback Reports deterministik.
        </Text>
        <Button
          label="Cabut consent AI"
          variant="secondary"
          onPress={() => {
            const result = fixture.revokeConsent();
            setConsent(false);
            act(
              result.processingStopped
                ? 'Pemrosesan dihentikan dan deletion fixture dimulai.'
                : 'Recovery fixture selesai.',
            );
          }}
          style={styles.action}
        />
        <Button
          label="Buka laporan deterministik"
          variant="tertiary"
          onPress={() => onOpenReport?.() ?? act('Fallback laporan deterministik dibuka.')}
          style={styles.action}
        />
      </Card>

      <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
        Minimum {AI_INSIGHTS_LAYOUT.minimumWidth}dp · target sentuh{' '}
        {AI_INSIGHTS_LAYOUT.minimumTouchTarget}dp · provider/network tidak digunakan.
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

const styles = StyleSheet.create({
  content: { alignSelf: 'center', width: '100%', maxWidth: AI_INSIGHTS_LAYOUT.maximumContentWidth },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: { flex: 1 },
  headerAction: { minWidth: AI_INSIGHTS_LAYOUT.minimumTouchTarget },
  status: { marginTop: 10 },
  card: { marginTop: 16 },
  inner: { marginTop: 10, gap: 6 },
  copy: { marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  small: { flexGrow: 1, minWidth: AI_INSIGHTS_LAYOUT.minimumTouchTarget },
  action: { marginTop: 10 },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  notice: { marginTop: 12 },
});
