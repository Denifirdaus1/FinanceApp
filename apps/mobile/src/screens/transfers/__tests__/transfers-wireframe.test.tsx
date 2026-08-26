import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { TransfersWireframe } from '../transfers-wireframe';
import {
  ADJUSTMENT_REASONS,
  TRANSFER_LAYOUT,
  allocateSplitByPercentage,
  buildReversalLines,
  buildTransferLines,
  calculateAdjustmentDelta,
  createTransfersFixture,
  parseOperationAmountMinor,
  validateAdjustmentDraft,
  validateSplitDraft,
  validateTransferDraft,
  type AdjustmentDraft,
  type SplitDraft,
  type TransferDraft,
} from '../transfers-fixture';

function renderWireframe(scenario?: Parameters<typeof createTransfersFixture>[0]) {
  return render(
    <ThemeProvider reducedMotion>
      <TransfersWireframe fixture={createTransfersFixture(scenario)} />
    </ThemeProvider>,
  );
}

const transfer: TransferDraft = {
  sourceAccountId: 'account-cash-fixture',
  destinationAccountId: 'account-bank-fixture',
  amountMinor: '100000',
  currency: 'IDR',
  fee: { amountMinor: '0', payerAccountId: 'account-cash-fixture', categoryId: 'category-fee' },
  expectedVersion: 1,
  clientMutationId: 'mutation-transfer-fixture',
};

describe('U07 F06 transfers, splits, and balance adjustments wireframe', () => {
  it('connects F06 to /transfers and preserves the wireframe contract', () => {
    expect(ROUTE_MANIFEST.find((entry) => entry.featureId === 'F06')).toMatchObject({
      routeId: 'transfers',
      path: '/transfers',
      readiness: 'WIREFRAME READY',
    });
    expect(TRANSFER_LAYOUT).toMatchObject({ minimumWidth: 320, minimumTouchTarget: 48 });
  });

  it('rejects same, archived, and inaccessible transfer accounts', () => {
    expect(validateTransferDraft({ ...transfer, destinationAccountId: transfer.sourceAccountId })).toContain(
      'berbeda',
    );
    expect(
      validateTransferDraft({ ...transfer, destinationAccountId: 'account-archived-fixture' }),
    ).toContain('aktif');
    expect(
      validateTransferDraft({ ...transfer, destinationAccountId: 'account-inaccessible-fixture' }),
    ).toContain('diakses');
  });

  it('keeps transfer money integer-only, signed lines balanced, and fee separate', () => {
    expect(parseOperationAmountMinor('100000')).toBe(100000n);
    expect(parseOperationAmountMinor('1.5')).toBeNull();
    expect(parseOperationAmountMinor('9000000000000001')).toBeNull();
    const preview = buildTransferLines(transfer);
    expect(preview.accountLines.map((line) => line.signedAmountMinor)).toEqual(['-100000', '100000']);
    expect(preview.accountLines.reduce((sum, line) => sum + BigInt(line.signedAmountMinor), 0n)).toBe(0n);
    expect(preview.categoryLines).toHaveLength(0);
    expect(preview.feeEntry).toBeUndefined();
    expect(
      buildTransferLines({
        ...transfer,
        fee: { ...transfer.fee!, amountMinor: '2500' },
      }).feeEntry,
    ).toMatchObject({ relatedEntryId: 'transfer-fixture', entryType: 'expense' });
    expect(buildTransferLines({ ...transfer, destinationAccountId: 'account-loan-fixture' }).explanation).toContain(
      'pembayaran',
    );
  });

  it('validates split bounds, exact sum, duplicate categories, and largest remainder deterministically', () => {
    const base: SplitDraft = {
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
      clientMutationId: 'mutation-split-fixture',
    };
    expect(validateSplitDraft(base)).toEqual([]);
    expect(validateSplitDraft({ ...base, rows: [base.rows[0]] })).toContain('2');
    expect(validateSplitDraft({ ...base, rows: [...base.rows, ...base.rows, ...base.rows, ...base.rows, ...base.rows, ...base.rows, ...base.rows, ...base.rows, ...base.rows, ...base.rows, ...base.rows] })).toContain('20');
    expect(validateSplitDraft({ ...base, rows: [base.rows[0], { ...base.rows[1], percentageBps: 5000 }] })).toContain(
      '100%',
    );
    expect(validateSplitDraft({ ...base, rows: [base.rows[0], { ...base.rows[1], categoryId: base.rows[0].categoryId }] })).toContain(
      'digabung',
    );
    expect(allocateSplitByPercentage('10', [3333, 3333, 3334]).map((row) => row.amountMinor)).toEqual([
      '3',
      '3',
      '4',
    ]);
    expect(allocateSplitByPercentage('2', [5000, 5000]).every((row) => BigInt(row.amountMinor) >= 1n)).toBe(true);
  });

  it('validates adjustment delta, reason, note, and stale basis review', () => {
    expect(ADJUSTMENT_REASONS).toEqual(['cash_count', 'bank_reconciliation', 'opening_correction', 'other']);
    expect(calculateAdjustmentDelta('125000', '100000')).toBe('25000');
    expect(calculateAdjustmentDelta('100000', '125000')).toBe('-25000');
    const adjustment: AdjustmentDraft = {
      accountId: 'account-cash-fixture',
      targetBalanceMinor: '125000',
      basisBalanceMinor: '100000',
      basisVersion: 1,
      reason: 'other',
      note: 'Hitung kas fixture',
      expectedVersion: 1,
      clientMutationId: 'mutation-adjustment-fixture',
    };
    expect(validateAdjustmentDraft(adjustment)).toEqual([]);
    expect(validateAdjustmentDraft({ ...adjustment, targetBalanceMinor: '100000' })).toContain('nol');
    expect(validateAdjustmentDraft({ ...adjustment, note: '' })).toContain('catatan');
    expect(createTransfersFixture('conflict').adjust(adjustment)).toMatchObject({ kind: 'needs_re_review' });
  });

  it('preserves original entry and rejects a second reversal', () => {
    const fixture = createTransfersFixture('ready');
    const original = fixture.history[0];
    expect(buildReversalLines(original).map((line) => line.signedAmountMinor)).toEqual(['100000', '-100000']);
    expect(fixture.reverse(original.id, original.version, 'mutation-reversal-fixture')).toMatchObject({ kind: 'reversed' });
    expect(fixture.reverse(original.id, original.version, 'mutation-reversal-again')).toMatchObject({ kind: 'already_reversed' });
    expect(fixture.history.some((item) => item.id === original.id)).toBe(true);
  });

  it('keeps offline aggregate atomic and retries with the same mutation id', () => {
    const fixture = createTransfersFixture('offline');
    const first = fixture.commitTransfer(transfer, true);
    expect(first).toMatchObject({ kind: 'sync_pending', mutationId: transfer.clientMutationId, atomic: true });
    expect(fixture.retry(transfer.clientMutationId)).toMatchObject({
      kind: 'sync_pending',
      mutationId: transfer.clientMutationId,
    });
    const failed = createTransfersFixture('rollback').commitTransfer(transfer, true);
    expect(failed).toMatchObject({ kind: 'failed', atomic: true, rolledBack: true });
  });

  it('renders the operations hub and every primary action has a visible result', async () => {
    renderWireframe();
    expect(screen.getByText('Transfer, split & penyesuaian')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Transfer' }));
    expect(screen.getByText('Composer transfer (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke operasi' }));
    fireEvent.press(screen.getByRole('button', { name: 'Split transaksi' }));
    expect(screen.getByText('Editor split (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke operasi' }));
    fireEvent.press(screen.getByRole('button', { name: 'Penyesuaian saldo' }));
    expect(screen.getByText('Penyesuaian saldo (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke operasi' }));
    fireEvent.press(screen.getByRole('button', { name: 'Riwayat koreksi' }));
    expect(await screen.findByText('Riwayat operasi (read-only fixture)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Kembali ke operasi' })).toBeTruthy();
  });

  it('supports review before confirm and 320dp/accessibility copy', async () => {
    renderWireframe();
    fireEvent.press(screen.getByRole('button', { name: 'Transfer' }));
    fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
    expect(await screen.findByText('Review transfer (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke composer' }));
    expect(screen.getByText('Composer transfer (fixture)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review transfer' })).toHaveProp('accessibilityRole', 'button');
    await waitFor(() => expect(screen.getByText('Lebar minimum 320dp')).toBeTruthy());
  });
});
