export const CURRENCY_LAYOUT = {
  minimumWidth: 320,
  minimumTouchTarget: 48,
  contentMaxWidth: 720,
} as const;

const FIXTURE_NOW = '2026-08-26T12:00:00.000Z';
const MAX_AMOUNT_MINOR = 9000000000000000n;
const MAX_RATE_DECIMALS = 10;

export interface CurrencyMetadata {
  code: string;
  exponent: 0 | 2 | 3;
  symbol: string;
  localizedName: string;
}

export const CURRENCY_CATALOG: readonly CurrencyMetadata[] = [
  { code: 'JPY', exponent: 0, symbol: '¥', localizedName: 'Yen Jepang' },
  { code: 'IDR', exponent: 2, symbol: 'Rp', localizedName: 'Rupiah Indonesia' },
  { code: 'KWD', exponent: 3, symbol: 'د.ك', localizedName: 'Dinar Kuwait' },
  { code: 'USD', exponent: 2, symbol: '$', localizedName: 'Dolar Amerika Serikat' },
];

const CURRENCY_CODES = new Set(CURRENCY_CATALOG.map((item) => item.code));
const SUPPORTED_LOCALES = new Set(['id-ID', 'en-US', 'ja-JP']);

export type CurrencyScenario =
  | 'ready'
  | 'loading'
  | 'empty'
  | 'offline'
  | 'missing_rate'
  | 'stale_rate'
  | 'unsupported_currency'
  | 'permission_denied'
  | 'kill_switch'
  | 'read_only'
  | 'conflict'
  | 'sync_pending'
  | 'failed'
  | 'rollback';

export type CurrencyState =
  | 'idle'
  | 'editing'
  | 'reviewing'
  | 'saving_local'
  | 'sync_pending'
  | 'synced'
  | 'failed'
  | 'needs_re_review'
  | 'loading'
  | 'empty'
  | 'offline'
  | 'missing_rate'
  | 'stale_rate'
  | 'unsupported_currency'
  | 'permission_denied'
  | 'read_only'
  | 'aggregate_rollback';

export interface AccountCurrencyDraft {
  accountId: string;
  currency: string;
}

export interface BaseCurrencyDraft {
  baseCurrency: string;
  displayLocale: string;
  accountCurrencies: AccountCurrencyDraft[];
  expectedVersion: number;
}

export interface FxQuote {
  base: string;
  quote: string;
  rate: string;
  effectiveAt: string;
  source: 'manual' | 'provider' | 'import';
  providerReference?: string;
  actor?: string;
  recordedAt?: string;
}

export interface CrossCurrencyTransferDraft {
  sourceAccountId: string;
  destinationAccountId: string;
  sourceAmountMinor: string;
  sourceCurrency: string;
  destinationAmountMinor: string;
  destinationCurrency: string;
  rate: string;
  rateSource: FxQuote['source'];
  effectiveAt: string;
  fee?: { amountMinor: string; categoryId: string };
  clientMutationId: string;
}

export interface CurrencyConversion {
  amountMinor: string;
  currency: string;
  roundingDeltaMinor: string;
}

export interface CrossCurrencyPreview {
  legs: { accountId: string; currency: string; signedAmountMinor: string }[];
  crossCurrencySignedSum: 'not_applicable';
  isIncome: false;
  fee?: { entryType: 'expense'; amountMinor: string; categoryId: string; relatedTransfer: true };
  rate: string;
  rateSource: FxQuote['source'];
  effectiveAt: string;
}

export type BaseCurrencySaveResult =
  | { kind: 'validation_error'; message: string }
  | { kind: 'needs_confirmation'; message: string }
  | { kind: 'needs_re_review'; message: string }
  | { kind: 'synced'; version: number; ledgerImmutable: true; recomputeQueued: true };

export type ManualFallbackResult =
  | { kind: 'ready'; draftRetained: true; source: 'manual' }
  | { kind: 'validation_error'; draftRetained: true };

export type CrossCurrencyCommitResult =
  | { kind: 'needs_confirmation'; draftRetained: true }
  | { kind: 'failed'; mutationId: string; atomic: true; rolledBack: true; partialLegs: false }
  | { kind: 'sync_pending'; mutationId: string; atomic: true; partialLegs: false }
  | { kind: 'needs_re_review'; message: string }
  | { kind: 'synced'; mutationId: string; atomic: true; partialLegs: false };

export type TransferValidationResult =
  | { valid: true; reason: 'valid' }
  | {
      valid: false;
      reason:
        | 'unsupported_currency'
        | 'account_currency_mismatch'
        | 'same_account'
        | 'invalid_amount'
        | 'invalid_rate'
        | 'future_rate';
    };

function metadataFor(code: string): CurrencyMetadata | null {
  return CURRENCY_CATALOG.find((item) => item.code === code) ?? null;
}

function parseMinor(input: string, allowZero = false): bigint | null {
  const normalized = input.trim();
  if (!new RegExp(allowZero ? '^\\d+$' : '^[1-9]\\d*$', 'u').test(normalized)) return null;
  try {
    const value = BigInt(normalized);
    return value <= MAX_AMOUNT_MINOR ? value : null;
  } catch {
    return null;
  }
}

export function parseCanonicalRate(input: string): string | null {
  const normalized = input.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.[0-9]*[1-9])?$/u.test(normalized)) return null;
  const decimals = normalized.includes('.') ? normalized.length - normalized.indexOf('.') - 1 : 0;
  if (decimals > MAX_RATE_DECIMALS) return null;
  try {
    const [whole = '0', fraction = ''] = normalized.split('.');
    if (BigInt(whole) === 0n && BigInt(fraction || '0') === 0n) return null;
  } catch {
    return null;
  }
  return normalized;
}

function rateRational(rate: string): { numerator: bigint; denominator: bigint } {
  const canonical = parseCanonicalRate(rate);
  if (!canonical) throw new RangeError('Rate harus decimal canonical positif.');
  const [whole = '0', fraction = ''] = canonical.split('.');
  const denominator = 10n ** BigInt(fraction.length);
  return { numerator: BigInt(whole) * denominator + BigInt(fraction || '0'), denominator };
}

export function roundHalfEven(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new RangeError('Denominator harus positif.');
  const sign = numerator < 0n ? -1n : 1n;
  const positive = numerator < 0n ? -numerator : numerator;
  const quotient = positive / denominator;
  const remainder = positive % denominator;
  const doubled = remainder * 2n;
  const rounded =
    doubled > denominator || (doubled === denominator && quotient % 2n === 1n)
      ? quotient + 1n
      : quotient;
  return rounded * sign;
}

export function convertMoney(
  amountMinor: string,
  sourceCurrency: string,
  destinationCurrency: string,
  rate: string,
): CurrencyConversion {
  const amount = parseMinor(amountMinor);
  const source = metadataFor(sourceCurrency);
  const destination = metadataFor(destinationCurrency);
  if (amount === null) throw new RangeError('Amount harus minor unit integer positif.');
  if (!source || !destination) throw new RangeError('Currency tidak didukung.');
  const rational = rateRational(rate);
  const numerator = amount * rational.numerator * 10n ** BigInt(destination.exponent);
  const denominator = rational.denominator * 10n ** BigInt(source.exponent);
  const converted = roundHalfEven(numerator, denominator);
  return {
    amountMinor: `${converted}`,
    currency: destination.code,
    roundingDeltaMinor: `${converted - numerator / denominator}`,
  };
}

export function allocateRounding(
  amounts: string[],
  targetTotal: string,
): { amounts: string[]; roundingDeltaMinor: string } {
  const target = parseMinor(targetTotal, true);
  if (target === null) throw new RangeError('Target total tidak valid.');
  const values = amounts.map((amount) => parseMinor(amount, true));
  if (values.some((amount) => amount === null)) throw new RangeError('Alokasi tidak valid.');
  const safeValues = values.map((amount) => amount as bigint);
  const current = safeValues.reduce((sum, amount) => sum + amount, 0n);
  const delta = target - current;
  if (safeValues.length > 0)
    safeValues[safeValues.length - 1] = (safeValues[safeValues.length - 1] ?? 0n) + delta;
  return { amounts: safeValues.map((amount) => `${amount}`), roundingDeltaMinor: `${delta}` };
}

export function validateBaseCurrencyDraft(draft: BaseCurrencyDraft): string[] {
  const errors: string[] = [];
  if (!CURRENCY_CODES.has(draft.baseCurrency)) errors.push('Base currency tidak didukung.');
  if (!SUPPORTED_LOCALES.has(draft.displayLocale)) errors.push('Locale tidak didukung.');
  if (draft.accountCurrencies.some((item) => !CURRENCY_CODES.has(item.currency)))
    errors.push('Currency akun tidak didukung.');
  return errors;
}

export function validateFxQuote(quote: FxQuote): string[] {
  const errors: string[] = [];
  if (
    !CURRENCY_CODES.has(quote.base) ||
    !CURRENCY_CODES.has(quote.quote) ||
    quote.base === quote.quote
  )
    errors.push('Pasangan currency tidak didukung.');
  if (!parseCanonicalRate(quote.rate))
    errors.push('Rate harus positif, canonical, dan maksimal 10 desimal.');
  if (!['manual', 'provider', 'import'].includes(quote.source))
    errors.push('Source rate tidak didukung.');
  const timestamp = Date.parse(quote.effectiveAt);
  if (!Number.isFinite(timestamp)) errors.push('Timestamp rate tidak valid.');
  if (Number.isFinite(timestamp) && timestamp > Date.parse(FIXTURE_NOW) + 24 * 60 * 60 * 1000)
    errors.push('Timestamp rate masa depan di luar tolerance.');
  return errors;
}

function accountFixtures() {
  return [
    { accountId: 'account-cash-fixture', currency: 'IDR', hasActivity: false },
    { accountId: 'account-jpy-fixture', currency: 'JPY', hasActivity: true },
    { accountId: 'account-idr-fixture', currency: 'IDR', hasActivity: true },
  ];
}

function stateFor(scenario: CurrencyScenario): CurrencyState {
  if (scenario === 'loading') return 'loading';
  if (scenario === 'empty') return 'empty';
  if (scenario === 'offline') return 'offline';
  if (scenario === 'missing_rate') return 'missing_rate';
  if (scenario === 'stale_rate') return 'stale_rate';
  if (scenario === 'unsupported_currency') return 'unsupported_currency';
  if (scenario === 'permission_denied') return 'permission_denied';
  if (scenario === 'kill_switch' || scenario === 'read_only') return 'read_only';
  if (scenario === 'conflict') return 'needs_re_review';
  if (scenario === 'sync_pending') return 'sync_pending';
  if (scenario === 'failed') return 'failed';
  if (scenario === 'rollback') return 'aggregate_rollback';
  return 'idle';
}

export function createCurrencyFixture(scenario: CurrencyScenario = 'ready') {
  const accounts = accountFixtures();
  const historicalQuote: FxQuote = {
    base: 'JPY',
    quote: 'IDR',
    rate: '112.3456',
    effectiveAt: '2026-08-26T09:00:00.000Z',
    source: 'manual',
    actor: 'fixture-user',
    recordedAt: '2026-08-26T09:01:00.000Z',
  };
  let latestQuote = historicalQuote;
  const mutationResults = new Map<string, CrossCurrencyCommitResult>();
  return {
    scenario,
    initialResult: {
      state: stateFor(scenario),
      baseCurrency: 'IDR',
      displayLocale: 'id-ID',
      accounts,
    },
    historicalQuote,
    get latestQuote() {
      return latestQuote;
    },
    metadata(code: string) {
      return metadataFor(code);
    },
    currencyPicker() {
      return CURRENCY_CATALOG.map((item) => ({ ...item }));
    },
    currencyMetadata(code: string) {
      return metadataFor(code);
    },
    accountCurrency(accountId: string) {
      const account = accounts.find((item) => item.accountId === accountId);
      return account ? { currency: account.currency, readOnly: account.hasActivity } : null;
    },
    updateAccountCurrency(accountId: string, currency: string) {
      const account = accounts.find((item) => item.accountId === accountId);
      if (!metadataFor(currency)) return { kind: 'unsupported_currency' as const };
      if (!account) return { kind: 'unknown_account' as const };
      if (account.hasActivity) return { kind: 'read_only_activity' as const };
      return { kind: 'updated' as const, currency };
    },
    setReferenceRate(quote: FxQuote) {
      latestQuote = quote;
    },
    provenanceRoundTrip(quote: FxQuote) {
      const exported = JSON.stringify(quote);
      const restored = JSON.parse(exported) as FxQuote;
      return { exported, restored, unchanged: JSON.stringify(restored) === exported };
    },
    validateTransfer(draft: CrossCurrencyTransferDraft): TransferValidationResult {
      const source = accounts.find((item) => item.accountId === draft.sourceAccountId);
      const destination = accounts.find((item) => item.accountId === draft.destinationAccountId);
      if (!metadataFor(draft.sourceCurrency) || !metadataFor(draft.destinationCurrency))
        return { valid: false, reason: 'unsupported_currency' };
      if (draft.sourceAccountId === draft.destinationAccountId)
        return { valid: false, reason: 'same_account' };
      if (
        !source ||
        !destination ||
        source.currency !== draft.sourceCurrency ||
        destination.currency !== draft.destinationCurrency
      )
        return { valid: false, reason: 'account_currency_mismatch' };
      if (!parseMinor(draft.sourceAmountMinor) || !parseMinor(draft.destinationAmountMinor))
        return { valid: false, reason: 'invalid_amount' };
      const quoteErrors = validateFxQuote({
        base: draft.sourceCurrency,
        quote: draft.destinationCurrency,
        rate: draft.rate,
        effectiveAt: draft.effectiveAt,
        source: draft.rateSource,
      });
      if (quoteErrors.some((error) => error.includes('masa depan')))
        return { valid: false, reason: 'future_rate' };
      if (quoteErrors.length > 0) return { valid: false, reason: 'invalid_rate' };
      return { valid: true, reason: 'valid' };
    },
    saveBaseCurrency(draft: BaseCurrencyDraft, confirmed: boolean): BaseCurrencySaveResult {
      const errors = validateBaseCurrencyDraft(draft);
      if (errors.length > 0)
        return { kind: 'validation_error' as const, message: errors[0] ?? 'Draft tidak valid.' };
      if (!confirmed)
        return { kind: 'needs_confirmation' as const, message: 'Review perubahan base currency.' };
      if (scenario === 'conflict')
        return {
          kind: 'needs_re_review' as const,
          message: 'Base currency berubah di perangkat lain.',
        };
      return {
        kind: 'synced' as const,
        version: draft.expectedVersion + 1,
        ledgerImmutable: true,
        recomputeQueued: true,
      };
    },
    manualFallback(rate: FxQuote): ManualFallbackResult {
      return validateFxQuote(rate).length === 0
        ? { kind: 'ready' as const, draftRetained: true, source: 'manual' as const }
        : { kind: 'validation_error' as const, draftRetained: true };
    },
    reportPreview() {
      if (scenario === 'missing_rate')
        return {
          kind: 'partial' as const,
          incomplete: true,
          usedOneToOne: false,
          gaps: ['JPY/IDR'],
        };
      if (scenario === 'stale_rate')
        return {
          kind: 'partial' as const,
          incomplete: false,
          stale: true,
          usedOneToOne: false,
          gaps: [],
        };
      if (scenario === 'offline')
        return {
          kind: 'partial' as const,
          incomplete: false,
          offline: true,
          usedOneToOne: false,
          gaps: [],
        };
      return { kind: 'ready' as const, incomplete: false, usedOneToOne: false, gaps: [] };
    },
    transactionPreview() {
      return {
        originalAmountMinor: '1000',
        originalCurrency: 'JPY',
        reportAmountMinor: convertMoney('1000', 'JPY', 'IDR', historicalQuote.rate).amountMinor,
        reportCurrency: 'IDR',
        rateSource: historicalQuote.source,
        rateDate: historicalQuote.effectiveAt,
      };
    },
    previewCrossCurrencyTransfer(draft: CrossCurrencyTransferDraft): CrossCurrencyPreview {
      const feeAmount = draft.fee ? (parseMinor(draft.fee.amountMinor, true) ?? 0n) : 0n;
      return {
        legs: [
          {
            accountId: draft.sourceAccountId,
            currency: draft.sourceCurrency,
            signedAmountMinor: `-${parseMinor(draft.sourceAmountMinor) ?? 0n}`,
          },
          {
            accountId: draft.destinationAccountId,
            currency: draft.destinationCurrency,
            signedAmountMinor: `${parseMinor(draft.destinationAmountMinor) ?? 0n}`,
          },
        ],
        crossCurrencySignedSum: 'not_applicable',
        isIncome: false,
        fee:
          feeAmount > 0n && draft.fee
            ? {
                entryType: 'expense',
                amountMinor: `${feeAmount}`,
                categoryId: draft.fee.categoryId,
                relatedTransfer: true,
              }
            : undefined,
        rate: draft.rate,
        rateSource: draft.rateSource,
        effectiveAt: draft.effectiveAt,
      };
    },
    commitCrossCurrencyTransfer(
      draft: CrossCurrencyTransferDraft,
      confirmed: boolean,
    ): CrossCurrencyCommitResult {
      if (!confirmed) return { kind: 'needs_confirmation' as const, draftRetained: true };
      const previous = mutationResults.get(draft.clientMutationId);
      if (previous) return previous;
      const result: CrossCurrencyCommitResult =
        scenario === 'rollback' || scenario === 'failed'
          ? {
              kind: 'failed' as const,
              mutationId: draft.clientMutationId,
              atomic: true,
              rolledBack: true,
              partialLegs: false,
            }
          : scenario === 'offline' || scenario === 'sync_pending'
            ? {
                kind: 'sync_pending' as const,
                mutationId: draft.clientMutationId,
                atomic: true,
                partialLegs: false,
              }
            : scenario === 'conflict'
              ? {
                  kind: 'needs_re_review' as const,
                  message: 'Rate atau preference berubah; draft dipertahankan.',
                }
              : {
                  kind: 'synced' as const,
                  mutationId: draft.clientMutationId,
                  atomic: true,
                  partialLegs: false,
                };
      mutationResults.set(draft.clientMutationId, result);
      return result;
    },
    retry(mutationId: string): CrossCurrencyCommitResult {
      return (
        mutationResults.get(mutationId) ?? {
          kind: 'failed' as const,
          mutationId,
          atomic: true,
          rolledBack: true,
          partialLegs: false,
        }
      );
    },
  };
}

export type CurrencyFixture = ReturnType<typeof createCurrencyFixture>;

export function createMultiCurrencyFixture(scenario: CurrencyScenario = 'ready'): CurrencyFixture {
  return createCurrencyFixture(scenario);
}
