import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  CURRENCY_LAYOUT,
  createCurrencyFixture,
  type CurrencyFixture,
  type CurrencyState,
} from './currency-fixture';

type CurrencyView =
  'hub' | 'settings' | 'settings-review' | 'rates' | 'report' | 'cross' | 'cross-review';

export interface CurrencyWireframeProps {
  fixture?: CurrencyFixture;
  onBack?: () => void;
}

function stateLabel(state: CurrencyState): string {
  switch (state) {
    case 'loading':
      return 'Memuat multi-currency fixture…';
    case 'empty':
      return 'Belum ada quote multi-currency fixture.';
    case 'offline':
      return 'Offline: last-known rate diberi label dan perlu review.';
    case 'missing_rate':
      return 'Rate hilang: report partial, tidak memakai fallback 1:1.';
    case 'stale_rate':
      return 'Rate stale: nilai last-known perlu review.';
    case 'unsupported_currency':
      return 'Currency tidak didukung oleh katalog fixture.';
    case 'permission_denied':
      return 'Akses currency ditolak pada fixture ini.';
    case 'read_only':
      return 'Multi-currency read-only: pembuatan baru dimatikan oleh kill switch.';
    case 'sync_pending':
      return 'Perubahan menunggu sinkronisasi fixture.';
    case 'failed':
      return 'Penyimpanan fixture gagal; retry mempertahankan draft.';
    case 'needs_re_review':
      return 'Preference berubah bersamaan; draft perlu ditinjau ulang.';
    case 'aggregate_rollback':
      return 'Aggregate di-rollback utuh; tidak ada leg parsial.';
    default:
      return 'Deterministic fixture, tanpa rate real-time atau network.';
  }
}

export function CurrencyWireframe({ fixture: suppliedFixture, onBack }: CurrencyWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createCurrencyFixture());
  const fixture = suppliedFixture ?? fallbackFixture;
  const [view, setView] = useState<CurrencyView>('hub');
  const [notice, setNotice] = useState('');
  const [manualRate, setManualRate] = useState('112.3456');

  const renderHeader = (
    title: string,
    label = 'Back to currency hub',
    action = () => setView('hub'),
  ) => (
    <View style={styles.header}>
      <Button label={label} variant="tertiary" onPress={action} />
      <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
        {title}
      </Text>
      {reducedMotion ? (
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Reduced motion
        </Text>
      ) : null}
    </View>
  );

  const renderHub = () => (
    <>
      <View style={styles.header}>
        <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
          Multi-currency (fixture)
        </Text>
        {onBack ? <Button label="Back" variant="tertiary" onPress={onBack} /> : null}
      </View>
      <Card padding="space4" style={styles.card}>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          {stateLabel(fixture.initialResult.state)}
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          Base household: IDR · locale: id-ID
        </Text>
        <Button label="Edit currency settings" onPress={() => setView('settings')} />
        <Button label="View FX rate source" onPress={() => setView('rates')} />
        <Button label="Review report gaps" variant="secondary" onPress={() => setView('report')} />
        <Button
          label="Cross-currency transfer"
          variant="secondary"
          onPress={() => setView('cross')}
        />
      </Card>
      {notice ? (
        <Text
          accessibilityRole="alert"
          style={[tokens.typography.body, styles.notice, { color: tokens.colors.textPrimary }]}
        >
          {notice}
        </Text>
      ) : null}
    </>
  );

  const renderSettings = () => (
    <>
      {renderHeader('Currency settings (fixture)')}
      <Card padding="space4" style={styles.card}>
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          Base currency: IDR · display locale: id-ID
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Kas fixture: IDR · read-only karena memiliki activity.
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Akun JPY: JPY · read-only; migration flow deferred.
        </Text>
        <Button label="Review base currency" onPress={() => setView('settings-review')} />
      </Card>
    </>
  );

  const renderSettingsReview = () => (
    <>
      {renderHeader('Review base currency (fixture)', 'Back to currency settings', () =>
        setView('settings'),
      )}
      <Card padding="space4" style={styles.card}>
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          Perubahan preference akan menaikkan version dan recompute read-model.
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Original ledger tetap immutable; nilai historis tidak dikonversi permanen.
        </Text>
        <Button
          label="Confirm base currency"
          onPress={() => {
            const result = fixture.saveBaseCurrency(
              {
                baseCurrency: 'IDR',
                displayLocale: 'id-ID',
                accountCurrencies: [],
                expectedVersion: 1,
              },
              true,
            );
            setNotice(
              result.kind === 'synced'
                ? 'Base currency tersimpan; recompute fixture queued.'
                : result.message,
            );
          }}
        />
      </Card>
    </>
  );

  const renderRates = () => (
    <>
      {renderHeader('FX rate source (fixture)')}
      <Card padding="space4" style={styles.card}>
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          Reference/provider fixture: historical quote immutable.
        </Text>
        <Input label="Manual rate" value={manualRate} onChangeText={setManualRate} />
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Rate canonical decimal, positive, maksimal 10 desimal. Tidak ada klaim real-time.
        </Text>
        <Button
          label="Save manual rate"
          onPress={() => {
            const result = fixture.manualFallback({
              base: 'JPY',
              quote: 'IDR',
              rate: manualRate,
              effectiveAt: '2026-08-26T09:00:00.000Z',
              source: 'manual',
              actor: 'fixture-user',
              recordedAt: '2026-08-26T09:01:00.000Z',
            });
            setNotice(
              result.kind === 'ready'
                ? 'Rate manual tersimpan sebagai fixture.'
                : 'Rate manual invalid; draft dipertahankan.',
            );
          }}
        />
      </Card>
    </>
  );

  const renderReport = () => {
    const report = fixture.reportPreview();
    return (
      <>
        {renderHeader('Report rate gaps (fixture)')}
        <Card padding="space4" style={styles.card}>
          <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
            Dikonversi ke IDR menggunakan rate manual / tanggal fixture.
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Original expense: ¥1.000 · report IDR: {fixture.transactionPreview().reportAmountMinor}
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            {report.kind === 'partial'
              ? 'Incomplete/partial total; gap ditampilkan, bukan 1:1.'
              : 'Report lengkap fixture.'}
          </Text>
          <Button
            label="Retry rate lookup"
            onPress={() =>
              setNotice('Retry rate fixture selesai; draft dan provenance dipertahankan.')
            }
          />
          <Button
            label="Drill down original currency"
            variant="secondary"
            onPress={() =>
              setNotice('Drill-down JPY fixture menampilkan original amount dan provenance.')
            }
          />
        </Card>
      </>
    );
  };

  const renderCross = () => (
    <>
      {renderHeader('Cross-currency transfer (fixture)')}
      <Card padding="space4" style={styles.card}>
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          Source: JPY 1.000 → destination: IDR 1.123.456 fixture
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Rate 112.3456 · source manual · timestamp fixture
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Dua ledger legs tidak dipaksa zero-sum lintas currency; fee tetap expense terkait.
        </Text>
        <Button label="Review cross-currency transfer" onPress={() => setView('cross-review')} />
      </Card>
    </>
  );

  const renderCrossReview = () => (
    <>
      {renderHeader(
        'Review cross-currency transfer (fixture)',
        'Back to cross-currency draft',
        () => setView('cross'),
      )}
      <Card padding="space4" style={styles.card}>
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          Original amounts dan rate provenance dipertahankan.
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          JPY −1.000 · IDR +1.123.456 · transfer bukan income.
        </Text>
        <Button
          label="Confirm cross-currency transfer"
          onPress={() => {
            const result = fixture.commitCrossCurrencyTransfer(
              {
                sourceAccountId: 'account-jpy-fixture',
                destinationAccountId: 'account-idr-fixture',
                sourceAmountMinor: '1000',
                sourceCurrency: 'JPY',
                destinationAmountMinor: '11234560',
                destinationCurrency: 'IDR',
                rate: '112.3456',
                rateSource: 'manual',
                effectiveAt: '2026-08-26T09:00:00.000Z',
                clientMutationId: 'mutation-ui-fx-fixture',
              },
              true,
            );
            setNotice(
              result.kind === 'synced'
                ? 'Cross-currency transfer tersimpan atomik (fixture).'
                : result.kind === 'sync_pending'
                  ? 'Cross-currency transfer menunggu sinkronisasi.'
                  : result.kind === 'failed'
                    ? 'Aggregate di-rollback utuh.'
                    : 'Perlu review ulang.',
            );
          }}
        />
      </Card>
    </>
  );

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {view === 'hub' ? renderHub() : null}
      {view === 'settings' ? renderSettings() : null}
      {view === 'settings-review' ? renderSettingsReview() : null}
      {view === 'rates' ? renderRates() : null}
      {view === 'report' ? renderReport() : null}
      {view === 'cross' ? renderCross() : null}
      {view === 'cross-review' ? renderCrossReview() : null}
      {notice && view !== 'hub' ? (
        <Text
          accessibilityRole="alert"
          style={[tokens.typography.body, styles.notice, { color: tokens.colors.textPrimary }]}
        >
          {notice}
        </Text>
      ) : null}
      <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
        Minimum width 320dp
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    maxWidth: CURRENCY_LAYOUT.contentMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: { gap: 8 },
  card: { gap: 12 },
  notice: { paddingVertical: 8 },
});
