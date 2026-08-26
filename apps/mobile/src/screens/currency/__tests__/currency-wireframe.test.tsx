import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { defaultSessionAdapter } from '../../../app/session/fake-session-adapter';
import { ROUTE_MANIFEST } from '../../../navigation/route-manifest';
import { CurrencyWireframe } from '../currency-wireframe';
import {
  CURRENCY_LAYOUT,
  CURRENCY_CATALOG,
  allocateRounding,
  convertMoney,
  createCurrencyFixture,
  parseCanonicalRate,
  validateBaseCurrencyDraft,
  validateFxQuote,
  type BaseCurrencyDraft,
  type CrossCurrencyTransferDraft,
  type FxQuote,
} from '../currency-fixture';

jest.setTimeout(15000);

function renderWireframe(scenario?: Parameters<typeof createCurrencyFixture>[0]) {
  return render(
    <ThemeProvider reducedMotion>
      <CurrencyWireframe fixture={createCurrencyFixture(scenario)} />
    </ThemeProvider>,
  );
}

const baseDraft: BaseCurrencyDraft = {
  baseCurrency: 'IDR',
  displayLocale: 'id-ID',
  accountCurrencies: [
    { accountId: 'account-cash-fixture', currency: 'IDR' },
    { accountId: 'account-jpy-fixture', currency: 'JPY' },
  ],
  expectedVersion: 1,
};

const quote: FxQuote = {
  base: 'JPY',
  quote: 'IDR',
  rate: '112.3456',
  effectiveAt: '2026-08-26T09:00:00.000Z',
  source: 'manual',
  actor: 'fixture-user',
  recordedAt: '2026-08-26T09:01:00.000Z',
};

const crossCurrencyDraft: CrossCurrencyTransferDraft = {
  sourceAccountId: 'account-jpy-fixture',
  destinationAccountId: 'account-idr-fixture',
  sourceAmountMinor: '1000',
  sourceCurrency: 'JPY',
  destinationAmountMinor: '112346',
  destinationCurrency: 'IDR',
  rate: '112.3456',
  rateSource: 'manual',
  effectiveAt: '2026-08-26T09:00:00.000Z',
  clientMutationId: 'mutation-fx-transfer-fixture',
};

describe('U08 F17 multi-currency wireframe', () => {
  it('connects F17 to the typed route manifest and Planning navigation', () => {
    expect(ROUTE_MANIFEST.find((entry) => entry.featureId === 'F17')).toMatchObject({
      routeId: 'currency',
      path: '/planning/currency',
      navigationGroup: 'planning',
      tab: 'planning',
      title: 'Multi-currency',
      readiness: 'WIREFRAME READY',
    });
    expect(CURRENCY_LAYOUT).toMatchObject({ minimumWidth: 320, minimumTouchTarget: 48 });
  });

  it('exposes exponent 0/2/3 metadata and rejects unsupported currencies', () => {
    expect(CURRENCY_CATALOG).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'JPY', exponent: 0 }),
      expect.objectContaining({ code: 'IDR', exponent: 2 }),
      expect.objectContaining({ exponent: 3 }),
    ]));
    expect(createCurrencyFixture().metadata('KWD')).toMatchObject({ code: 'KWD', exponent: 3 });
    expect(createCurrencyFixture().metadata('XXX')).toBeNull();
  });

  it('keeps account currency with activity read-only and validates versioned base preference', () => {
    expect(validateBaseCurrencyDraft(baseDraft)).toEqual([]);
    expect(validateBaseCurrencyDraft({ ...baseDraft, baseCurrency: 'XXX' })).toContain('didukung');
    expect(createCurrencyFixture('conflict').saveBaseCurrency(baseDraft, true)).toMatchObject({ kind: 'needs_re_review' });
    expect(createCurrencyFixture().accountCurrency('account-jpy-fixture')).toMatchObject({ currency: 'JPY', readOnly: true });
    expect(createCurrencyFixture().accountCurrency('account-cash-fixture')).toMatchObject({ currency: 'IDR', readOnly: false });
  });

  it('validates canonical positive rates, precision, timestamp, source, and immutable history', () => {
    expect(parseCanonicalRate('112.3456')).toBe('112.3456');
    expect(parseCanonicalRate('112.3456789012')).toBeNull();
    expect(parseCanonicalRate('1.0')).toBeNull();
    expect(parseCanonicalRate('0')).toBeNull();
    expect(parseCanonicalRate('-1')).toBeNull();
    expect(validateFxQuote(quote)).toEqual([]);
    expect(validateFxQuote({ ...quote, effectiveAt: '2099-01-01T00:00:00.000Z' })).toContain('masa depan');
    expect(validateFxQuote({ ...quote, source: 'provider', rate: '1.12345678901' })).toContain('10');
    const fixture = createCurrencyFixture();
    const old = fixture.historicalQuote;
    fixture.setReferenceRate({ ...quote, source: 'provider', rate: '120.0000' });
    expect(old.rate).toBe('112.3456');
    expect(fixture.historicalQuote.rate).toBe('112.3456');
    expect(fixture.latestQuote.rate).toBe('120.0000');
  });

  it('converts with bigint rational math, half-even ties, inverse direction, and rounding delta', () => {
    expect(convertMoney('1000', 'JPY', 'IDR', '112.3456')).toMatchObject({ amountMinor: '112346', roundingDeltaMinor: '0' });
    expect(convertMoney('5', 'JPY', 'IDR', '0.5')).toMatchObject({ amountMinor: '2' });
    expect(convertMoney('7', 'JPY', 'IDR', '0.5')).toMatchObject({ amountMinor: '4' });
    expect(convertMoney('9000000000000000', 'JPY', 'IDR', '112.3456').amountMinor).toBeTruthy();
    expect(convertMoney('100', 'IDR', 'JPY', '2')).toMatchObject({ amountMinor: '50' });
    expect(allocateRounding(['33', '33', '33'], '100')).toMatchObject({ amounts: ['33', '33', '34'], roundingDeltaMinor: '1' });
    expect(allocateRounding(['40', '60'], '100')).toMatchObject({ amounts: ['40', '60'], roundingDeltaMinor: '0' });
  });

  it('keeps original amount and report amount separate and refuses 1:1 missing-rate fallback', () => {
    const fixture = createCurrencyFixture('missing_rate');
    expect(fixture.reportPreview()).toMatchObject({ kind: 'partial', incomplete: true, usedOneToOne: false });
    expect(fixture.reportPreview().gaps).toContain('JPY/IDR');
    expect(fixture.manualFallback(quote)).toMatchObject({ kind: 'ready', draftRetained: true, source: 'manual' });
    expect(fixture.transactionPreview()).toMatchObject({ originalAmountMinor: '1000', originalCurrency: 'JPY', reportCurrency: 'IDR', rateSource: 'manual' });
    expect(createCurrencyFixture('stale_rate').reportPreview()).toMatchObject({ kind: 'partial', stale: true });
    expect(createCurrencyFixture('offline').reportPreview()).toMatchObject({ kind: 'partial', offline: true });
  });

  it('creates atomic cross-currency legs, separate fee, idempotent retry, and rollback', () => {
    const preview = createCurrencyFixture().previewCrossCurrencyTransfer(crossCurrencyDraft);
    expect(preview.legs).toEqual([
      expect.objectContaining({ currency: 'JPY', signedAmountMinor: '-1000' }),
      expect.objectContaining({ currency: 'IDR', signedAmountMinor: '112346' }),
    ]);
    expect(preview.crossCurrencySignedSum).toBe('not_applicable');
    expect(preview.isIncome).toBe(false);
    const withFee = createCurrencyFixture().previewCrossCurrencyTransfer({ ...crossCurrencyDraft, fee: { amountMinor: '250', categoryId: 'category-fee' } });
    expect(withFee.fee).toMatchObject({ entryType: 'expense', relatedTransfer: true });
    const fixture = createCurrencyFixture('offline');
    const first = fixture.commitCrossCurrencyTransfer(crossCurrencyDraft, true);
    expect(first).toMatchObject({ kind: 'sync_pending', atomic: true, mutationId: crossCurrencyDraft.clientMutationId });
    expect(fixture.retry(crossCurrencyDraft.clientMutationId)).toEqual(first);
    expect(createCurrencyFixture('rollback').commitCrossCurrencyTransfer(crossCurrencyDraft, true)).toMatchObject({ kind: 'failed', atomic: true, rolledBack: true, partialLegs: false });
  });

  it('renders settings, rate gaps, review, and every primary action with visible output', async () => {
    renderWireframe();
    expect(screen.getByText('Multi-currency (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Edit currency settings' }));
    expect(screen.getByText('Currency settings (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Review base currency' }));
    expect(screen.getByText('Review base currency (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Confirm base currency' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back to currency hub' }));
    fireEvent.press(screen.getByRole('button', { name: 'View FX rate source' }));
    expect(screen.getByText('FX rate source (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Save manual rate' }));
    expect(screen.getByText(/manual/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back to currency hub' }));
    fireEvent.press(screen.getByRole('button', { name: 'Review report gaps' }));
    expect(screen.getByText('Report rate gaps (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Retry rate lookup' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('supports cross-currency review, back preservation, accessibility, and narrow layout', async () => {
    renderWireframe();
    fireEvent.press(screen.getByRole('button', { name: 'Cross-currency transfer' }));
    expect(screen.getByText('Cross-currency transfer (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Review cross-currency transfer' }));
    expect(await screen.findByText('Review cross-currency transfer (fixture)')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back to cross-currency draft' }));
    expect(screen.getByText('Cross-currency transfer (fixture)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review cross-currency transfer' })).toHaveProp('accessibilityRole', 'button');
    await waitFor(() => expect(screen.getByText('Minimum width 320dp')).toBeTruthy());
  });

  it('navigates from Planning into F17 without bypassing the existing app guard', async () => {
    defaultSessionAdapter.setSignedIn();
    renderRouter('app', { initialUrl: '/planning' });
    fireEvent.press(await routerScreen.findByRole('button', { name: 'Open multi-currency' }));
    expect(await routerScreen.findByText('Multi-currency (fixture)')).toBeTruthy();
  });

  it('renders kill-switch read-only and unsupported/permission states without network or logging', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    for (const scenario of ['loading', 'empty', 'unsupported_currency', 'permission_denied', 'kill_switch', 'read_only'] as const) {
      const rendered = renderWireframe(scenario);
      expect(screen.getByText(/fixture|Multi-currency/)).toBeTruthy();
      rendered.unmount();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    logSpy.mockRestore();
  });
});
