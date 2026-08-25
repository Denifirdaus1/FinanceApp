import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';

import { useReducedMotion, useTheme } from './theme-provider';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'icon';

export interface ButtonProps
  extends Omit<PressableProps, 'accessibilityLabel' | 'accessibilityState' | 'children' | 'disabled' | 'onPress' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  loadingLabel?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children?: ReactNode;
  disabled?: boolean;
  onPress?: PressableProps['onPress'];
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  loadingLabel,
  leadingIcon,
  trailingIcon,
  children,
  disabled = false,
  onPress,
  accessibilityLabel,
  style,
  ...rest
}: ButtonProps) {
  const { tokens } = useTheme();
  const reducedMotion = useReducedMotion();
  const isDisabled = disabled || loading;
  const variantStyle = {
    primary: { backgroundColor: tokens.colors.primary, borderColor: tokens.colors.primary },
    secondary: {
      backgroundColor: tokens.colors.surfaceMuted,
      borderColor: tokens.colors.borderStrong,
    },
    tertiary: { backgroundColor: 'transparent', borderColor: 'transparent' },
    destructive: { backgroundColor: tokens.colors.danger, borderColor: tokens.colors.danger },
    icon: { backgroundColor: 'transparent', borderColor: 'transparent', paddingHorizontal: 0 },
  }[variant];
  const contentColor =
    variant === 'primary' || variant === 'destructive'
      ? tokens.colors.onPrimary
      : tokens.colors.primary;

  return (
    <Pressable
      {...rest}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'icon' && styles.iconButton,
        variantStyle,
        pressed && !isDisabled && (reducedMotion ? styles.pressedReduced : styles.pressed),
        isDisabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            accessible={false}
            color={contentColor}
            size="small"
            style={styles.spinner}
          />
        ) : (
          leadingIcon
        )}
        {children ?? (
          <Text style={[tokens.typography.label, { color: contentColor }]}>
            {loading && loadingLabel ? loadingLabel : label}
          </Text>
        )}
        {!loading && trailingIcon}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    minWidth: 48,
    paddingHorizontal: 16,
  },
  iconButton: {
    height: 48,
    minHeight: 48,
    paddingHorizontal: 0,
    width: 48,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
  },
  spinner: {
    marginRight: 2,
  },
  pressed: {
    opacity: 0.82,
  },
  pressedReduced: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.58,
  },
});
