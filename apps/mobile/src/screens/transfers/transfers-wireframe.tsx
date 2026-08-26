import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  TRANSFER_LAYOUT,
  allocateSplitByPercentage,
  calculateAdjustmentDelta,
  type AdjustmentDraft,
  createTransfersFixture,
  type OperationState,
  type SplitDraft,
  type TransferDraft,
  type TransfersFixture,
} from './transfers-fixture';

type TransfersView = 'hub' | 'transfer' | 'transfer-review' | 'split' | 'adjustment' | 'history';

export interface TransfersWireframeProps {
  fixture?: TransfersFixture;
  onBack?: () => void;
  onOpenCurrency?: () => void;
}

function stateLabel(state: OperationState): string {
  switch (state) {
    case 'offline':
      return 'Offline fixture: operasi dapat ditinjau dan menunggu sinkronisasi.';
    case 'loading':
      return 'Memuat operasi fixture…';
    case 'empty':
      return 'Belum ada riwayat operasi fixture.';
    case 'permission_denied':
      return 'Akses operasi ditolak pada fixture ini.';
    case 'archived_dependency':
      return 'Dependensi arsip hanya tampil di histori, bukan picker baru.';
    case 'aggregate_rollback':
      return 'Aggregate gagal dan di-rollback utuh; tidak ada perubahan parsial.';
    case 'sync_pending':
      return 'Menunggu sinkronisasi fixture; dampak optimistis ditandai pending.';
    case 'failed':
      return 'Operasi gagal pada fixture; retry aman dengan mutation ID yang sama.';
    case 'needs_re_review':
      return 'Perubahan basis terdeteksi; operasi perlu ditinjau ulang.';
    case 'locked_period':
      return 'Periode terkunci: gunakan reversal dan replacement.';
    default:
      return 'Fixture deterministic, tanpa jaringan atau penyimpanan.';
  }
}

export function TransfersWireframe({
  fixture: suppliedFixture,
  onBack,
  onOpenCurrency,
}: TransfersWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createTransfersFixture());
  const fixture = suppliedFixture ?? fallbackFixture;
  const [view, setView] = useState<TransfersView>('hub');
  const [notice, setNotice] = useState('');
  const [amount, setAmount] = useState('100000');
  const [adjustmentTarget, setAdjustmentTarget] = useState('125000');

  const transferDraft: TransferDraft = {
    sourceAccountId: 'account-cash-fixture',
    destinationAccountId: 'account-bank-fixture',
    amountMinor: amount,
    currency: 'IDR',
    fee: { amountMinor: '0', payerAccountId: 'account-cash-fixture', categoryId: 'category-fee' },
    expectedVersion: 1,
    clientMutationId: 'mutation-ui-transfer-fixture',
  };
  const splitDraft: SplitDraft = {
    sourceEntryId: 'transaction-fixture-1',
    entryType: 'expense',
    totalAmountMinor: '100',
    currency: 'IDR',
    allocationMode: 'percentage',
    rows: [
      { categoryId: 'category-food', percentageBps: 3333, memo: '' },
      { categoryId: 'category-utilities', percentageBps: 6667, memo: '' },
    ],
    expectedVersion: 1,
    clientMutationId: 'mutation-ui-split-fixture',
  };
  const adjustmentDraft: AdjustmentDraft = {
    accountId: 'account-cash-fixture',
    targetBalanceMinor: adjustmentTarget,
    basisBalanceMinor: '100000',
    basisVersion: 1,
    reason: 'cash_count',
    note: '',
    expectedVersion: 1,
    clientMutationId: 'mutation-ui-adjustment-fixture',
  };

  const renderHeader = (
    title: string,
    backLabel = 'Kembali ke operasi',
    backAction = () => setView('hub'),
  ) => (
    <View style={styles.header}>
      <Button label={backLabel} variant="tertiary" onPress={backAction} />
      <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
        {title}
      </Text>
      {reducedMotion ? (
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Animasi dikurangi
        </Text>
      ) : null}
    </View>
  );

  const commitTransfer = () => {
    const result = fixture.commitTransfer(transferDraft, true);
    setNotice(
      result.kind === 'synced'
        ? 'Transfer tersimpan (fixture).'
        : result.kind === 'sync_pending'
          ? 'Menunggu sinkronisasi (fixture).'
          : result.kind === 'failed'
            ? result.message
            : result.kind === 'needs_re_review'
              ? result.message
              : result.warning,
    );
  };

  const commitAdjustment = () => {
    const result = fixture.adjust(adjustmentDraft);
    setNotice(
      result.kind === 'synced'
        ? `Penyesuaian direview: delta ${result.deltaMinor} minor unit.`
        : result.message,
    );
  };

  const renderHub = () => (
    <>
      <View style={styles.header}>
        <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
          Transfer, split & penyesuaian
        </Text>
        {onBack ? <Button label="Kembali" variant="tertiary" onPress={onBack} /> : null}
      </View>
      <Card padding="space4" style={styles.card}>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          {stateLabel(fixture.initialResult.state)}
        </Text>
        <Button label="Transfer" onPress={() => setView('transfer')} />
        {onOpenCurrency ? (
          <Button label="Cross-currency transfer" variant="secondary" onPress={onOpenCurrency} />
        ) : null}
        <Button label="Split transaksi" onPress={() => setView('split')} />
        <Button label="Penyesuaian saldo" onPress={() => setView('adjustment')} />
        <Button label="Riwayat koreksi" variant="secondary" onPress={() => setView('history')} />
      </Card>
      <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
        Lebar minimum {TRANSFER_LAYOUT.minimumWidth}dp · target sentuh{' '}
        {TRANSFER_LAYOUT.minimumTouchTarget}dp
      </Text>
    </>
  );

  const renderTransfer = () => (
    <>
      {renderHeader('Composer transfer (fixture)')}
      <Card padding="space4" style={styles.card}>
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          Kas fixture → Bank fixture · IDR
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Akun arsip/terbatas tidak tersedia untuk operasi baru.
        </Text>
        <Input
          label="Nominal minor unit"
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
        />
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Preview: sumber −{amount || '0'} · tujuan +{amount || '0'} · jumlah signed 0
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Tidak ada category line. Fee nol tidak membuat entry fee.
        </Text>
        <Button label="Review transfer" onPress={() => setView('transfer-review')} />
      </Card>
    </>
  );

  const renderTransferReview = () => (
    <>
      {renderHeader('Review transfer (fixture)', 'Kembali ke composer', () => setView('transfer'))}
      <Card padding="space4" style={styles.card}>
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          Transfer IDR akan diproses sebagai aggregate atomik.
        </Text>
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Sumber −{amount}; tujuan +{amount}; signed sum = 0.
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Konfirmasi diperlukan sebelum fixture menghasilkan hasil.
        </Text>
        <Button label="Konfirmasi transfer" onPress={commitTransfer} />
        <Button label="Batalkan review" variant="tertiary" onPress={() => setView('transfer')} />
      </Card>
    </>
  );

  const renderSplit = () => {
    const allocation = allocateSplitByPercentage(splitDraft.totalAmountMinor, [3333, 6667]);
    return (
      <>
        {renderHeader('Editor split (fixture)')}
        <Card padding="space4" style={styles.card}>
          <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
            Expense transaction fixture · total 100 minor unit
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Makanan: {allocation[0]?.amountMinor} · Utilitas: {allocation[1]?.amountMinor}
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            Largest remainder bigint; total tepat dan tiap baris minimal 1.
          </Text>
          <Button
            label="Review split"
            onPress={() => setNotice('Review split siap; kategori masih berupa draft fixture.')}
          />
          <Button
            label="Konfirmasi split"
            onPress={() => setNotice('Split tersimpan sebagai aggregate fixture atomik.')}
          />
        </Card>
      </>
    );
  };

  const renderAdjustment = () => (
    <>
      {renderHeader('Penyesuaian saldo (fixture)')}
      <Card padding="space4" style={styles.card}>
        <Text style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}>
          Kas fixture · basis version 1
        </Text>
        <Input
          label="Target balance minor unit"
          value={adjustmentTarget}
          onChangeText={setAdjustmentTarget}
          keyboardType="number-pad"
        />
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Delta terlihat: {calculateAdjustmentDelta(adjustmentTarget, '100000')} minor unit
        </Text>
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Alasan fixture: cash_count. Delta nol ditolak; basis stale meminta review ulang.
        </Text>
        <Button
          label="Review penyesuaian"
          onPress={() => setNotice('Review penyesuaian siap; saldo sumber tidak dioverwrite.')}
        />
        <Button label="Konfirmasi penyesuaian" onPress={commitAdjustment} />
      </Card>
    </>
  );

  const renderHistory = () => (
    <>
      {renderHeader('Riwayat operasi (read-only fixture)')}
      <Card padding="space4" style={styles.card}>
        {fixture.initialResult.history.length === 0 ? (
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Riwayat kosong (fixture).
          </Text>
        ) : (
          fixture.initialResult.history.map((entry) => (
            <Text
              key={entry.id}
              style={[tokens.typography.body, { color: tokens.colors.textPrimary }]}
            >
              {entry.label}
              {entry.locked ? ' · Periode terkunci' : ''}
            </Text>
          ))
        )}
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
          Entry asli tetap terlihat; koreksi historis menggunakan reversal + replacement.
        </Text>
      </Card>
    </>
  );

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {view === 'hub' ? renderHub() : null}
      {view === 'transfer' ? renderTransfer() : null}
      {view === 'transfer-review' ? renderTransferReview() : null}
      {view === 'split' ? renderSplit() : null}
      {view === 'adjustment' ? renderAdjustment() : null}
      {view === 'history' ? renderHistory() : null}
      {notice ? (
        <Text
          accessibilityRole="alert"
          style={[tokens.typography.body, styles.notice, { color: tokens.colors.textPrimary }]}
        >
          {notice}
        </Text>
      ) : null}
      <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
        Lebar minimum 320dp
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    maxWidth: TRANSFER_LAYOUT.contentMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: { gap: 8 },
  card: { gap: 12 },
  notice: { paddingVertical: 8 },
});
