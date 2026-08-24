export interface Money {
  minor: bigint;
  currency: string;
}

export interface MoneyWire {
  amount_minor: string;
  currency: string;
}

export class MoneyParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyParseError';
  }
}

const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const WIRE_AMOUNT_PATTERN = /^-?\d+$/;
const MAJOR_AMOUNT_PATTERN = /^-?(\d+)(?:\.(\d+))?$/;

function assertExponent(exponent: number): void {
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > 8) {
    throw new MoneyParseError(`exponent must be an integer between 0 and 8, got ${exponent}`);
  }
}

export function isIsoCurrency(value: string): boolean {
  return CURRENCY_PATTERN.test(value);
}

export function parseAmountMinor(input: string, exponent: number): bigint {
  assertExponent(exponent);
  const match = MAJOR_AMOUNT_PATTERN.exec(input);
  if (!match) {
    throw new MoneyParseError('amount must be a plain decimal string without exponent notation');
  }
  const intPart = match[1] ?? '';
  const fraction = match[2] ?? '';
  if (fraction.length > exponent) {
    throw new MoneyParseError(
      'amount has more fractional digits than the currency exponent allows',
    );
  }
  const sign = input.startsWith('-') ? -1n : 1n;
  return sign * BigInt(`${intPart}${fraction.padEnd(exponent, '0')}`);
}

export function formatAmountMinor(minor: bigint, exponent: number): string {
  assertExponent(exponent);
  const sign = minor < 0n ? '-' : '';
  const digits = (minor < 0n ? -minor : minor).toString();
  if (exponent === 0) {
    return `${sign}${digits}`;
  }
  const padded = digits.padStart(exponent + 1, '0');
  const intPart = padded.slice(0, padded.length - exponent);
  const fraction = padded.slice(padded.length - exponent);
  return `${sign}${intPart}.${fraction}`;
}

export function moneyToWire(money: Money): MoneyWire {
  return { amount_minor: money.minor.toString(), currency: money.currency };
}

const WIRE_KEYS = new Set(['amount_minor', 'currency']);

export function moneyFromWire(wire: MoneyWire): Money {
  if (typeof wire !== 'object' || wire === null) {
    throw new MoneyParseError('wire payload must be an object');
  }
  for (const key of Object.keys(wire)) {
    if (!WIRE_KEYS.has(key)) {
      throw new MoneyParseError(`wire payload contains unknown field: ${key}`);
    }
  }
  if (typeof wire.amount_minor !== 'string' || !WIRE_AMOUNT_PATTERN.test(wire.amount_minor)) {
    throw new MoneyParseError('wire amount_minor must be a canonical integer string');
  }
  if (typeof wire.currency !== 'string' || !isIsoCurrency(wire.currency)) {
    throw new MoneyParseError('wire currency must be a 3-letter ISO 4217 code');
  }
  return { minor: BigInt(wire.amount_minor), currency: wire.currency };
}
