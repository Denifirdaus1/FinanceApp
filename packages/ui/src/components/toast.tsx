import { useEffect } from 'react';
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
  duration = 5000,
  variant = 'neutral',
  style,
  testID,
  children,
}: ToastProps) {
  const { tokens } = useTheme();

  useEffect(() => {
    if (!visible || duration <= 0) {
      return undefined;
    }
    const timeout = setTimeout(onDismiss, duration);
    return () => clearTimeout(timeout);
  }, [duration, onDismiss, visible]);

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
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.toast,
        {
          backgroundColor: tokens.colors.surfaceRaised,
          borderColor: statusColor,
        },
        tokens.elevation.level2,
        style,
      ]}
      testID={testID}
    >
      <Text style={[tokens.typography.body, styles.message, { color: tokens.colors.textPrimary }]}>
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
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  message: {
    flex: 1,
    minWidth: 160,
  },
});
