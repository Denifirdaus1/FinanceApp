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

interface LocaleSeparators {
  decimal: string;
  group: string;
}

function normalizeCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

function assertFractionDigits(fractionDigits: number): void {
  if (!Number.isInteger(fractionDigits) || fractionDigits < 0 || fractionDigits > 8) {
    throw new RangeError('fraction digits must be an integer between 0 and 8');
  }
}

function getLocaleSeparators(locale: string): LocaleSeparators {
  const parts = new Intl.NumberFormat(locale).formatToParts(1234567.89);
  return {
    decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
    group: parts.find((part) => part.type === 'group')?.value ?? ',',
  };
}

function getLocaleDigitMaps(locale: string): {
  localizedToAscii: Map<string, string>;
  asciiToLocalized: Map<string, string>;
} {
  const localizedDigits = [
    ...new Intl.NumberFormat(locale, { useGrouping: false }).format(9876543210n),
  ];
  const localizedToAscii = new Map<string, string>();
  const asciiToLocalized = new Map<string, string>();
  localizedDigits.forEach((digit, index) => {
    const asciiDigit = String(9 - index);
    localizedToAscii.set(digit, asciiDigit);
    asciiToLocalized.set(asciiDigit, digit);
  });
  return { asciiToLocalized, localizedToAscii };
}

function normalizeDigits(value: string, locale: string): string {
  const { localizedToAscii } = getLocaleDigitMaps(locale);
  return [...value].map((character) => localizedToAscii.get(character) ?? character).join('');
}

function localizeDigits(value: string, locale: string): string {
  const { asciiToLocalized } = getLocaleDigitMaps(locale);
  return [...value].map((character) => asciiToLocalized.get(character) ?? character).join('');
}

export function getCurrencyFractionDigits(currency: string, locale = 'id-ID'): number {
  const normalized = normalizeCurrency(currency);
  if (normalized === 'IDR' || ZERO_FRACTION_CURRENCIES.has(normalized)) {
    return 0;
  }
  try {
    return (
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: normalized,
      }).resolvedOptions().maximumFractionDigits ?? 0
    );
  } catch {
    return 0;
  }
}

function normalizeIdrSpacing(value: string, currency: string, locale: string): string {
  if (normalizeCurrency(currency) !== 'IDR' || !locale.toLowerCase().startsWith('id')) {
    return value;
  }
  return value.replace(/^Rp[\u00a0\u202f]/, 'Rp');
}

function formatAbsoluteAmount(
  minor: bigint,
  currency: string,
  locale: string,
  fractionDigits: number,
  withCurrency: boolean,
): string {
  assertFractionDigits(fractionDigits);
  const scale = 10n ** BigInt(fractionDigits);
  const major = minor / scale;
  const fraction = minor % scale;
  const formatter = new Intl.NumberFormat(
    locale,
    withCurrency
      ? {
          style: 'currency',
          currency: normalizeCurrency(currency),
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits,
        }
      : {
          useGrouping: true,
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits,
        },
  );
  const fractionText = localizeDigits(fraction.toString().padStart(fractionDigits, '0'), locale);
  let hasFraction = false;
  const formatted = formatter
    .formatToParts(major)
    .map((part) => {
      if (part.type === 'fraction') {
        hasFraction = true;
        return fractionText;
      }
      return part.value;
    })
    .join('');

  if (fractionDigits === 0 || hasFraction) {
    return formatted;
  }
  return `${formatted}${getLocaleSeparators(locale).decimal}${fractionText}`;
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
  const formatted = formatAbsoluteAmount(absolute, currency, locale, fractionDigits, true);
  return `${sign}${normalizeIdrSpacing(formatted, currency, locale)}`;
}

function stripDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function stripLocaleDigits(value: string, locale: string): string {
  return normalizeDigits(value, locale).replace(/\D/g, '');
}

function isWellFormedGrouping(value: string, separator: string): boolean {
  const groups = value.split(separator);
  return (
    groups.length > 1 &&
    /^\d{1,3}$/.test(groups[0] ?? '') &&
    groups.slice(1).every((group) => /^\d{3}$/.test(group))
  );
}

export function formatEditableMoneyInput(input: string, locale = 'id-ID'): string {
  const sign = input.trim().startsWith('-') ? '-' : '';
  const digits = stripLocaleDigits(input, locale);
  if (digits.length === 0) {
    return input;
  }
  return `${sign}${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(BigInt(digits))}`;
}

function parseFractionalInput(
  input: string,
  fractionDigits: number,
  locale: string,
): { integer: string; fraction: string } | null {
  const separators = getLocaleSeparators(locale);
  const normalizedInput = normalizeDigits(input, locale);
  const allowedSeparators = new Set([',', '.', separators.decimal, separators.group]);
  const numeric = [...normalizedInput]
    .filter((character) => /\d/.test(character) || allowedSeparators.has(character))
    .join('');
  const localeDecimalCount = numeric.split(separators.decimal).length - 1;
  if (localeDecimalCount > 1) {
    return null;
  }
  const lastDecimal = numeric.lastIndexOf(separators.decimal);

  if (lastDecimal >= 0) {
    const fraction = stripDigits(numeric.slice(lastDecimal + separators.decimal.length));
    if (fraction.length > fractionDigits) {
      return null;
    }
    return {
      integer: stripDigits(numeric.slice(0, lastDecimal)) || '0',
      fraction,
    };
  }

  const separatorIndexes = [...new Set([',', '.', separators.group, separators.decimal])]
    .map((separator) => numeric.lastIndexOf(separator))
    .filter((index) => index >= 0);
  if (separatorIndexes.length === 0) {
    return { integer: stripDigits(numeric) || '0', fraction: '' };
  }

  const separatorIndex = Math.max(...separatorIndexes);
  const separator = numeric[separatorIndex];
  if (!separator) {
    return null;
  }
  const fractionCandidate = stripDigits(numeric.slice(separatorIndex + 1));
  const separatorCount = numeric.split(separator).length - 1;
  const isGroupingSeparator =
    separator === separators.group && isWellFormedGrouping(numeric, separator);
  if (isGroupingSeparator) {
    return { integer: stripDigits(numeric) || '0', fraction: '' };
  }
  if (separatorCount > 1 || fractionCandidate.length > fractionDigits) {
    return null;
  }
  return {
    integer: stripDigits(numeric.slice(0, separatorIndex)) || '0',
    fraction: fractionCandidate,
  };
}

export function parseMoneyInput(
  input: string,
  currency = 'IDR',
  locale = 'id-ID',
  allowNegative = false,
  fractionDigits = getCurrencyFractionDigits(currency, locale),
): bigint | null {
  assertFractionDigits(fractionDigits);
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const negativeSignCount = [...trimmed].filter((character) => character === '-').length;
  const hasNegativeSign = negativeSignCount === 1;
  const firstMinus = trimmed.indexOf('-');
  if (
    negativeSignCount > 1 ||
    (hasNegativeSign && !allowNegative) ||
    (hasNegativeSign && firstMinus !== 0)
  ) {
    return null;
  }

  const digitsOnly = stripLocaleDigits(trimmed, locale);
  if (digitsOnly.length === 0) {
    return null;
  }
  if (fractionDigits === 0) {
    return BigInt(`${hasNegativeSign ? '-' : ''}${digitsOnly}`);
  }

  const parsed = parseFractionalInput(trimmed, fractionDigits, locale);
  if (!parsed) {
    return null;
  }
  const minorDigits = `${parsed.integer}${parsed.fraction.padEnd(fractionDigits, '0')}`;
  return BigInt(`${hasNegativeSign ? '-' : ''}${minorDigits}`);
}
