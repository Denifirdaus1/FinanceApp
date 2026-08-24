import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../providers/theme-provider';

export interface OfflineScreenProps {
  onRetry: () => void;
}

export function OfflineScreen({ onRetry }: OfflineScreenProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.container, { backgroundColor: colors.canvas }]}
      accessibilityLiveRegion="polite"
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>Kamu sedang offline</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        Perubahan akan disimpan di perangkat.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Coba lagi"
        onPress={onRetry}
        style={[styles.button, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.buttonLabel, { color: colors.onPrimary }]}>Coba lagi</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
