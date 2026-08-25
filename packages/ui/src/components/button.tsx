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

export interface ButtonProps extends Omit<
  PressableProps,
  'accessibilityLabel' | 'accessibilityState' | 'children' | 'disabled' | 'onPress' | 'style'
> {
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
    icon: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      paddingHorizontal: tokens.spacing.space0,
    },
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
        {
          borderRadius: tokens.radius.md,
          borderWidth: tokens.stroke.hairline,
          minHeight:
            variant === 'icon'
              ? tokens.interaction.minimumTouchTarget
              : tokens.interaction.buttonHeight,
          minWidth: tokens.interaction.minimumTouchTarget,
          paddingHorizontal: variant === 'icon' ? tokens.spacing.space0 : tokens.spacing.space4,
        },
        variant === 'icon' && {
          height: tokens.interaction.minimumTouchTarget,
          width: tokens.interaction.minimumTouchTarget,
        },
        variantStyle,
        pressed &&
          !isDisabled && {
            opacity: reducedMotion
              ? tokens.interaction.pressedReducedOpacity
              : tokens.interaction.pressedOpacity,
          },
        isDisabled && { opacity: tokens.interaction.disabledOpacity },
        style,
      ]}
    >
      <View
        style={[
          styles.content,
          {
            gap: tokens.componentMetrics.buttonContentGap,
            minHeight: tokens.interaction.compactButtonHeight,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            accessible={false}
            color={contentColor}
            size="small"
            style={{ marginRight: tokens.spacing.space1 }}
          />
        ) : (
          leadingIcon
        )}
        {loading ? (
          <Text style={[tokens.typography.label, { color: contentColor }]}>
            {loadingLabel ?? label}
          </Text>
        ) : variant === 'icon' ? (
          children
        ) : (
          (children ?? (
            <Text style={[tokens.typography.label, { color: contentColor }]}>{label}</Text>
          ))
        )}
        {!loading && trailingIcon}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
