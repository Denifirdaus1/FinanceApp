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

export interface InputProps
  extends Omit<TextInputProps, 'accessibilityLabel' | 'accessibilityState' | 'editable' | 'onChangeText' | 'style' | 'value'> {
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
  const inputLabel = accessibilityLabel ?? labelText;
  const describedHint = error ? `${accessibilityHint ? `${accessibilityHint}. ` : ''}${error}` : accessibilityHint;
  const borderColor = error
    ? tokens.colors.danger
    : focused
      ? tokens.colors.info
      : tokens.colors.borderStrong;

  return (
    <View style={containerStyle}>
      <Text style={[tokens.typography.label, styles.label, { color: tokens.colors.textPrimary }]}>
        {labelText}
      </Text>
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: tokens.colors.surface,
            borderColor,
            borderWidth: focused || error ? tokens.stroke.focus : tokens.stroke.control,
          },
          disabled && styles.disabled,
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
          placeholderTextColor={placeholderTextColor ?? tokens.colors.textMuted}
          style={[tokens.typography.bodyLarge, styles.input, { color: tokens.colors.textPrimary }, inputStyle]}
          underlineColorAndroid="transparent"
          value={value}
        />
        {trailing}
      </View>
      {hint && !error ? (
        <Text style={[tokens.typography.caption, styles.supporting, { color: tokens.colors.textSecondary }]}>
          {hint}
        </Text>
      ) : null}
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[tokens.typography.body, styles.supporting, { color: tokens.colors.danger }]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
  },
  inputShell: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 0,
    paddingVertical: 10,
  },
  supporting: {
    marginTop: 6,
  },
  disabled: {
    opacity: 0.58,
  },
});
