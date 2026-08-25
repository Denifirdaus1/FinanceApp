import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';

import { Button } from './button';
import { useTheme } from './theme-provider';

export interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  illustration?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  illustration,
  style,
  testID,
}: EmptyStateProps) {
  const { tokens } = useTheme();

  return (
    <View accessible accessibilityRole="summary" style={[styles.container, style]} testID={testID}>
      {illustration ? <View style={styles.illustration}>{illustration}</View> : null}
      <Text accessibilityRole="header" style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[tokens.typography.body, styles.message, { color: tokens.colors.textSecondary }]}>
        {message}
      </Text>
      <Button label={actionLabel} onPress={onAction} />
      {secondaryLabel && onSecondary ? (
        <Button label={secondaryLabel} onPress={onSecondary} variant="tertiary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  illustration: {
    marginBottom: 4,
  },
  message: {
    maxWidth: 420,
    textAlign: 'center',
  },
});
