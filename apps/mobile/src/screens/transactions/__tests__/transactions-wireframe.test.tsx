import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import {
  DEFAULT_TRANSACTION_FIXTURES,
  MAX_AMOUNT_MINOR,
  TRANSACTION_LAYOUT,
  buildSignedLedgerLines,
  createTransactionsFixture,
  detectDuplicate,
  parseTransactionAmountMinor,
  validateTransactionDraft,
  type TransactionDraft,
  type TransactionsScenario,
} from '../transactions-fixture';
import { TransactionsWireframe } from '../transactions-wireframe';

function renderTransactions(scenario?: TransactionsScenario, options?: { reducedMotion?: boolean }) {
  return render(
    <ThemeProvider reducedMotion={options?.reducedMotion}>
      <TransactionsWireframe fixture={createTransactionsFixture(scenario)} />
    </ThemeProvider>,
  );
}

const baseDraft: TransactionDraft = {
  id: 'draft-fixture',
  entryType: 'expense',
  amountMinor: '125000',
  currency: 'IDR',
  accountId: 'account-cash-fixture',
  categoryId: 'category-food',
  occurredAt: '2026-08-26T10:00:00.000Z',
  timezoneAtEntry: 'Asia/Jakarta',
  merchant: 'Kedai Fixture',
  note: 'Makan siang fixture',
  tagIds: ['tag-cafe'],
  expectedVersion: 1,
  clientMutationId: 'mutation-fixture',
};

describe('U06 F05 manual transaction wireframe', () => {
  beforeEach(() => {
    defaultSessionAdapter.reset();
    defaultSessionAdapter.setSignedIn();
  });

  it('keeps the F05 route and deterministic layout contract', () => {
    expect(ROUTE_MANIFEST.find((entry) => entry.featureId === 'F05')).toMatchObject({
      routeId: 'transactions',
      path: '/transactions',
      navigationGroup: 'transactions',
      tab: 'transactions',
      readiness: 'WIREFRAME READY',
    });
    expect(TRANSACTION_LAYOUT).toMatchObject({ minimumWidth: 320, minimumTouchTarget: 48 });
    expect(new Set(DEFAULT_TRANSACTION_FIXTURES.map((item) => item.id)).size).toBe(
      DEFAULT_TRANSACTION_FIXTURES.length,
    );
  });

  it('enforces integer minor-unit boundaries without floating point', () => {
    expect(parseTransactionAmountMinor('125000')).toBe(125000n);
    expect(parseTransactionAmountMinor('1.25')).toBeNull();
    expect(parseTransactionAmountMinor('0')).toBeNull();
    expect(parseTransactionAmountMinor(MAX_AMOUNT_MINOR)).toBe(9000000000000000n);
    expect(parseTransactionAmountMinor('9000000000000001')).toBeNull();
    expect(parseTransactionAmountMinor('1e3')).toBeNull();
  });

  it('validates required fields and archived dependencies for new drafts', () => {
    expect(validateTransactionDraft(baseDraft).ok).toBe(true);
    expect(validateTransactionDraft({ ...baseDraft, amountMinor: '0' }).message).toMatch(
      /nominal|amount/i,
    );
    expect(validateTransactionDraft({ ...baseDraft, entryType: 'transfer' as never }).ok).toBe(false);
    expect(validateTransactionDraft({ ...baseDraft, accountId: 'account-archived-fixture' }).message).toMatch(
      /arsip|tersedia|akun/i,
    );
    expect(validateTransactionDraft({ ...baseDraft, tagIds: Array.from({ length: 11 }, (_, i) => `tag-${i}`) }).ok).toBe(
      false,
    );
  });

  it('creates one signed account line and one positive category line, while drafts do not affect balance', () => {
    const expense = buildSignedLedgerLines(baseDraft);
    const income = buildSignedLedgerLines({ ...baseDraft, entryType: 'income' });
    expect(expense.accountLine).toMatchObject({ lineType: 'account', signedAmountMinor: '-125000' });
    expect(expense.categoryLine).toMatchObject({ lineType: 'category', amountMinor: '125000' });
    expect(income.accountLine.signedAmountMinor).toBe('125000');
    expect(income.categoryLine.amountMinor).toBe('125000');
    expect(createTransactionsFixture().balanceMinor()).toBe('0');
  });

  it('detects duplicate candidates within ten minutes and uses normalized merchant when present', () => {
    const existing = { ...baseDraft, id: 'posted-fixture', occurredAt: '2026-08-26T10:09:00.000Z' };
    expect(detectDuplicate([existing], baseDraft)).toMatchObject({ warning: true, duplicateId: 'posted-fixture' });
    expect(
      detectDuplicate(
        [{ ...existing, merchant: 'Other Fixture' }],
        baseDraft,
      ).warning,
    ).toBe(false);
    expect(
      detectDuplicate([{ ...existing, occurredAt: '2026-08-26T10:11:00.000Z' }], baseDraft).warning,
    ).toBe(false);
  });

  it('supports suggestions as a draft-only apply, reject, and override decision', () => {
    const fixture = createTransactionsFixture();
    const suggestion = fixture.suggestions(baseDraft)[0];
    expect(suggestion).toMatchObject({ categoryId: 'category-food' });
    expect(fixture.applySuggestion(baseDraft, suggestion!, 'apply').categoryId).toBe('category-food');
    expect(fixture.applySuggestion(baseDraft, suggestion!, 'reject').categoryId).toBe(baseDraft.categoryId);
    expect(fixture.applySuggestion(baseDraft, suggestion!, 'override', 'category-food-child').categoryId).toBe(
      'category-food-child',
    );
    expect(fixture.snapshot().some((item) => item.categoryId === 'category-food-child')).toBe(false);
  });

  it('keeps the same mutation id across offline retry and becomes synced without duplicates', async () => {
    const fixture = createTransactionsFixture({ save: 'offline' });
    const pending = await fixture.save(baseDraft, { confirmDuplicate: true });
    expect(pending.kind).toBe('sync_pending');
    if (pending.kind !== 'sync_pending') return;
    const retried = await fixture.retry(pending.mutationId);
    expect(retried.kind).toBe('synced');
    expect(retried.mutationId).toBe(pending.mutationId);
    expect(fixture.snapshot()).toHaveLength(1);
  });

  it('requires expected version for edit, supports duplicate-as-new-draft, and protects void/restore retention', async () => {
    const fixture = createTransactionsFixture();
    const posted = DEFAULT_TRANSACTION_FIXTURES[0]!;
    const conflict = await fixture.update(posted.id, { note: 'updated fixture' }, 0, 'mutation-edit');
    expect(conflict.kind).toBe('conflict');
    const duplicate = await fixture.duplicateAsDraft(posted.id);
    expect(duplicate?.id).not.toBe(posted.id);
    expect(duplicate?.status).toBe('draft');
    const voided = await fixture.void(posted.id, posted.version, 'mutation-void');
    expect(voided.kind).toBe('voided');
    const restored = await fixture.restore(posted.id, voided.version, 'mutation-restore');
    expect(restored.kind).toBe('restored');
    const expired = createTransactionsFixture({ restore: 'expired' });
    const expiredResult = await expired.restore(DEFAULT_TRANSACTION_FIXTURES[0]!.id, 1, 'mutation-expired');
    expect(expiredResult.kind).toBe('restore_unavailable');
  });

  it('renders ready list, opens quick add, validates first field, preserves draft on review back, and saves', async () => {
    renderTransactions();
    expect(screen.getByText('Transaksi')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Tambah transaksi' }));
    expect(screen.getByText('Tambah cepat')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Pengeluaran' }));
    expect(screen.getByLabelText('Nominal')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Nominal'), '125000');
    fireEvent.press(screen.getByRole('button', { name: 'Lanjut ke review' }));
    expect(screen.getByText('Review transaksi')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke editor' }));
    expect(screen.getByDisplayValue('125000')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Lanjut ke review' }));
    fireEvent.press(screen.getByRole('button', { name: 'Simpan transaksi' }));
    await waitFor(() => expect(screen.getByText(/Transaksi tersimpan|Menunggu sinkronisasi/)).toBeTruthy());
  });

  it('shows duplicate warning with a second confirmation and exposes pending retry action', async () => {
    renderTransactions('duplicate');
    fireEvent.press(screen.getByRole('button', { name: 'Tambah transaksi' }));
    fireEvent.press(screen.getByRole('button', { name: 'Pengeluaran' }));
    fireEvent.changeText(screen.getByLabelText('Nominal'), '125000');
    fireEvent.press(screen.getByRole('button', { name: 'Lanjut ke review' }));
    fireEvent.press(screen.getByRole('button', { name: 'Simpan transaksi' }));
    expect(screen.getByText(/Potensi duplikat/i)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Simpan tetap sebagai transaksi baru' }));
    await waitFor(() => expect(screen.getByText(/Transaksi tersimpan|Menunggu sinkronisasi/)).toBeTruthy());

    renderTransactions('sync_pending');
    expect(screen.getByText('Menunggu sinkronisasi')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Coba sinkronkan lagi' }));
    expect(screen.getByText(/Tersinkron|sinkronisasi/i)).toBeTruthy();
  });

  it('renders empty, offline, error recovery, tombstone, and session-expired states with working actions', async () => {
    const { unmount } = renderTransactions('empty');
    expect(screen.getByText(/Belum ada transaksi/i)).toBeTruthy();
    unmount();
    renderTransactions('offline');
    expect(screen.getByText(/offline/i)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Gunakan fixture lokal' }));
    expect(screen.getByText('Transaksi')).toBeTruthy();
    renderTransactions('error');
    fireEvent.press(screen.getByRole('button', { name: 'Coba lagi' }));
    await waitFor(() => expect(screen.getByText('Transaksi')).toBeTruthy());
    renderTransactions('voided');
    expect(screen.getByText(/dibatalkan|tombstone/i)).toBeTruthy();
    renderTransactions('session_expired');
    expect(screen.getByText(/login diperlukan/i)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Simpan draft untuk nanti' }));
    expect(screen.getByText(/draft dipertahankan/i)).toBeTruthy();
  });

  it('opens the app route and keeps sensitive transaction values out of route state', async () => {
    renderRouter({
      initialUrl: '/transactions',
      overrides: { '(app)': { signedIn: true } },
    });
    await waitFor(() => expect(screen.getByText('Transaksi')).toBeTruthy());
    expect(screen.getByText('/transactions')).toBeFalsy();
  });

  it('honors accessibility, reduced motion, and no-dead-action layout contracts', () => {
    renderTransactions(undefined, { reducedMotion: true });
    expect(screen.getByLabelText('Daftar transaksi')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tambah transaksi' }).props.accessibilityState?.disabled).not.toBe(
      true,
    );
    expect(TRANSACTION_LAYOUT.minimumWidth).toBe(320);
    expect(TRANSACTION_LAYOUT.minimumTouchTarget).toBeGreaterThanOrEqual(48);
  });
});
