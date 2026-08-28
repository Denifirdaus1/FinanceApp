import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button, Card, Input } from '@financeapp/ui';

import { useTheme } from '../../app/providers/theme-provider';
import {
  TRANSACTION_LAYOUT,
  buildSignedLedgerLines,
  createTransactionsFixture,
  getNewTransactionDependencies,
  validateTransactionDraft,
  type TransactionDraft,
  type TransactionEntryType,
  type TransactionRecord,
  type TransactionsFixture,
  type TransactionsLoadResult,
  type TransactionsScenario,
} from './transactions-fixture';

type ViewMode = 'list' | 'quick_add' | 'editor' | 'review' | 'detail';

export interface TransactionsWireframeProps {
  fixture?: TransactionsFixture;
  initialMode?: 'list' | 'quick_add';
  onBack?: () => void;
  onOpenReceipt?: () => void;
  onOpenVoice?: () => void;
}

function createDraft(entryType: TransactionEntryType = 'expense'): TransactionDraft {
  return {
    id: 'draft-quick-add',
    entryType,
    amountMinor: '',
    currency: 'IDR',
    accountId: 'account-cash-fixture',
    categoryId: entryType === 'income' ? 'category-salary' : 'category-food',
    occurredAt: '2026-08-26T10:00:00.000Z',
    timezoneAtEntry: 'Asia/Jakarta',
    merchant: '',
    note: '',
    tagIds: [],
    expectedVersion: 1,
    clientMutationId: 'mutation-quick-add',
  };
}

function amountLabel(record: Pick<TransactionRecord, 'currency' | 'amountMinor'>): string {
  return `${record.currency} ${record.amountMinor}`;
}

function loadStatusLabel(result: TransactionsLoadResult): string {
  switch (result.kind) {
    case 'empty':
      return 'Data transaksi fixture kosong.';
    case 'offline':
      return 'Aplikasi offline (fixture). Data lokal dapat ditinjau.';
    case 'error':
      return 'Gagal memuat transaksi fixture.';
    default:
      return 'Data transaksi siap (fixture).';
  }
}

export function TransactionsWireframe({
  fixture: suppliedFixture,
  initialMode = 'list',
  onBack,
  onOpenReceipt,
  onOpenVoice,
}: TransactionsWireframeProps) {
  const { tokens, reducedMotion } = useTheme();
  const [fallbackFixture] = useState(() => createTransactionsFixture());
  const fixture = suppliedFixture ?? fallbackFixture;
  const [view, setView] = useState<ViewMode>(initialMode);
  const [loadResult, setLoadResult] = useState<TransactionsLoadResult>(() =>
    fixture.initialResult(),
  );
  const [draft, setDraft] = useState<TransactionDraft>(() => createDraft());
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedSnapshot, setSelectedSnapshot] = useState<TransactionRecord>();
  const [editingId, setEditingId] = useState<string>();
  const [draftError, setDraftError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [duplicatePending, setDuplicatePending] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [saving, setSaving] = useState(false);
  const activeDependencies = getNewTransactionDependencies();
  const selected = selectedSnapshot ?? (selectedId ? fixture.get(selectedId) : undefined);
  const presentation = fixture.presentation();

  const refresh = (
    result: TransactionsLoadResult = { kind: 'ready', transactions: fixture.snapshot() },
  ) => {
    setLoadResult(result);
  };

  const openQuickAdd = () => {
    setNotice(undefined);
    setDraftError(undefined);
    setDuplicatePending(false);
    setDraft(createDraft());
    setView('quick_add');
  };

  const chooseEntryType = (entryType: TransactionEntryType) => {
    setDraft(createDraft(entryType));
    setDraftError(undefined);
    setView('editor');
  };

  const goBackFromDraft = () => {
    setDraftError(undefined);
    if (onBack && initialMode === 'quick_add') onBack();
    else setView('list');
  };

  const validateAndReview = () => {
    setDraftError(undefined);
    const result = validateTransactionDraft({ ...draft, amountMinor: draft.amountMinor || '0' });
    if (!result.ok) {
      setDraftError(result.message);
      return;
    }
    setDraft(result.value);
    setView('review');
  };

  const saveDraft = async (confirmDuplicate = false) => {
    setSaving(true);
    const result = editingId
      ? await fixture.update(
          editingId,
          {
            merchant: draft.merchant,
            note: draft.note,
            categoryId: draft.categoryId,
            tagIds: draft.tagIds,
          },
          draft.expectedVersion,
          draft.clientMutationId,
        )
      : await fixture.save(draft, { confirmDuplicate });
    setSaving(false);
    if (result.kind === 'duplicate_warning') {
      setDuplicatePending(true);
      setNotice('Potensi duplikat ditemukan. Simpan tetap memerlukan konfirmasi kedua.');
      return;
    }
    if (result.kind === 'conflict') {
      setNotice('Konflik transaksi fixture: versi berubah, tidak ada overwrite diam-diam.');
      return;
    }
    if (result.kind === 'session_expired') {
      setNotice('Login diperlukan. Draft dipertahankan untuk dipulihkan setelah login.');
      return;
    }
    if (result.kind === 'failed' || result.kind === 'validation_error') {
      setNotice(result.message);
      return;
    }
    if (result.kind === 'not_found') {
      setNotice('Transaksi fixture tidak ditemukan; perubahan dibatalkan.');
      return;
    }
    setEditingId(undefined);
    setDuplicatePending(false);
    setNotice(
      result.kind === 'sync_pending' ? 'Menunggu sinkronisasi' : 'Transaksi tersimpan (fixture).',
    );
    refresh();
    setView('list');
  };

  const retryPending = async () => {
    const pending = fixture
      .snapshot()
      .find((item) => item.status === 'sync_pending' || item.status === 'failed');
    if (!pending) {
      setNotice('Tidak ada mutasi fixture yang perlu dicoba lagi.');
      return;
    }
    const result = await fixture.retry(pending.clientMutationId);
    setNotice(result.kind === 'synced' ? 'Tersinkron (fixture).' : 'Sinkronisasi belum berhasil.');
    refresh();
  };

  const applySuggestion = (decision: 'apply' | 'reject' | 'override') => {
    const suggestion = fixture.suggestions(draft)[0];
    if (!suggestion) {
      setNotice('Tidak ada saran untuk fixture ini.');
      return;
    }
    setDraft(fixture.applySuggestion(draft, suggestion, decision, 'category-food-child'));
    setNotice(
      decision === 'apply'
        ? 'Saran diterapkan ke draft; belum tersimpan.'
        : decision === 'reject'
          ? 'Saran ditolak; draft tetap dapat diedit.'
          : 'Kategori diubah ke pilihan manual; belum tersimpan.',
    );
  };

  const openDetail = (record: TransactionRecord) => {
    setSelectedId(record.id);
    setSelectedSnapshot(record);
    setConfirmVoid(false);
    setView('detail');
  };

  const editSelected = () => {
    if (!selected) return;
    setEditingId(selected.id);
    setDraft({ ...selected, tagIds: [...selected.tagIds] });
    setDraftError(undefined);
    setView('editor');
  };

  const duplicateSelected = async () => {
    if (!selected) return;
    const duplicate = await fixture.duplicateAsDraft(selected.id);
    if (!duplicate) {
      setNotice('Draft duplikat tidak tersedia.');
      return;
    }
    setEditingId(undefined);
    setDraft({ ...duplicate, tagIds: [...duplicate.tagIds] });
    setNotice('Draft baru dibuat dari transaksi fixture.');
    setView('editor');
  };

  const voidSelected = async () => {
    if (!selected) return;
    const result = await fixture.void(selected.id, selected.version, 'mutation-void-fixture');
    setConfirmVoid(false);
    if (result.kind === 'voided') {
      setNotice('Transaksi dibatalkan (tombstone).');
      refresh();
      setSelectedId(selected.id);
      setSelectedSnapshot(result.transaction);
    } else {
      setNotice('Konflik saat membatalkan transaksi fixture.');
    }
  };

  const restoreSelected = async () => {
    if (!selected) return;
    const result = await fixture.restore(selected.id, selected.version, 'mutation-restore-fixture');
    if (result.kind === 'restored') {
      setNotice('Transaksi dipulihkan (fixture).');
      refresh();
      setSelectedSnapshot(result.transaction);
    } else {
      setNotice(
        result.kind === 'restore_unavailable'
          ? `Pemulihan tidak tersedia: ${result.reason}.`
          : 'Pemulihan tidak tersedia karena konflik fixture.',
      );
    }
  };

  const renderHeader = (title: string, backAction?: () => void) => (
    <View style={styles.header}>
      {backAction ? <Button label="Kembali" variant="tertiary" onPress={backAction} /> : null}
      <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
        {title}
      </Text>
      {reducedMotion ? (
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Animasi dikurangi
        </Text>
      ) : null}
    </View>
  );

  const renderList = () => {
    const records = loadResult.transactions;
    const hasPending = records.some(
      (item) => item.status === 'sync_pending' || item.status === 'failed',
    );
    return (
      <>
        {renderHeader('Transaksi')}
        <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textSecondary }]}>
          {loadStatusLabel(loadResult)}
        </Text>
        {presentation.sessionExpired ? (
          <Card variant="muted" style={styles.card}>
            <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.danger }]}>
              Login diperlukan untuk melanjutkan.
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              Draft tetap dipertahankan dalam fixture dan tidak menjadi sesi asli.
            </Text>
            <Button
              label="Simpan draft untuk nanti"
              variant="secondary"
              onPress={() => setNotice(fixture.preserveDraft().message)}
              style={styles.action}
            />
          </Card>
        ) : null}
        {loadResult.kind === 'offline' ? (
          <Button
            label="Gunakan fixture lokal"
            variant="secondary"
            onPress={async () => refresh(await fixture.useLocalFixture())}
            style={styles.action}
          />
        ) : null}
        {loadResult.kind === 'error' ? (
          <Button
            label="Coba lagi"
            variant="secondary"
            onPress={async () => refresh(await fixture.load())}
            style={styles.action}
          />
        ) : null}
        {hasPending ? (
          <Card variant="muted" style={styles.card}>
            <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}>
              Menunggu sinkronisasi
            </Text>
            <Button
              label="Coba sinkronkan lagi"
              variant="secondary"
              onPress={retryPending}
              style={styles.action}
            />
          </Card>
        ) : null}
        {loadResult.kind === 'empty' ? (
          <Text
            style={[
              tokens.typography.bodyLarge,
              styles.empty,
              { color: tokens.colors.textSecondary },
            ]}
          >
            Belum ada transaksi.
          </Text>
        ) : null}
        {records.map((record) => (
          <Card
            key={record.id}
            variant={record.tombstone ? 'muted' : 'surface'}
            style={styles.card}
          >
            <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
              {record.merchant ?? 'Transaksi fixture'}
            </Text>
            <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}>
              {amountLabel(record)}
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              Status: {record.status}
            </Text>
            {record.tombstone ? (
              <Text style={[tokens.typography.body, { color: tokens.colors.danger }]}>
                Transaksi dibatalkan (tombstone).
              </Text>
            ) : null}
            <Button
              label={`Buka transaksi ${record.merchant ?? 'fixture'}`}
              variant="tertiary"
              onPress={() => openDetail(record)}
              style={styles.action}
            />
          </Card>
        ))}
        <Button
          label="Tambah transaksi"
          onPress={openQuickAdd}
          accessibilityLabel="Tambah transaksi"
          style={styles.action}
        />
        <Button
          label="Operasi transfer & saldo"
          variant="secondary"
          onPress={() => router.push('/transfers')}
          accessibilityLabel="Operasi transfer & saldo"
          style={styles.action}
        />
        <Button
          label="Cari, review & rekonsiliasi"
          variant="secondary"
          onPress={() => router.push('/transactions/review')}
          accessibilityLabel="Cari, review & rekonsiliasi"
          style={styles.action}
        />
      </>
    );
  };

  const renderQuickAdd = () => (
    <>
      {renderHeader('Tambah cepat', goBackFromDraft)}
      <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textSecondary }]}>
        Pilih jenis transaksi fixture.
      </Text>
      <Button
        label="Pengeluaran"
        onPress={() => chooseEntryType('expense')}
        style={styles.action}
      />
      <Button
        label="Pemasukan"
        variant="secondary"
        onPress={() => chooseEntryType('income')}
        style={styles.action}
      />
    </>
  );

  const renderEditor = () => {
    const account =
      activeDependencies.accounts.find((item) => item.id === draft.accountId) ??
      activeDependencies.accounts[0]!;
    const category =
      activeDependencies.categories.find((item) => item.id === draft.categoryId) ??
      activeDependencies.categories[0]!;
    return (
      <>
        {renderHeader(editingId ? 'Edit transaksi' : 'Buat transaksi', goBackFromDraft)}
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Field pertama fokus pada nominal. Draft belum mengubah saldo.
        </Text>
        <Input
          accessibilityLabel="Nominal"
          label="Nominal"
          value={draft.amountMinor}
          onChangeText={(amountMinor) => setDraft((current) => ({ ...current, amountMinor }))}
          keyboardType="number-pad"
          required
        />
        <Button
          label={`Akun: ${account.name}`}
          variant="secondary"
          onPress={() => {
            const next =
              activeDependencies.accounts.find((item) => item.id !== draft.accountId) ?? account;
            setDraft((current) => ({ ...current, accountId: next.id, currency: next.currency }));
            setNotice(`Akun fixture dipilih: ${next.name}.`);
          }}
          style={styles.action}
        />
        <Button
          label={`Kategori: ${category.name}`}
          variant="secondary"
          onPress={() => {
            const choices = activeDependencies.categories.filter(
              (item) => item.kind === draft.entryType,
            );
            const currentIndex = choices.findIndex((item) => item.id === draft.categoryId);
            const next = choices[(currentIndex + 1) % choices.length] ?? category;
            setDraft((current) => ({ ...current, categoryId: next.id }));
            setNotice(`Kategori fixture dipilih: ${next.name}.`);
          }}
          style={styles.action}
        />
        <Input
          label="Merchant / sumber"
          value={draft.merchant ?? ''}
          onChangeText={(merchant) => setDraft((current) => ({ ...current, merchant }))}
        />
        <Input
          label="Catatan"
          value={draft.note ?? ''}
          onChangeText={(note) => setDraft((current) => ({ ...current, note }))}
        />
        <Button
          label="Gunakan waktu fixture"
          variant="tertiary"
          onPress={() => {
            setDraft((current) => ({ ...current, occurredAt: '2026-08-26T10:00:00.000Z' }));
            setNotice('Waktu fixture diterapkan.');
          }}
          style={styles.action}
        />
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          Tanggal/waktu: {draft.occurredAt} · {draft.timezoneAtEntry}
        </Text>
        <Text
          style={[
            tokens.typography.bodyLarge,
            { color: tokens.colors.textPrimary, marginTop: tokens.spacing.space3 },
          ]}
        >
          Saran klasifikasi fixture
        </Text>
        <Button
          label="Terapkan saran kategori"
          variant="tertiary"
          onPress={() => applySuggestion('apply')}
          style={styles.action}
        />
        <Button
          label="Tolak saran"
          variant="tertiary"
          onPress={() => applySuggestion('reject')}
          style={styles.action}
        />
        <Button
          label="Ubah kategori ke Kopi"
          variant="tertiary"
          onPress={() => applySuggestion('override')}
          style={styles.action}
        />
        {draftError ? (
          <Text
            accessibilityRole="alert"
            style={[tokens.typography.body, { color: tokens.colors.danger }]}
          >
            {draftError}
          </Text>
        ) : null}
        {notice ? (
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            {notice}
          </Text>
        ) : null}
        {onOpenReceipt ? (
          <Button
            label="Scan receipt"
            variant="secondary"
            onPress={onOpenReceipt}
            style={styles.action}
          />
        ) : null}
        {onOpenVoice ? (
          <Button
            label="Input dengan suara"
            variant="secondary"
            onPress={onOpenVoice}
            style={styles.action}
          />
        ) : null}
        <Button label="Lanjut ke review" onPress={validateAndReview} style={styles.action} />
      </>
    );
  };

  const renderReview = () => {
    const lines =
      draft.amountMinor && /^\d+$/u.test(draft.amountMinor)
        ? buildSignedLedgerLines(draft)
        : undefined;
    return (
      <>
        {renderHeader('Review transaksi', () => setView('editor'))}
        <Card variant="raised" style={styles.card}>
          <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
            {draft.entryType === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
          </Text>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            {draft.currency} {draft.amountMinor}
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Akun: {draft.accountId} · Kategori: {draft.categoryId}
          </Text>
          {lines ? (
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              Account line: {lines.accountLine.signedAmountMinor}; category line: +
              {lines.categoryLine.amountMinor}. Draft belum memengaruhi saldo.
            </Text>
          ) : null}
        </Card>
        {notice ? (
          <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.danger }]}>
            {notice}
          </Text>
        ) : null}
        {duplicatePending ? (
          <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.warning }]}>
            Potensi duplikat: warning ini tidak memblokir, tetapi perlu konfirmasi kedua.
          </Text>
        ) : null}
        <Button
          label="Kembali ke editor"
          variant="secondary"
          onPress={() => setView('editor')}
          style={styles.action}
        />
        <Button
          label={
            duplicatePending
              ? 'Simpan tetap sebagai transaksi baru'
              : editingId
                ? 'Simpan perubahan'
                : 'Simpan transaksi'
          }
          loading={saving}
          onPress={() => saveDraft(duplicatePending)}
          style={styles.action}
        />
      </>
    );
  };

  const renderDetail = () => {
    if (!selected) return renderList();
    const lines = selected.accountLine;
    return (
      <>
        {renderHeader('Detail transaksi', () => setView('list'))}
        <Card variant={selected.tombstone ? 'muted' : 'surface'} style={styles.card}>
          <Text style={[tokens.typography.heading2, { color: tokens.colors.textPrimary }]}>
            {selected.merchant ?? 'Transaksi fixture'}
          </Text>
          <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
            {amountLabel(selected)}
          </Text>
          <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textSecondary }]}>
            Status: {selected.status}
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            Account line: {lines.signedAmountMinor} minor unit · expected version {selected.version}
          </Text>
          {selected.tombstone ? (
            <Text style={[tokens.typography.body, { color: tokens.colors.danger }]}>
              Tombstone void: histori tetap dapat ditinjau.
            </Text>
          ) : null}
        </Card>
        {notice ? (
          <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textSecondary }]}>
            {notice}
          </Text>
        ) : null}
        {!selected.tombstone ? (
          <Button label="Edit transaksi" onPress={editSelected} style={styles.action} />
        ) : null}
        <Button
          label="Duplikasi sebagai draft"
          variant="secondary"
          onPress={duplicateSelected}
          style={styles.action}
        />
        {!selected.tombstone ? (
          <Button
            label="Void transaksi"
            variant="destructive"
            onPress={() => setConfirmVoid(true)}
            style={styles.action}
          />
        ) : (
          <Button label="Pulihkan transaksi" onPress={restoreSelected} style={styles.action} />
        )}
        {confirmVoid ? (
          <Card variant="muted" style={styles.card}>
            <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.danger }]}>
              Konfirmasi void transaksi? Histori tetap ditandai tombstone.
            </Text>
            <Button
              label="Konfirmasi void"
              variant="destructive"
              onPress={voidSelected}
              style={styles.action}
            />
            <Button
              label="Batal void"
              variant="secondary"
              onPress={() => setConfirmVoid(false)}
              style={styles.action}
            />
          </Card>
        ) : null}
      </>
    );
  };

  return (
    <ScrollView
      accessibilityLabel="Daftar transaksi"
      testID="transactions-scroll"
      contentContainerStyle={[
        styles.container,
        { backgroundColor: tokens.colors.canvas, padding: tokens.spacing.space6 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        {view === 'list' ? renderList() : null}
        {view === 'quick_add' ? renderQuickAdd() : null}
        {view === 'editor' ? renderEditor() : null}
        {view === 'review' ? renderReview() : null}
        {view === 'detail' ? renderDetail() : null}
        {notice && view === 'list' ? (
          <Text
            accessibilityRole="summary"
            style={[
              tokens.typography.bodyLarge,
              { color: tokens.colors.primary, marginTop: tokens.spacing.space3 },
            ]}
          >
            {notice}
          </Text>
        ) : null}
        {view === 'list' && onBack ? (
          <Button label="Kembali" variant="tertiary" onPress={onBack} style={styles.action} />
        ) : null}
      </View>
    </ScrollView>
  );
}

export function createTransactionsScreenFixture(
  scenario?: TransactionsScenario,
): TransactionsFixture {
  return createTransactionsFixture(scenario);
}

const styles = StyleSheet.create({
  container: { flexGrow: 1 },
  content: { alignSelf: 'center', width: '100%', maxWidth: TRANSACTION_LAYOUT.contentMaxWidth },
  header: { gap: 8, marginBottom: 16 },
  card: { gap: 8, marginTop: 16, padding: 16 },
  action: { marginTop: 12, alignSelf: 'stretch' },
  empty: { marginTop: 24 },
});
