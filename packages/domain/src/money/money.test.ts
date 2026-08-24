import { assert, integer, property, stringMatching } from 'fast-check';

import {
  MoneyParseError,
  formatAmountMinor,
  isIsoCurrency,
  moneyFromWire,
  moneyToWire,
  parseAmountMinor,
} from './money';
import type { Money, MoneyWire } from './money';

describe('parseAmountMinor', () => {
  it('parses canonical decimal strings into integer minor units', () => {
    expect(parseAmountMinor('0', 0)).toBe(0n);
    expect(parseAmountMinor('123', 0)).toBe(123n);
    expect(parseAmountMinor('123.45', 2)).toBe(12345n);
    expect(parseAmountMinor('1.1', 2)).toBe(110n);
    expect(parseAmountMinor('1.10', 2)).toBe(110n);
    expect(parseAmountMinor('5', 2)).toBe(500n);
    expect(parseAmountMinor('0.05', 2)).toBe(5n);
    expect(parseAmountMinor('1.234', 3)).toBe(1234n);
    expect(parseAmountMinor('-12.34', 2)).toBe(-1234n);
    expect(parseAmountMinor('-0', 0)).toBe(0n);
  });

  it('rejects malformed or non-exact decimal input', () => {
    const invalid = ['', 'abc', '1e3', '.5', '5.', '1.2.3', '+5', ' 5', '5 '];
    for (const input of invalid) {
      expect(() => parseAmountMinor(input, 2)).toThrow(MoneyParseError);
    }
    expect(() => parseAmountMinor('1.5', 0)).toThrow(MoneyParseError);
    expect(() => parseAmountMinor('1.234', 2)).toThrow(MoneyParseError);
  });

  it('rejects invalid exponents', () => {
    expect(() => parseAmountMinor('1', -1)).toThrow(MoneyParseError);
    expect(() => parseAmountMinor('1', 9)).toThrow(MoneyParseError);
    expect(() => parseAmountMinor('1', 2.5)).toThrow(MoneyParseError);
  });
});

describe('formatAmountMinor', () => {
  it('formats integer minor units into canonical decimal strings', () => {
    expect(formatAmountMinor(12345n, 2)).toBe('123.45');
    expect(formatAmountMinor(5n, 2)).toBe('0.05');
    expect(formatAmountMinor(0n, 2)).toBe('0.00');
    expect(formatAmountMinor(100000n, 2)).toBe('1000.00');
    expect(formatAmountMinor(-1234n, 2)).toBe('-12.34');
    expect(formatAmountMinor(123n, 0)).toBe('123');
    expect(formatAmountMinor(-7n, 0)).toBe('-7');
  });

  it('rejects invalid exponents', () => {
    expect(() => formatAmountMinor(1n, -1)).toThrow(MoneyParseError);
    expect(() => formatAmountMinor(1n, 9)).toThrow(MoneyParseError);
  });
});

describe('money wire format', () => {
  it('serializes to canonical integer string wire fields', () => {
    expect(moneyToWire({ minor: 12345n, currency: 'IDR' })).toEqual({
      amount_minor: '12345',
      currency: 'IDR',
    });
    expect(moneyToWire({ minor: -1234n, currency: 'USD' })).toEqual({
      amount_minor: '-1234',
      currency: 'USD',
    });
  });

  it('round-trips through the wire format', () => {
    const money: Money = { minor: 987654321n, currency: 'IDR' };
    expect(moneyFromWire(moneyToWire(money))).toEqual(money);
  });

  it('rejects invalid wire payloads', () => {
    expect(() => moneyFromWire({ amount_minor: '12.5', currency: 'IDR' })).toThrow(MoneyParseError);
    expect(() => moneyFromWire({ amount_minor: '12', currency: 'idr' })).toThrow(MoneyParseError);
    expect(() => moneyFromWire({ amount_minor: '12', currency: 'ID' })).toThrow(MoneyParseError);
    expect(() => moneyFromWire({ amount_minor: '12', currency: 'USD1' })).toThrow(MoneyParseError);
  });

  it('validates ISO 4217 currency codes', () => {
    expect(isIsoCurrency('IDR')).toBe(true);
    expect(isIsoCurrency('USD')).toBe(true);
    expect(isIsoCurrency('EUR')).toBe(true);
    expect(isIsoCurrency('idr')).toBe(false);
    expect(isIsoCurrency('US')).toBe(false);
    expect(isIsoCurrency('')).toBe(false);
  });
});

describe('money property tests', () => {
  it('round-trips any minor amount through parse and format exactly', () => {
    assert(
      property(
        integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        integer({ min: 0, max: 6 }),
        (minorNumber, exponent) => {
          const minor = BigInt(minorNumber);
          expect(parseAmountMinor(formatAmountMinor(minor, exponent), exponent)).toBe(minor);
        },
      ),
    );
  });

  it('is idempotent for any valid decimal string (no precision loss)', () => {
    assert(
      property(stringMatching(/^-?[0-9]{1,10}(\.[0-9]{1,4})?$/), (input) => {
        const canonical = formatAmountMinor(parseAmountMinor(input, 4), 4);
        expect(formatAmountMinor(parseAmountMinor(canonical, 4), 4)).toBe(canonical);
      }),
    );
  });

  it('survives JSON serialization of the wire format exactly', () => {
    assert(
      property(
        integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        stringMatching(/^[A-Z]{3}$/),
        (minorNumber, currency) => {
          const money: Money = { minor: BigInt(minorNumber), currency };
          const throughJson = JSON.parse(JSON.stringify(moneyToWire(money))) as MoneyWire;
          expect(moneyFromWire(throughJson)).toEqual(money);
        },
      ),
    );
  });

  it('preserves sign and exact value across parse and format', () => {
    assert(
      property(integer({ min: 1, max: 1_000_000_000 }), (n) => {
        const negative = parseAmountMinor(`-${n}`, 0);
        const positive = parseAmountMinor(`${n}`, 0);
        expect(negative).toBe(-BigInt(n));
        expect(positive).toBe(BigInt(n));
        expect(formatAmountMinor(negative, 0)).toBe(`-${n}`);
        expect(formatAmountMinor(positive, 0)).toBe(`${n}`);
      }),
    );
  });
});
