import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from './theme-provider';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  valueAccessibilityLabel?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: PressableProps['onPress'];
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ListRow({
  title,
  subtitle,
  value,
  valueAccessibilityLabel,
  leading,
  trailing,
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ListRowProps) {
  const { tokens } = useTheme();
  const label = accessibilityLabel ?? [title, subtitle, valueAccessibilityLabel ?? value].filter(Boolean).join(', ');
  const rowStyle = [
    styles.row,
    {
      borderBottomColor: tokens.colors.borderSubtle,
      backgroundColor: tokens.colors.surface,
    },
    disabled && styles.disabled,
    style,
  ];

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [rowStyle, pressed && !disabled && styles.pressed]}
      testID={testID}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.body}>
        <Text style={[tokens.typography.title, { color: tokens.colors.textPrimary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[tokens.typography.amountRow, styles.value, { color: tokens.colors.textPrimary }]}>
          {value}
        </Text>
      ) : null}
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  leading: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  value: {
    flexShrink: 0,
    textAlign: 'right',
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.58,
  },
});
