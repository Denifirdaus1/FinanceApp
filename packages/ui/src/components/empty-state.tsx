import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
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
    <View
      style={[
        styles.container,
        {
          gap: tokens.componentMetrics.cardContentGap,
          paddingHorizontal: tokens.spacing.space5,
          paddingVertical: tokens.spacing.space10,
        },
        style,
      ]}
      testID={testID}
    >
      {illustration ? (
        <View style={{ marginBottom: tokens.spacing.space1 }}>{illustration}</View>
      ) : null}
      <Text
        accessibilityRole="header"
        style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}
      >
        {title}
      </Text>
      <Text
        style={[
          tokens.typography.body,
          styles.message,
          {
            color: tokens.colors.textSecondary,
            maxWidth: tokens.componentMetrics.emptyMessageMaxWidth,
          },
        ]}
      >
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
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
  },
});
