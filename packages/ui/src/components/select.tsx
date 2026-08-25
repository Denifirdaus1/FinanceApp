import {
  Pressable,
  StyleSheet,
  Text,
  View,
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
  accessibilityLabel,
  style,
  testID,
  renderOption,
}: SelectProps<Value>) {
  const { tokens } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label ?? placeholder;
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
      <Text style={[tokens.typography.label, styles.label, { color: tokens.colors.textPrimary }]}>
        {label}
      </Text>
      <Pressable
        accessibilityHint={hint}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: open }}
        accessibilityValue={{ text: selectedLabel }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: tokens.colors.surface,
            borderColor: error ? tokens.colors.danger : tokens.colors.borderStrong,
          },
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}
        testID={testID}
      >
        <Text
          style={[
            tokens.typography.bodyLarge,
            { color: selectedOption ? tokens.colors.textPrimary : tokens.colors.textMuted },
          ]}
        >
          {selectedLabel}
        </Text>
        <Text accessibilityElementsHidden style={[tokens.typography.label, { color: tokens.colors.primary }]}>
          v
        </Text>
      </Pressable>
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
      <Sheet visible={open} title={label} onClose={close}>
        {searchable ? (
          <Input
            label={`Cari ${label.toLocaleLowerCase()}`}
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
                onPress={() => {
                  onChange(option.value);
                  close();
                }}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: selected ? tokens.colors.primaryContainer : tokens.colors.surface,
                    borderColor: selected ? tokens.colors.primary : tokens.colors.borderSubtle,
                  },
                  pressed && styles.pressed,
                ]}
              >
                {renderOption ? (
                  renderOption(option, selected)
                ) : (
                  <View style={styles.optionContent}>
                    <Text style={[tokens.typography.bodyLarge, { color: tokens.colors.textPrimary }]}>
                      {option.label}
                    </Text>
                    {option.description ? (
                      <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
                        {option.description}
                      </Text>
                    ) : null}
                    {selected ? (
                      <Text style={[tokens.typography.label, { color: tokens.colors.primary }]}>Dipilih</Text>
                    ) : null}
                  </View>
                )}
              </Pressable>
            );
          })
        ) : (
          <View accessible accessibilityRole="text">
            <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>Tidak ada hasil.</Text>
          </View>
        )}
        <Button label="Batal" onPress={close} variant="tertiary" />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
  },
  trigger: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  option: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  optionContent: {
    flex: 1,
    gap: 4,
  },
  supporting: {
    marginTop: 6,
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.58,
  },
});
