import { Text, type TextInputProps } from 'react-native';
import { useEffect, useState } from 'react';

import {
  formatAmountInput,
  getCurrencyFractionDigits,
  parseMoneyInput,
} from '../tokens';
import { Input, type InputProps } from './input';
import { useTheme } from './theme-provider';

export interface MoneyInputProps
  extends Omit<InputProps, 'keyboardType' | 'leading' | 'onChangeText' | 'value'> {
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
  const [inputValue, setInputValue] = useState(() =>
    formatAmountInput(valueMinor, currency, locale, resolvedMinorUnit),
  );

  useEffect(() => {
    setInputValue(formatAmountInput(valueMinor, currency, locale, resolvedMinorUnit));
  }, [currency, locale, resolvedMinorUnit, valueMinor]);

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
      onBlur={(event) => {
        setInputValue(formatAmountInput(valueMinor, currency, locale, resolvedMinorUnit));
        onBlur?.(event);
      }}
      onChangeText={(text) => {
        const parsed = parseMoneyInput(
          text,
          currency,
          locale,
          allowNegative,
          resolvedMinorUnit,
        );
        setInputValue(
          parsed === null && text.trim().length > 0
            ? text
            : formatAmountInput(parsed, currency, locale, resolvedMinorUnit),
        );
        onChangeMinor(parsed);
      }}
      value={inputValue}
    />
  );
}
