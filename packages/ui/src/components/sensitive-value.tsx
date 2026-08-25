import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useTheme } from './theme-provider';

export interface SensitiveValueProps {
  value: string;
  hidden?: boolean;
  hiddenValue?: string;
  accessibilityLabel?: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
}

export function SensitiveValue({
  value,
  hidden = false,
  hiddenValue = '••••',
  accessibilityLabel,
  style,
  testID,
}: SensitiveValueProps) {
  const { tokens } = useTheme();
  const displayedValue = hidden ? hiddenValue : value;
  const label = hidden
    ? (accessibilityLabel ?? 'Nominal disembunyikan')
    : (accessibilityLabel ?? value);

  return (
    <Text
      accessible
      accessibilityLabel={label}
      style={[tokens.typography.amountRow, { color: tokens.colors.textPrimary }, style]}
      testID={testID}
    >
      {displayedValue}
    </Text>
  );
}
