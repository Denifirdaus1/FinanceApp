import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../providers/theme-provider';

export function BootstrapLoadingScreen() {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.container, { backgroundColor: colors.canvas }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel="Memuat aplikasi"
    >
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={[styles.label, { color: colors.textSecondary }]}>Memuat aplikasi…</Text>
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
  label: {
    fontSize: 16,
    marginTop: 16,
  },
});
