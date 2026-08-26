import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
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

jest.setTimeout(15000);

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
    expect(
      validateTransferDraft({ ...transfer, destinationAccountId: transfer.sourceAccountId }).some(
        (error) => error.includes('berbeda'),
      ),
    ).toBe(true);
    expect(
      validateTransferDraft({ ...transfer, destinationAccountId: 'account-archived-fixture' }),
    ).toEqual(expect.arrayContaining([expect.stringContaining('aktif')]));
    expect(
      validateTransferDraft({ ...transfer, destinationAccountId: 'account-inaccessible-fixture' }),
    ).toEqual(expect.arrayContaining([expect.stringContaining('diakses')]));
  });

  it('keeps transfer money integer-only, signed lines balanced, and fee separate', () => {
    expect(parseOperationAmountMinor('100000')).toBe(100000n);
    expect(parseOperationAmountMinor('1.5')).toBeNull();
    expect(parseOperationAmountMinor('9000000000000001')).toBeNull();
    const preview = buildTransferLines(transfer);
    expect(preview.accountLines.map((line) => line.signedAmountMinor)).toEqual([
      '-100000',
      '100000',
    ]);
    expect(
      preview.accountLines.reduce((sum, line) => sum + BigInt(line.signedAmountMinor), 0n),
    ).toBe(0n);
    expect(preview.categoryLines).toHaveLength(0);
    expect(preview.feeEntry).toBeUndefined();
    expect(
      buildTransferLines({
        ...transfer,
        fee: { ...transfer.fee!, amountMinor: '2500' },
      }).feeEntry,
    ).toMatchObject({ relatedEntryId: 'transfer-fixture', entryType: 'expense' });
    expect(
      buildTransferLines({ ...transfer, destinationAccountId: 'account-loan-fixture' }).explanation,
    ).toContain('pembayaran');
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
    expect(validateSplitDraft({ ...base, rows: [base.rows[0]!] })).toEqual(
      expect.arrayContaining([expect.stringContaining('2')]),
    );
    expect(
      validateSplitDraft({
        ...base,
        rows: [
          ...base.rows,
          ...base.rows,
          ...base.rows,
          ...base.rows,
          ...base.rows,
          ...base.rows,
          ...base.rows,
          ...base.rows,
          ...base.rows,
          ...base.rows,
          ...base.rows,
        ],
      }),
    ).toEqual(expect.arrayContaining([expect.stringContaining('20')]));
    expect(
      validateSplitDraft({
        ...base,
        rows: [base.rows[0]!, { ...base.rows[1]!, percentageBps: 5000 }],
      }),
    ).toEqual(expect.arrayContaining([expect.stringContaining('100%')]));
    expect(
      validateSplitDraft({
        ...base,
        rows: [base.rows[0]!, { ...base.rows[1]!, categoryId: base.rows[0]!.categoryId }],
      }),
    ).toEqual(expect.arrayContaining([expect.stringContaining('digabung')]));
    expect(
      allocateSplitByPercentage('10', [3333, 3333, 3334]).map((row) => row.amountMinor),
    ).toEqual(['3', '3', '4']);
    expect(
      allocateSplitByPercentage('2', [5000, 5000]).every((row) => BigInt(row.amountMinor) >= 1n),
    ).toBe(true);
  });

  it('validates adjustment delta, reason, note, and stale basis review', () => {
    expect(ADJUSTMENT_REASONS).toEqual([
      'cash_count',
      'bank_reconciliation',
      'opening_correction',
      'other',
    ]);
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
    expect(validateAdjustmentDraft({ ...adjustment, targetBalanceMinor: '100000' })).toEqual(
      expect.arrayContaining([expect.stringContaining('nol')]),
    );
    expect(validateAdjustmentDraft({ ...adjustment, note: '' })).toEqual(
      expect.arrayContaining([expect.stringContaining('catatan')]),
    );
    expect(createTransfersFixture('conflict').adjust(adjustment)).toMatchObject({
      kind: 'needs_re_review',
    });
  });

  it('preserves original entry and rejects a second reversal', () => {
    const fixture = createTransfersFixture('ready');
    const original = fixture.history[0]!;
    expect(buildReversalLines(original).map((line) => line.signedAmountMinor)).toEqual([
      '100000',
      '-100000',
    ]);
    expect(
      fixture.reverse(original.id, original.version, 'mutation-reversal-fixture'),
    ).toMatchObject({ kind: 'reversed' });
    expect(fixture.reverse(original.id, original.version, 'mutation-reversal-again')).toMatchObject(
      { kind: 'already_reversed' },
    );
    expect(fixture.history.some((item) => item.id === original.id)).toBe(true);
  });

  it('keeps offline aggregate atomic and retries with the same mutation id', () => {
    const fixture = createTransfersFixture('offline');
    const first = fixture.commitTransfer(transfer, true);
    expect(first).toMatchObject({
      kind: 'sync_pending',
      mutationId: transfer.clientMutationId,
      atomic: true,
    });
    expect(fixture.retry(transfer.clientMutationId)).toMatchObject({
      kind: 'sync_pending',
      mutationId: transfer.clientMutationId,
    });
    const failed = createTransfersFixture('rollback').commitTransfer(transfer, true);
    expect(failed).toMatchObject({ kind: 'failed', atomic: true, rolledBack: true });
  });

  it('shows duplicate warning before the second confirmation and keeps invalid aggregates atomic', () => {
    const fixture = createTransfersFixture();
    expect(fixture.commitTransfer(transfer, false)).toMatchObject({ kind: 'needs_confirmation' });
    expect(fixture.commitTransfer({ ...transfer, amountMinor: '0' }, true)).toMatchObject({
      kind: 'failed',
      atomic: true,
      rolledBack: true,
    });
    expect(fixture.commitTransfer(transfer, true)).toMatchObject({ kind: 'synced', atomic: true });
    expect(fixture.commitTransfer(transfer, true)).toMatchObject({ kind: 'synced', atomic: true });
  });

  it('covers split amount/percentage edge validation and empty allocation', () => {
    expect(allocateSplitByPercentage('100', [])).toEqual([]);
    const amountDraft: SplitDraft = {
      sourceEntryId: 'transaction-fixture-1',
      entryType: 'expense',
      totalAmountMinor: '10',
      currency: 'IDR',
      allocationMode: 'amount',
      rows: [
        { categoryId: 'category-food', amountMinor: '4' },
        { categoryId: 'category-utilities', amountMinor: '6' },
      ],
      expectedVersion: 1,
      clientMutationId: 'mutation-split-amount',
    };
    expect(validateSplitDraft(amountDraft)).toEqual([]);
    expect(
      validateSplitDraft({
        ...amountDraft,
        rows: [{ ...amountDraft.rows[0]!, amountMinor: '0' }, amountDraft.rows[1]!],
      }),
    ).toEqual(expect.arrayContaining([expect.stringContaining('minimal')]));
    expect(validateSplitDraft({ ...amountDraft, entryType: 'transfer' as 'expense' })).toEqual(
      expect.arrayContaining([expect.stringContaining('expense')]),
    );
    expect(
      validateSplitDraft({
        ...amountDraft,
        rows: [
          { ...amountDraft.rows[0]!, amountMinor: '4' },
          { ...amountDraft.rows[1]!, amountMinor: '5' },
        ],
      }),
    ).toEqual(expect.arrayContaining([expect.stringContaining('persis')]));
    expect(
      validateSplitDraft({
        ...amountDraft,
        allocationMode: 'percentage',
        rows: [
          { categoryId: 'category-food', percentageBps: 0 },
          { categoryId: 'category-utilities', percentageBps: 10000 },
        ],
      }),
    ).toEqual(expect.arrayContaining([expect.stringContaining('positif')]));
  });

  it('covers stale, locked, and archived presentation outcomes', () => {
    const conflict = createTransfersFixture('conflict');
    expect(conflict.commitTransfer(transfer, true)).toMatchObject({ kind: 'needs_re_review' });
    expect(conflict.reverse('entry-transfer-fixture', 99, 'mutation-reversal-stale')).toMatchObject(
      { kind: 'needs_re_review' },
    );
    expect(
      createTransfersFixture('locked_period').reverse(
        'entry-transfer-fixture',
        1,
        'mutation-reversal-locked',
      ),
    ).toMatchObject({ kind: 'locked_period' });
    const presentation = createTransfersFixture().getPresentation();
    expect(presentation.accounts.every((account) => !account.archived && account.accessible)).toBe(
      true,
    );
    expect(presentation.categories.every((category) => !category.archived)).toBe(true);
    expect(
      validateAdjustmentDraft({
        accountId: 'account-cash-fixture',
        targetBalanceMinor: 'bad',
        basisBalanceMinor: '100',
        basisVersion: 1,
        reason: 'cash_count',
        note: '',
        expectedVersion: 1,
        clientMutationId: 'mutation-invalid-adjustment',
      }),
    ).toEqual(expect.arrayContaining([expect.stringContaining('non-negatif')]));
  });

  it('exposes deterministic loading, empty, sync, failed, locked, and permission states', () => {
    expect(createTransfersFixture('loading').initialResult.state).toBe('loading');
    expect(createTransfersFixture('empty').initialResult.history).toEqual([]);
    expect(createTransfersFixture('sync_pending').initialResult.state).toBe('sync_pending');
    expect(createTransfersFixture('failed').initialResult.state).toBe('failed');
    expect(createTransfersFixture('locked_period').initialResult.state).toBe('locked_period');
    expect(createTransfersFixture('permission_denied').initialResult.state).toBe(
      'permission_denied',
    );
    expect(createTransfersFixture('read_only').initialResult.message).toContain('fixture');
  });

  it('does not call production network or expose operation data through logging', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    createTransfersFixture('ready').commitTransfer(transfer, true);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    logSpy.mockRestore();
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
    expect(screen.getByRole('button', { name: 'Review transfer' })).toHaveProp(
      'accessibilityRole',
      'button',
    );
    await waitFor(() => expect(screen.getByText('Lebar minimum 320dp')).toBeTruthy());
  });

  it('renders required deterministic hub states and completes visible review actions', async () => {
    for (const scenario of [
      'offline',
      'empty',
      'error',
      'sync_pending',
      'failed',
      'conflict',
      'locked_period',
      'permission_denied',
      'archived_dependency',
      'rollback',
    ] as const) {
      const rendered = renderWireframe(scenario);
      expect(
        screen.getByText(/fixture|Offline|kosong|ditolak|terkunci|rollback|review|ditinjau|arsip/i),
      ).toBeTruthy();
      rendered.unmount();
    }
    renderWireframe();
    fireEvent.press(screen.getByRole('button', { name: 'Transfer' }));
    fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
    fireEvent.press(await screen.findByRole('button', { name: 'Konfirmasi transfer' }));
    expect(await screen.findByText(/Transfer tersimpan|Menunggu sinkronisasi/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke composer' }));
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke operasi' }));
    fireEvent.press(screen.getByRole('button', { name: 'Split transaksi' }));
    fireEvent.press(screen.getByRole('button', { name: 'Review split' }));
    expect(screen.getByText(/Review split siap/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Konfirmasi split' }));
    expect(screen.getByText(/aggregate fixture atomik/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke operasi' }));
    fireEvent.press(screen.getByRole('button', { name: 'Penyesuaian saldo' }));
    fireEvent.press(screen.getByRole('button', { name: 'Review penyesuaian' }));
    expect(screen.getByText(/Review penyesuaian siap/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Konfirmasi penyesuaian' }));
    expect(screen.getByText(/Penyesuaian direview/)).toBeTruthy();
  });

  it('navigates from Transactions to the F06 route without bypassing the app guard', async () => {
    defaultSessionAdapter.setSignedIn();
    renderRouter('app', { initialUrl: '/transactions' });
    fireEvent.press(await routerScreen.findByRole('button', { name: 'Operasi transfer & saldo' }));
    expect(await routerScreen.findByText('Transfer, split & penyesuaian')).toBeTruthy();
  });

  it('supports the route back callback and both reduced-motion render paths', () => {
    const onBack = jest.fn();
    render(
      <ThemeProvider>
        <TransfersWireframe onBack={onBack} />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Kembali' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders empty history and visible commit outcomes for offline, failed, conflict, and rollback fixtures', async () => {
    const empty = renderWireframe('empty');
    fireEvent.press(screen.getByRole('button', { name: 'Riwayat koreksi' }));
    expect(screen.getByText('Riwayat kosong (fixture).')).toBeTruthy();
    empty.unmount();

    for (const scenario of ['offline', 'failed', 'conflict', 'rollback'] as const) {
      const rendered = renderWireframe(scenario);
      fireEvent.press(screen.getByRole('button', { name: 'Transfer' }));
      fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
      fireEvent.press(screen.getByRole('button', { name: 'Konfirmasi transfer' }));
      expect(await screen.findByRole('alert')).toBeTruthy();
      rendered.unmount();
    }

    renderWireframe();
    fireEvent.press(screen.getByRole('button', { name: 'Penyesuaian saldo' }));
    fireEvent.changeText(screen.getByLabelText('Target balance minor unit'), '0');
    fireEvent.press(screen.getByRole('button', { name: 'Konfirmasi penyesuaian' }));
    expect(screen.getByText(/Delta nol/)).toBeTruthy();
  });
});
