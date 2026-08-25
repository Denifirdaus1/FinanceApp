import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useState, type ReactNode } from 'react';

import type { SpacingName } from '../tokens';
import { useTheme } from './theme-provider';

export type CardVariant = 'surface' | 'raised' | 'muted';

export interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  elevation?: 'level0' | 'level1' | 'level2' | 'level3';
  padding?: SpacingName;
  onPress?: PressableProps['onPress'];
  onFocus?: PressableProps['onFocus'];
  onBlur?: PressableProps['onBlur'];
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Card({
  children,
  variant = 'surface',
  elevation = 'level1',
  padding = 'space4',
  onPress,
  disabled = false,
  onFocus,
  onBlur,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: CardProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const backgroundColor = disabled
    ? tokens.colors.disabled.surface
    : {
        surface: tokens.colors.surface,
        raised: tokens.colors.surfaceRaised,
        muted: tokens.colors.surfaceMuted,
      }[variant];
  const cardStyle = [
    styles.card,
    {
      backgroundColor,
      borderColor: disabled ? tokens.colors.disabled.border : tokens.colors.borderSubtle,
      borderRadius: tokens.radius.lg,
      borderWidth: tokens.stroke.hairline,
      minWidth: onPress ? tokens.interaction.minimumTouchTarget : tokens.spacing.space0,
      padding: tokens.spacing[padding],
      minHeight: onPress ? tokens.interaction.minimumTouchTarget : undefined,
    },
    tokens.elevation[elevation],
    style,
  ];

  if (!onPress) {
    return (
      <View style={cardStyle} testID={testID}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
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
        cardStyle,
        focused &&
          !disabled && {
            borderColor: tokens.colors.info,
            borderWidth: tokens.stroke.focus,
          },
        pressed && !disabled && { opacity: tokens.interaction.pressedOpacity },
      ]}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 0,
  },
});
