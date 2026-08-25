import { useEffect, useEffectEvent } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { Button } from './button';
import { useTheme } from './theme-provider';

export type ToastVariant = 'neutral' | 'success' | 'warning' | 'danger';

export interface ToastProps {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  duration?: number;
  variant?: ToastVariant;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: ReactNode;
}

export function Toast({
  visible,
  message,
  actionLabel,
  onAction,
  onDismiss,
  duration,
  variant = 'neutral',
  style,
  testID,
  children,
}: ToastProps) {
  const { tokens } = useTheme();
  const resolvedDuration = duration ?? tokens.componentMetrics.toastDuration;
  const dismiss = useEffectEvent(onDismiss);

  useEffect(() => {
    if (!visible || resolvedDuration <= 0) {
      return undefined;
    }
    const timeout = setTimeout(dismiss, resolvedDuration);
    return () => clearTimeout(timeout);
  }, [resolvedDuration, visible]);

  if (!visible) {
    return null;
  }

  const statusColor = {
    neutral: tokens.colors.borderStrong,
    success: tokens.colors.success,
    warning: tokens.colors.warning,
    danger: tokens.colors.danger,
  }[variant];

  return (
    <View
      style={[
        styles.toast,
        {
          backgroundColor: tokens.colors.surfaceRaised,
          borderColor: statusColor,
          borderRadius: tokens.radius.md,
          borderWidth: tokens.stroke.hairline,
          gap: tokens.interaction.minimumAdjacentTargetGap,
          minHeight: tokens.interaction.buttonHeight,
          paddingHorizontal: tokens.spacing.space4,
          paddingVertical: tokens.spacing.space1,
        },
        tokens.elevation.level2,
        style,
      ]}
      testID={testID}
    >
      <Text
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[
          tokens.typography.body,
          styles.message,
          {
            color: tokens.colors.textPrimary,
            minWidth: tokens.componentMetrics.toastMessageMinWidth,
          },
        ]}
      >
        {message}
      </Text>
      {children}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={() => {
            onAction();
            onDismiss();
          }}
          variant="tertiary"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  message: {
    flex: 1,
  },
});
