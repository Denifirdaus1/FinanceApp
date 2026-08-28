import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import {
  REVIEW_LAYOUT,
  createSearchReviewFixture,
  calculateReconciliation,
  normalizeSearchText,
  type ReconciliationEntry,
  type SearchFilters,
} from '../search-review-reconciliation-fixture';
import { SearchReviewReconciliationWireframe } from '../search-review-reconciliation-wireframe';

function renderWireframe(scenario?: Parameters<typeof createSearchReviewFixture>[0]) {
  return render(
    <ThemeProvider reducedMotion>
      <SearchReviewReconciliationWireframe fixture={createSearchReviewFixture(scenario)} />
    </ThemeProvider>,
  );
}

const eligibleEntries: ReconciliationEntry[] = [
  {
    lifecycle: 'posted',
    clearing: 'cleared',
    occurredAt: '2026-08-20T10:00:00.000Z',
    signedMinor: '-200000',
  },
  {
    lifecycle: 'posted',
    clearing: 'reconciled',
    occurredAt: '2026-08-22T10:00:00.000Z',
    signedMinor: '500000',
  },
  {
    lifecycle: 'draft',
    clearing: 'cleared',
    occurredAt: '2026-08-23T10:00:00.000Z',
    signedMinor: '900000',
  },
  {
    lifecycle: 'posted',
    clearing: 'pending',
    occurredAt: '2026-08-24T10:00:00.000Z',
    signedMinor: '700000',
  },
];

describe('U19 F16 search, review, and reconciliation wireframe', () => {
  it('connects F16 manifest, authenticated route, and Transactions entry', async () => {
    expect(ROUTE_MANIFEST.find((route) => route.featureId === 'F16')).toMatchObject({
      routeId: 'review',
      path: '/transactions/review',
      readiness: 'WIREFRAME READY',
    });
    defaultSessionAdapter.setSignedIn();
    renderRouter('app', { initialUrl: '/transactions/review' });
    expect(await routerScreen.findByText('Search, Review & Reconciliation (fixture)')).toBeTruthy();
  }, 15000);

  it('normalizes NFKC, diacritics, phrases, prefixes, and ranks deterministic local results', () => {
    expect(normalizeSearchText('  Kedai Crème  ')).toBe('kedai creme');
    const fixture = createSearchReviewFixture();
    const phrase = fixture.search('kedai creme');
    expect(phrase.results[0]).toMatchObject({ entityType: 'transaction', label: 'Kedai Crème' });
    expect(fixture.search('cre').results.length).toBeGreaterThan(0);
    expect(fixture.search('x').kind).toBe('invalid_query');
    expect(fixture.search('kedai', undefined, 'corrupt-cursor').kind).toBe('invalid_cursor');
  });

  it('applies structured allowlist filters, local coverage, and safe pagination', () => {
    const filters: SearchFilters = {
      entityTypes: ['transaction'],
      entryType: 'expense',
      lifecycle: 'posted',
      currency: 'IDR',
      accountId: 'account-cash-fixture',
      categoryId: 'category-food',
      tagId: 'tag-cafe',
    };
    const result = createSearchReviewFixture('partial').search('kedai', filters, undefined, 1);
    expect(result.kind).toBe('partial_coverage');
    expect(result.results).toHaveLength(1);
    expect(result.nextCursor).toBeDefined();
    expect(createSearchReviewFixture('no_result').search('kedai').kind).toBe('no_result');
    expect(createSearchReviewFixture('indexing').search('kedai').indexing).toBe(true);
  });

  it('evaluates every filter boundary without exposing a query payload', () => {
    const fixture = createSearchReviewFixture();
    const transactionOnly: SearchFilters = { entityTypes: ['transaction'] };
    const rejectedFilters: SearchFilters[] = [
      { entryType: 'income' },
      { lifecycle: 'draft' },
      { clearing: 'reconciled' },
      { currency: 'USD' },
      { accountId: 'account-other-fixture' },
      { categoryId: 'category-other-fixture' },
      { tagId: 'tag-other-fixture' },
      { source: 'voice' },
      { hasReceipt: false },
      { hasNote: false },
      { dateFrom: '2026-09-01T00:00:00.000Z' },
      { dateTo: '2026-08-01T00:00:00.000Z' },
      { minAmountMinor: '999999' },
      { maxAmountMinor: '1' },
    ];
    for (const filters of rejectedFilters) {
      const result = fixture.search('kedai', { ...transactionOnly, ...filters });
      expect(result.results.some((record) => record.id === 'transaction-fixture-1')).toBe(false);
    }
    expect(
      fixture.search('kedai', {
        ...transactionOnly,
        hasReceipt: true,
        hasNote: true,
        minAmountMinor: '1',
        maxAmountMinor: '999999',
      }).results.length,
    ).toBeGreaterThan(0);
    expect(fixture.search('fixture').results.length).toBeGreaterThan(0);
  });

  it('keeps saved searches user-only and handles source, race, offline, and unauthorized states', () => {
    const fixture = createSearchReviewFixture();
    expect(
      fixture.saveSearch({ name: 'Belanja rutin', query: 'kedai', filters: {} }),
    ).toMatchObject({ kind: 'saved_fixture' });
    expect(fixture.savedSearches()).toHaveLength(1);
    expect(
      createSearchReviewFixture('source_changed').resolveReview('review-ocr', 'confirm'),
    ).toMatchObject({ kind: 'needs_refresh' });
    expect(
      createSearchReviewFixture('pending_race').bulkResolvePreview(['review-ocr']),
    ).toMatchObject({ kind: 'blocked_race' });
    expect(
      createSearchReviewFixture('offline').resolveReview('review-ocr', 'dismiss'),
    ).toMatchObject({ kind: 'queued' });
    expect(
      createSearchReviewFixture('unauthorized').resolveReview('review-ocr', 'confirm'),
    ).toMatchObject({ kind: 'unauthorized' });
  });

  it('keeps review reasons explicit and never auto-merges possible duplicates', () => {
    const fixture = createSearchReviewFixture();
    const items = fixture.reviewItems();
    expect(items.map((item) => item.reason)).toEqual(
      expect.arrayContaining([
        'low_confidence_ocr',
        'possible_duplicate',
        'missing_category',
        'missing_fx',
        'stale_pending',
        'unmatched_recurring',
        'sync_conflict',
        'reconciliation_stale',
      ]),
    );
    expect(fixture.resolveReview('review-duplicate', 'merge')).toMatchObject({
      kind: 'review_required',
    });
    expect(fixture.bulkResolvePreview(['review-ocr', 'review-category'])).toMatchObject({
      kind: 'preview',
      allOrNothing: true,
    });
    expect(fixture.undoBulk('bulk-fixture')).toMatchObject({ kind: 'undone' });
  });

  it('calculates reconciliation from eligible signed account lines and explicit adjustment', () => {
    expect(
      calculateReconciliation({
        openingMinor: '1000000',
        statementClosingMinor: '1300000',
        cutoffAt: '2026-08-25T00:00:00.000Z',
        entries: eligibleEntries,
      }),
    ).toMatchObject({
      calculatedClosingMinor: '1300000',
      differenceMinor: '0',
      eligibleCount: 2,
      status: 'balanced',
    });
    expect(
      calculateReconciliation({
        openingMinor: '1000000',
        statementClosingMinor: '1310000',
        cutoffAt: '2026-08-25T00:00:00.000Z',
        entries: eligibleEntries,
      }),
    ).toMatchObject({
      differenceMinor: '10000',
      status: 'in_progress',
    });
    const fixture = createSearchReviewFixture();
    expect(
      fixture.reconciliation({
        openingMinor: '1000000',
        statementClosingMinor: '1300000',
        cutoffAt: '2026-08-25T00:00:00.000Z',
        entries: eligibleEntries,
      }),
    ).toMatchObject({ kind: 'balanced', excludedPending: 1, excludedDraft: 1 });
    expect(fixture.adjustmentPreview('10000')).toMatchObject({
      entryType: 'balance_adjustment',
      cashflowExcluded: true,
      signedMinor: '10000',
    });
  });

  it('keeps reconciliation state safe for stale, offline, and corrupt cursor recovery', () => {
    expect(
      createSearchReviewFixture('reconciliation_stale').reconciliation({
        openingMinor: '0',
        statementClosingMinor: '0',
        cutoffAt: '2026-08-25T00:00:00.000Z',
        entries: [],
      }),
    ).toMatchObject({ kind: 'stale' });
    expect(createSearchReviewFixture('offline').finalizeReconciliation()).toMatchObject({
      kind: 'offline_disabled',
    });
    expect(createSearchReviewFixture('corrupt_cursor').retry()).toMatchObject({
      kind: 'restarted',
    });
  });

  it.each([
    ['empty', /Belum ada data lokal/],
    ['no_result', /Tidak ada hasil/],
    ['partial', /Cakupan lokal sebagian/],
    ['indexing', /Indexing/],
    ['source_changed', /Sumber berubah/],
    ['pending_race', /Outbox race/],
    ['offline', /Offline/],
    ['unauthorized', /Tidak berwenang/],
    ['corrupt_cursor', /Cursor tidak valid/],
    ['reconciliation_stale', /Rekonsiliasi stale/],
  ] as const)('renders %s fixture state with accessible privacy control', (scenario, expected) => {
    renderWireframe(scenario);
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
    fireEvent.press(screen.getByRole('button', { name: 'Sembunyikan nominal' }));
    expect(screen.getByRole('button', { name: 'Nominal disembunyikan' })).toBeTruthy();
  });

  it('supports search, review, reconciliation, bulk preview, back, and safe drill-down actions', () => {
    renderWireframe();
    fireEvent.changeText(screen.getByLabelText('Cari lokal'), 'kedai');
    fireEvent.press(screen.getByRole('button', { name: 'Cari fixture' }));
    expect(screen.getByText('Hasil lokal fixture')).toBeTruthy();
    for (const label of [
      'Tanggal',
      'Nominal',
      'Jenis',
      'Status',
      'Akun',
      'Kategori',
      'Tag',
      'Mata uang',
      'Sumber',
      'Struk',
      'Catatan',
    ]) {
      fireEvent.press(screen.getByRole('button', { name: `Filter ${label}` }));
    }
    fireEvent.press(screen.getByRole('button', { name: 'Review inbox' }));
    expect(screen.getByText('Review inbox (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Pratinjau bulk resolve' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Buka transaksi fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke search' }));
    fireEvent.press(screen.getByRole('button', { name: 'Rekonsiliasi' }));
    expect(screen.getByText('Rekonsiliasi akun (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Buat adjustment fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Finalisasi rekonsiliasi' }));
    fireEvent.press(screen.getByRole('button', { name: 'Buka transaksi fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Kembali ke search' }));
    fireEvent.press(screen.getByRole('button', { name: 'Simpan pencarian fixture' }));
    fireEvent.press(screen.getByRole('button', { name: 'Muat ulang fixture' }));
    expect(REVIEW_LAYOUT.minimumWidth).toBe(320);
    expect(REVIEW_LAYOUT.minimumTouchTarget).toBeGreaterThanOrEqual(48);
  });

  it('covers safe fixture action outcomes and recovery affordances', () => {
    const fixture = createSearchReviewFixture();
    expect(fixture.saveSearch({ name: ' ', query: 'x', filters: {} })).toMatchObject({
      kind: 'invalid',
    });
    expect(fixture.resolveReview('review-ocr', 'confirm')).toMatchObject({
      kind: 'resolved',
      undoAvailable: true,
    });
    expect(fixture.drillDown()).toMatchObject({ route: '/transactions', safe: true });

    renderWireframe('source_changed');
    for (const button of screen.getAllByRole('button', { name: 'Muat ulang fixture' }))
      fireEvent.press(button);
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);

    renderWireframe('corrupt_cursor');
    for (const button of screen.getAllByRole('button', { name: 'Muat ulang fixture' }))
      fireEvent.press(button);
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('does not use network or logging and keeps sensitive navigation static', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    renderWireframe('partial');
    fireEvent.press(screen.getByRole('button', { name: 'Muat ulang fixture' }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    logSpy.mockRestore();
  });
});
