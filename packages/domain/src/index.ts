export {
  MoneyParseError,
  formatAmountMinor,
  isIsoCurrency,
  moneyFromWire,
  moneyToWire,
  parseAmountMinor,
} from './money/money.ts';
export type { Money, MoneyWire } from './money/money.ts';

export const packageInfo = {
  name: '@financeapp/domain',
  version: '0.1.0',
} as const;
