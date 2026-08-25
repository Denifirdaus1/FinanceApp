import { Text, type TextInputProps } from 'react-native';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import {
  formatAmountInput,
  formatEditableMoneyInput,
  getCurrencyFractionDigits,
  parseMoneyInput,
} from '../tokens';
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
  keyboardType,
  inputStyle,
  onFocus,
  onBlur,
  ...rest
}: MoneyInputProps) {
  const { tokens } = useTheme();
  const resolvedMinorUnit = minorUnit ?? getCurrencyFractionDigits(currency, locale);
  const inputValue = formatAmountInput(valueMinor, currency, locale, resolvedMinorUnit);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(inputValue);
  const lastEmittedMinor = useRef<bigint | null>(valueMinor);
  const formatSignature = `${currency}:${locale}:${resolvedMinorUnit}`;
  const lastFormatSignature = useRef(formatSignature);
  const syncExternalDraft = useEffectEvent((nextValue: string) => setDraft(nextValue));
  const resolvedKeyboardType = keyboardType ?? (resolvedMinorUnit > 0 ? 'decimal-pad' : 'numeric');

  useEffect(() => {
    if (
      focused &&
      (valueMinor !== lastEmittedMinor.current || formatSignature !== lastFormatSignature.current)
    ) {
      syncExternalDraft(inputValue);
    }
    lastEmittedMinor.current = valueMinor;
    lastFormatSignature.current = formatSignature;
  }, [focused, formatSignature, inputValue, valueMinor]);

  return (
    <Input
      {...rest}
      accessibilityHint={rest.accessibilityHint ?? `Mata uang ${currency}`}
      inputStyle={[tokens.typography.amountRow, inputStyle]}
      keyboardType={resolvedKeyboardType}
      leading={
        <Text style={[tokens.typography.label, { color: tokens.colors.textSecondary }]}>
          {currency}
        </Text>
      }
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onFocus={(event) => {
        lastEmittedMinor.current = valueMinor;
        lastFormatSignature.current = formatSignature;
        setDraft(inputValue);
        setFocused(true);
        onFocus?.(event);
      }}
      onChangeText={(text) => {
        const parsed = parseMoneyInput(text, currency, locale, allowNegative, resolvedMinorUnit);
        setDraft(
          parsed !== null && resolvedMinorUnit === 0
            ? formatEditableMoneyInput(text, locale)
            : parsed !== null && resolvedMinorUnit > 0 && !/[.,]/.test(text)
              ? formatEditableMoneyInput(text, locale)
              : text,
        );
        lastEmittedMinor.current = parsed;
        onChangeMinor(parsed);
      }}
      value={focused ? draft : inputValue}
    />
  );
}
