import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';

import type { SpacingName } from '../tokens';
import { useTheme } from './theme-provider';

export type CardVariant = 'surface' | 'raised' | 'muted';

export interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  elevation?: 'level0' | 'level1' | 'level2' | 'level3';
  padding?: SpacingName;
  onPress?: PressableProps['onPress'];
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
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: CardProps) {
  const { tokens } = useTheme();
  const backgroundColor = {
    surface: tokens.colors.surface,
    raised: tokens.colors.surfaceRaised,
    muted: tokens.colors.surfaceMuted,
  }[variant];
  const cardStyle = [
    styles.card,
    {
      backgroundColor,
      borderColor: tokens.colors.borderSubtle,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing[padding],
    },
    tokens.elevation[elevation],
    style,
  ];

  if (!onPress) {
    return <View style={cardStyle} testID={testID}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.88,
  },
});
