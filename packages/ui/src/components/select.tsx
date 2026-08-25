import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useMemo, useState, type ReactNode } from 'react';

import { Button } from './button';
import { Input } from './input';
import { Sheet } from './sheet';
import { useTheme } from './theme-provider';

export interface SelectOption<Value extends string> {
  label: string;
  value: Value;
  description?: string;
}

export interface SelectProps<Value extends string> {
  label: string;
  value: Value | null;
  options: readonly SelectOption<Value>[];
  onChange: (value: Value) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchLabel?: string;
  cancelLabel?: string;
  onFocus?: PressableProps['onFocus'];
  onBlur?: PressableProps['onBlur'];
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  renderOption?: (option: SelectOption<Value>, selected: boolean) => ReactNode;
}

export function Select<Value extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Pilih opsi',
  hint,
  error,
  disabled = false,
  searchable = false,
  searchLabel = 'Cari pilihan',
  cancelLabel = 'Batal',
  onFocus,
  onBlur,
  accessibilityLabel,
  style,
  testID,
  renderOption,
}: SelectProps<Value>) {
  const { tokens } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [focusedOption, setFocusedOption] = useState<Value | null>(null);
  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label ?? placeholder;
  const selectLabel = accessibilityLabel ?? label;
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return options;
    }
    return options.filter((option) => option.label.toLocaleLowerCase().includes(normalizedQuery));
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={style}>
      <Text
        style={[
          tokens.typography.label,
          { color: tokens.colors.textPrimary, marginBottom: tokens.componentMetrics.fieldLabelGap },
        ]}
      >
        {label}
      </Text>
      <Pressable
        accessibilityHint={hint}
        accessibilityLabel={selectLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: open }}
        accessibilityValue={{ text: selectedLabel }}
        disabled={disabled}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: disabled ? tokens.colors.disabled.surface : tokens.colors.surface,
            borderColor: disabled
              ? tokens.colors.disabled.border
              : focused
                ? tokens.colors.info
                : error
                  ? tokens.colors.danger
                  : tokens.colors.borderStrong,
            borderRadius: tokens.radius.md,
            borderWidth: focused && !disabled ? tokens.stroke.focus : tokens.stroke.control,
            gap: tokens.componentMetrics.cardContentGap,
            minHeight: tokens.interaction.buttonHeight,
            paddingHorizontal: tokens.spacing.space4,
          },
          pressed && !disabled && { opacity: tokens.interaction.pressedOpacity },
        ]}
        testID={testID}
      >
        <Text
          style={[
            tokens.typography.bodyLarge,
            {
              color: disabled
                ? tokens.colors.disabled.text
                : selectedOption
                  ? tokens.colors.textPrimary
                  : tokens.colors.textMuted,
            },
          ]}
        >
          {selectedLabel}
        </Text>
        <Text
          accessibilityElementsHidden
          style={[
            tokens.typography.label,
            { color: disabled ? tokens.colors.disabled.text : tokens.colors.primary },
          ]}
        >
          v
        </Text>
      </Pressable>
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
      <Sheet visible={open} title={label} onClose={close}>
        {searchable ? (
          <Input
            label={searchLabel}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        ) : null}
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                accessibilityLabel={option.label}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option.value}
                onBlur={() => setFocusedOption(null)}
                onFocus={() => setFocusedOption(option.value)}
                onPress={() => {
                  onChange(option.value);
                  close();
                }}
                style={({ pressed }) => [
                  {
                    borderColor:
                      focusedOption === option.value
                        ? tokens.colors.info
                        : selected
                          ? tokens.colors.primary
                          : tokens.colors.borderSubtle,
                    borderWidth:
                      focusedOption === option.value ? tokens.stroke.focus : tokens.stroke.hairline,
                  },
                  {
                    backgroundColor: selected
                      ? tokens.colors.primaryContainer
                      : tokens.colors.surface,
                    borderRadius: tokens.radius.md,
                    minHeight: tokens.interaction.buttonHeight,
                    paddingHorizontal: tokens.spacing.space4,
                    paddingVertical: tokens.spacing.space2,
                  },
                  focusedOption === option.value && {
                    margin: -tokens.interaction.focusOffset,
                  },
                  pressed && { opacity: tokens.interaction.pressedOpacity },
                ]}
              >
                {renderOption ? (
                  renderOption(option, selected)
                ) : (
                  <View style={[styles.optionContent, { gap: tokens.spacing.space1 }]}>
                    <Text
                      style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}
                    >
                      {option.label}
                    </Text>
                    {option.description ? (
                      <Text
                        style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}
                      >
                        {option.description}
                      </Text>
                    ) : null}
                    {selected ? (
                      <Text style={[tokens.typography.label, { color: tokens.colors.primary }]}>
                        Dipilih
                      </Text>
                    ) : null}
                  </View>
                )}
              </Pressable>
            );
          })
        ) : (
          <View accessible accessibilityRole="text">
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
              Tidak ada hasil.
            </Text>
          </View>
        )}
        <Button label={cancelLabel} onPress={close} variant="tertiary" />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionContent: {
    flex: 1,
  },
});
