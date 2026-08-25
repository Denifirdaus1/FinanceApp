import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useState, type ReactNode } from 'react';

import { useTheme } from './theme-provider';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  valueAccessibilityLabel?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: PressableProps['onPress'];
  onFocus?: PressableProps['onFocus'];
  onBlur?: PressableProps['onBlur'];
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
  onFocus,
  onBlur,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ListRowProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const label =
    accessibilityLabel ??
    [title, subtitle, valueAccessibilityLabel ?? value].filter(Boolean).join(', ');
  const rowStyle = [
    styles.row,
    {
      backgroundColor: disabled ? tokens.colors.disabled.surface : tokens.colors.surface,
      borderBottomColor: disabled ? tokens.colors.disabled.border : tokens.colors.borderSubtle,
      borderBottomWidth: tokens.stroke.hairline,
      gap: tokens.componentMetrics.cardContentGap,
      minHeight: tokens.componentMetrics.rowMinHeight,
      paddingHorizontal: tokens.spacing.space4,
      paddingVertical: tokens.spacing.space2,
    },
    style,
  ];

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onPress={onPress}
      style={({ pressed }) => [
        rowStyle,
        focused &&
          !disabled && {
            borderBottomColor: tokens.colors.info,
            borderBottomWidth: tokens.stroke.focus,
          },
        pressed && !disabled && { opacity: tokens.interaction.pressedOpacity },
      ]}
      testID={testID}
    >
      {leading ? (
        <View
          style={[
            styles.leading,
            {
              height: tokens.componentMetrics.iconContainer,
              width: tokens.componentMetrics.iconContainer,
            },
          ]}
        >
          {leading}
        </View>
      ) : null}
      <View style={styles.body}>
        <Text
          style={[
            tokens.typography.title,
            { color: disabled ? tokens.colors.disabled.text : tokens.colors.textPrimary },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              tokens.typography.caption,
              { color: disabled ? tokens.colors.disabled.text : tokens.colors.textSecondary },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text
          style={[
            tokens.typography.amountRow,
            styles.value,
            { color: disabled ? tokens.colors.disabled.text : tokens.colors.textPrimary },
          ]}
        >
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
    flexDirection: 'row',
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  value: {
    flexShrink: 0,
    textAlign: 'right',
  },
});
