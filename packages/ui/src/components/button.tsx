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
import { useState, type ReactNode } from 'react';

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
  const [focused, setFocused] = useState(false);
  const isDisabled = disabled || loading;
  const variantStyle = isDisabled
    ? {
        backgroundColor: variant === 'icon' ? 'transparent' : tokens.colors.disabled.surface,
        borderColor: variant === 'icon' ? 'transparent' : tokens.colors.disabled.border,
        paddingHorizontal: variant === 'icon' ? tokens.spacing.space0 : tokens.spacing.space4,
      }
    : {
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
  const contentColor = isDisabled
    ? tokens.colors.disabled.text
    : variant === 'primary' || variant === 'destructive'
      ? tokens.colors.onPrimary
      : tokens.colors.primary;

  return (
    <Pressable
      {...rest}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onBlur={(event) => {
        setFocused(false);
        rest.onBlur?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        rest.onFocus?.(event);
      }}
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
        focused &&
          !isDisabled && {
            borderColor: tokens.colors.info,
            borderWidth: tokens.stroke.focus,
          },
        pressed &&
          !isDisabled && {
            opacity: reducedMotion
              ? tokens.interaction.pressedReducedOpacity
              : tokens.interaction.pressedOpacity,
          },
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
          reducedMotion ? (
            <View
              accessible={false}
              style={{
                backgroundColor: contentColor,
                borderRadius: tokens.radius.full,
                height: tokens.icon.small,
                marginRight: tokens.spacing.space1,
                width: tokens.icon.small,
              }}
            />
          ) : (
            <ActivityIndicator
              accessible={false}
              color={contentColor}
              size="small"
              style={{ marginRight: tokens.spacing.space1 }}
            />
          )
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
            <Text style={[tokens.typography.label, styles.label, { color: contentColor }]}>
              {label}
            </Text>
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
    flexShrink: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  label: {
    flexShrink: 1,
    textAlign: 'center',
  },
});
