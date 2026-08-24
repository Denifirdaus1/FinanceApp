import { moneyFromWire, moneyToWire } from '@financeapp/domain';
import type { Money, MoneyWire } from '@financeapp/domain';

describe('money wire contract', () => {
  it('locks canonical wire vectors shared with the server', () => {
    const vectors: [Money, string][] = [
      [{ minor: 0n, currency: 'IDR' }, '{"amount_minor":"0","currency":"IDR"}'],
      [{ minor: 12345n, currency: 'IDR' }, '{"amount_minor":"12345","currency":"IDR"}'],
      [{ minor: -1234n, currency: 'USD' }, '{"amount_minor":"-1234","currency":"USD"}'],
      [{ minor: 100000n, currency: 'EUR' }, '{"amount_minor":"100000","currency":"EUR"}'],
    ];
    for (const [money, json] of vectors) {
      expect(JSON.stringify(moneyToWire(money))).toBe(json);
      expect(moneyFromWire(JSON.parse(json))).toEqual(money);
    }
  });

  it('rejects any wire payload that would lose precision', () => {
    const numericAmount = JSON.parse('{"amount_minor":12345,"currency":"IDR"}') as {
      amount_minor: unknown;
      currency: unknown;
    };
    expect(() =>
      moneyFromWire({
        amount_minor: numericAmount.amount_minor,
        currency: 'IDR',
      } as unknown as MoneyWire),
    ).toThrow();
    expect(() => moneyFromWire({ amount_minor: '12345.0', currency: 'IDR' })).toThrow();
    expect(() => moneyFromWire({ amount_minor: '1e4', currency: 'IDR' })).toThrow();
    expect(() =>
      moneyFromWire({
        amount_minor: '12345',
        currency: 'IDR',
        extra: true,
      } as unknown as MoneyWire),
    ).toThrow();
  });
});
