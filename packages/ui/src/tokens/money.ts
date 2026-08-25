const ZERO_FRACTION_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'ISK',
  'JPY',
  'KMF',
  'KRW',
  'PYG',
  'RWF',
  'UGX',
  'UYI',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

function normalizeCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

export function getCurrencyFractionDigits(currency: string, locale = 'id-ID'): number {
  const normalized = normalizeCurrency(currency);
  if (normalized === 'IDR' || ZERO_FRACTION_CURRENCIES.has(normalized)) {
    return 0;
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalized,
    }).resolvedOptions().maximumFractionDigits ?? 0;
  } catch {
    return 0;
  }
}

function normalizeCurrencySpacing(value: string): string {
  return value.replace(/[\u00a0\u202f]/g, '');
}

function getDecimalSeparator(locale: string): string {
  const parts = new Intl.NumberFormat(locale).formatToParts(1.1);
  return parts.find((part) => part.type === 'decimal')?.value ?? '.';
}

function formatAbsoluteAmount(
  minor: bigint,
  currency: string,
  locale: string,
  fractionDigits: number,
  withCurrency: boolean,
): string {
  const scale = 10n ** BigInt(fractionDigits);
  const major = minor / scale;
  const fraction = minor % scale;
  const formatter = new Intl.NumberFormat(
    locale,
    withCurrency
      ? {
          style: 'currency',
          currency: normalizeCurrency(currency),
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }
      : {
          useGrouping: true,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        },
  );
  const majorText = normalizeCurrencySpacing(formatter.format(major));
  if (fractionDigits === 0) {
    return majorText;
  }
  const fractionText = fraction.toString().padStart(fractionDigits, '0');
  return `${majorText}${getDecimalSeparator(locale)}${fractionText}`;
}

export function formatAmountInput(
  minor: bigint | null,
  currency = 'IDR',
  locale = 'id-ID',
  fractionDigits = getCurrencyFractionDigits(currency, locale),
): string {
  if (minor === null) {
    return '';
  }
  const sign = minor < 0n ? '-' : '';
  const absolute = minor < 0n ? -minor : minor;
  return `${sign}${formatAbsoluteAmount(absolute, currency, locale, fractionDigits, false)}`;
}

export function formatMoney(
  minor: bigint,
  currency = 'IDR',
  locale = 'id-ID',
  showPlus = false,
  fractionDigits = getCurrencyFractionDigits(currency, locale),
): string {
  const sign = minor < 0n ? '-' : showPlus && minor > 0n ? '+' : '';
  const absolute = minor < 0n ? -minor : minor;
  return `${sign}${formatAbsoluteAmount(absolute, currency, locale, fractionDigits, true)}`;
}

export function parseMoneyInput(
  input: string,
  currency = 'IDR',
  locale = 'id-ID',
  allowNegative = false,
  fractionDigits = getCurrencyFractionDigits(currency, locale),
): bigint | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const hasNegativeSign = trimmed.includes('-');
  if (hasNegativeSign && !allowNegative) {
    return null;
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length === 0) {
    return null;
  }
  if (fractionDigits === 0) {
    return BigInt(`${hasNegativeSign ? '-' : ''}${digitsOnly}`);
  }

  const lastComma = trimmed.lastIndexOf(',');
  const lastDot = trimmed.lastIndexOf('.');
  const separatorIndex = Math.max(lastComma, lastDot);
  const hasDecimalSeparator = separatorIndex >= 0 && /\d/.test(trimmed.slice(separatorIndex + 1));
  const fraction = hasDecimalSeparator
    ? trimmed.slice(separatorIndex + 1).replace(/\D/g, '')
    : '';
  if (fraction.length > fractionDigits) {
    return null;
  }
  const integer = hasDecimalSeparator
    ? trimmed.slice(0, separatorIndex).replace(/\D/g, '')
    : digitsOnly;
  const normalizedInteger = integer.length > 0 ? integer : '0';
  const minorDigits = `${normalizedInteger}${fraction.padEnd(fractionDigits, '0')}`;
  return BigInt(`${hasNegativeSign ? '-' : ''}${minorDigits}`);
}
