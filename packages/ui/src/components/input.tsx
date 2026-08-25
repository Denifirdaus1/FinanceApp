import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useState, type ReactNode } from 'react';

import { useTheme } from './theme-provider';

export interface InputProps extends Omit<
  TextInputProps,
  'accessibilityLabel' | 'accessibilityState' | 'editable' | 'onChangeText' | 'style' | 'value'
> {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  accessibilityLabel?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export function Input({
  label,
  value,
  onChangeText,
  hint,
  error,
  required = false,
  disabled = false,
  leading,
  trailing,
  accessibilityLabel,
  accessibilityHint,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  placeholderTextColor,
  ...rest
}: InputProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const labelText = required ? `${label} (wajib)` : label;
  const baseInputLabel = accessibilityLabel ?? labelText;
  const inputLabel = baseInputLabel;
  const describedHint = accessibilityHint;
  const borderColor = error
    ? tokens.colors.danger
    : focused
      ? tokens.colors.info
      : tokens.colors.borderStrong;

  return (
    <View style={containerStyle}>
      <Text
        style={[
          tokens.typography.label,
          { color: tokens.colors.textPrimary, marginBottom: tokens.componentMetrics.fieldLabelGap },
        ]}
      >
        {labelText}
      </Text>
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: disabled ? tokens.colors.disabled.surface : tokens.colors.surface,
            borderColor: disabled ? tokens.colors.disabled.border : borderColor,
            borderRadius: tokens.radius.md,
            borderWidth:
              !disabled && (focused || error) ? tokens.stroke.focus : tokens.stroke.control,
            minHeight: tokens.interaction.buttonHeight,
            paddingHorizontal: tokens.spacing.space4,
          },
        ]}
      >
        {leading}
        <TextInput
          {...rest}
          accessibilityHint={describedHint}
          accessibilityLabel={inputLabel}
          accessibilityState={{ disabled }}
          editable={!disabled}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onChangeText={onChangeText}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          placeholderTextColor={
            placeholderTextColor ??
            (disabled ? tokens.colors.disabled.text : tokens.colors.textMuted)
          }
          style={[
            tokens.typography.bodyLarge,
            styles.input,
            {
              color: disabled ? tokens.colors.disabled.text : tokens.colors.textPrimary,
              minHeight: tokens.interaction.minimumTouchTarget,
              paddingVertical: tokens.spacing.space2,
            },
            inputStyle,
          ]}
          underlineColorAndroid="transparent"
          value={value}
        />
        {trailing}
      </View>
      {hint && !error ? (
        <Text
          style={[
            tokens.typography.caption,
            {
              color: tokens.colors.textSecondary,
              marginTop: tokens.componentMetrics.supportingTextGap,
            },
          ]}
        >
          {hint}
        </Text>
      ) : null}
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[
            tokens.typography.body,
            { color: tokens.colors.danger, marginTop: tokens.componentMetrics.supportingTextGap },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputShell: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    paddingHorizontal: 0,
  },
});
