import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '../../../app/providers/theme-provider';
import { CurrencyWireframe } from '../currency-wireframe';
import {
  CURRENCY_CATALOG,
  createMultiCurrencyFixture,
  convertMoney,
  roundHalfEven,
  type CrossCurrencyTransferDraft,
  type FxQuote,
} from '../currency-fixture';

const quote: FxQuote = {
  base: 'JPY',
  quote: 'IDR',
  rate: '112.3456',
  effectiveAt: '2026-08-26T09:00:00.000Z',
  source: 'manual',
  actor: 'fixture-user',
  recordedAt: '2026-08-26T09:01:00.000Z',
};

const transferDraft: CrossCurrencyTransferDraft = {
  sourceAccountId: 'account-jpy-fixture',
  destinationAccountId: 'account-idr-fixture',
  sourceAmountMinor: '1000',
  sourceCurrency: 'JPY',
  destinationAmountMinor: '11234560',
  destinationCurrency: 'IDR',
  rate: quote.rate,
  rateSource: quote.source,
  effectiveAt: quote.effectiveAt,
  clientMutationId: 'u20-transfer-fixture',
};

function renderWireframe() {
  return render(
    <ThemeProvider reducedMotion>
      <CurrencyWireframe fixture={createMultiCurrencyFixture()} />
    </ThemeProvider>,
  );
}

describe('U20 F17 multi-currency wireframe contracts', () => {
  it('exposes a typed metadata picker with ISO exponent 0, 2, and 3', () => {
    const fixture = createMultiCurrencyFixture();
    expect(fixture.currencyPicker()).toEqual(CURRENCY_CATALOG);
    expect(fixture.currencyMetadata('JPY')).toMatchObject({ exponent: 0, symbol: '¥' });
    expect(fixture.currencyMetadata('IDR')).toMatchObject({ exponent: 2 });
    expect(fixture.currencyMetadata('KWD')).toMatchObject({ exponent: 3 });
    expect(fixture.currencyMetadata('XXX')).toBeNull();
  });

  it('keeps active account currency immutable and versions base preference review', () => {
    const fixture = createMultiCurrencyFixture('conflict');
    expect(fixture.updateAccountCurrency('account-jpy-fixture', 'USD')).toMatchObject({
      kind: 'read_only_activity',
    });
    expect(fixture.updateAccountCurrency('account-cash-fixture', 'USD')).toMatchObject({
      kind: 'updated',
    });
    expect(
      fixture.saveBaseCurrency(
        {
          baseCurrency: 'IDR',
          displayLocale: 'id-ID',
          accountCurrencies: [],
          expectedVersion: 4,
        },
        false,
      ),
    ).toMatchObject({ kind: 'needs_confirmation' });
    expect(
      fixture.saveBaseCurrency(
        {
          baseCurrency: 'IDR',
          displayLocale: 'id-ID',
          accountCurrencies: [],
          expectedVersion: 4,
        },
        true,
      ),
    ).toMatchObject({ kind: 'needs_re_review' });
  });

  it('preserves rate provenance across import/export and historical quote changes', () => {
    const fixture = createMultiCurrencyFixture();
    expect(fixture.provenanceRoundTrip(quote)).toMatchObject({
      unchanged: true,
      restored: quote,
    });
    fixture.setReferenceRate({
      ...quote,
      source: 'provider',
      rate: '120.25',
      providerReference: 'provider-fixture',
    });
    expect(fixture.historicalQuote).toEqual(quote);
    expect(fixture.latestQuote.rate).toBe('120.25');
  });

  it('uses exact bigint conversion and half-even rounding for exponent matrix and large values', () => {
    expect(roundHalfEven(5n, 2n)).toBe(2n);
    expect(roundHalfEven(7n, 2n)).toBe(4n);
    expect(convertMoney('1000', 'JPY', 'IDR', quote.rate)).toMatchObject({
      amountMinor: '11234560',
      currency: 'IDR',
    });
    expect(convertMoney('9000000000000000', 'JPY', 'KWD', '0.001')).toMatchObject({
      currency: 'KWD',
    });
  });

  it('rejects unsafe transfer drafts and keeps valid cross-currency legs atomic', () => {
    const fixture = createMultiCurrencyFixture();
    expect(fixture.validateTransfer({ ...transferDraft, sourceCurrency: 'USD' })).toMatchObject({
      valid: false,
      reason: 'account_currency_mismatch',
    });
    expect(fixture.validateTransfer({ ...transferDraft, sourceAmountMinor: '0' })).toMatchObject({
      valid: false,
      reason: 'invalid_amount',
    });
    expect(fixture.validateTransfer({ ...transferDraft, rate: '1.12345678901' })).toMatchObject({
      valid: false,
      reason: 'invalid_rate',
    });
    expect(
      fixture.validateTransfer({ ...transferDraft, effectiveAt: '2099-01-01T00:00:00.000Z' }),
    ).toMatchObject({
      valid: false,
      reason: 'future_rate',
    });
    expect(
      fixture.previewCrossCurrencyTransfer({
        ...transferDraft,
        fee: { amountMinor: '0', categoryId: 'category-fee' },
      }).fee,
    ).toBeUndefined();
    expect(
      fixture.previewCrossCurrencyTransfer({
        ...transferDraft,
        fee: { amountMinor: '250', categoryId: 'category-fee' },
      }).fee,
    ).toMatchObject({
      entryType: 'expense',
      relatedTransfer: true,
    });
    const first = fixture.commitCrossCurrencyTransfer(transferDraft, true);
    expect(fixture.commitCrossCurrencyTransfer(transferDraft, true)).toEqual(first);
  });

  it('keeps missing/stale/offline report gaps honest and retains manual draft fallback', () => {
    expect(createMultiCurrencyFixture('missing_rate').reportPreview()).toMatchObject({
      incomplete: true,
      usedOneToOne: false,
      gaps: ['JPY/IDR'],
    });
    expect(createMultiCurrencyFixture('stale_rate').reportPreview()).toMatchObject({
      stale: true,
      usedOneToOne: false,
    });
    expect(createMultiCurrencyFixture('offline').manualFallback(quote)).toMatchObject({
      kind: 'ready',
      draftRetained: true,
    });
  });

  it('renders picker, original/converted provenance, privacy masking, and accessible recovery actions', () => {
    renderWireframe();
    fireEvent.press(screen.getByRole('button', { name: 'Edit currency settings' }));
    expect(screen.getByText('Currency metadata picker (fixture)')).toBeTruthy();
    expect(screen.getByText(/JPY.*Yen Jepang/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back to currency hub' }));
    fireEvent.press(screen.getByRole('button', { name: 'Review report gaps' }));
    expect(screen.getByText('Original transaction amount')).toBeTruthy();
    expect(screen.getByText(/Provenance/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Sembunyikan nominal' }));
    expect(screen.getByRole('button', { name: 'Nominal disembunyikan' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Retry rate lookup' }));
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
