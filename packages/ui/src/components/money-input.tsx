import { Text, type TextInputProps } from 'react-native';

import { formatAmountInput, getCurrencyFractionDigits, parseMoneyInput } from '../tokens';
import { Input, type InputProps } from './input';
import { useTheme } from './theme-provider';

export interface MoneyInputProps extends Omit<
  InputProps,
  'keyboardType' | 'leading' | 'onChangeText' | 'value'
> {
  valueMinor: bigint | null;
  onChangeMinor: (value: bigint | null) => void;
  currency?: string;
  locale?: string;
  minorUnit?: number;
  allowNegative?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
}

export function MoneyInput({
  valueMinor,
  onChangeMinor,
  currency = 'IDR',
  locale = 'id-ID',
  minorUnit,
  allowNegative = false,
  keyboardType = 'numeric',
  onBlur,
  ...rest
}: MoneyInputProps) {
  const { tokens } = useTheme();
  const resolvedMinorUnit = minorUnit ?? getCurrencyFractionDigits(currency, locale);
  const inputValue = formatAmountInput(valueMinor, currency, locale, resolvedMinorUnit);

  return (
    <Input
      {...rest}
      accessibilityHint={rest.accessibilityHint ?? `Mata uang ${currency}`}
      keyboardType={keyboardType}
      leading={
        <Text style={[tokens.typography.label, { color: tokens.colors.textSecondary }]}>
          {currency}
        </Text>
      }
      onBlur={onBlur}
      onChangeText={(text) => {
        const parsed = parseMoneyInput(text, currency, locale, allowNegative, resolvedMinorUnit);
        onChangeMinor(parsed);
      }}
      value={inputValue}
    />
  );
}
