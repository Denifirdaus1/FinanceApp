import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../providers/theme-provider';

export function BootstrapLoadingScreen() {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: tokens.colors.canvas, padding: tokens.spacing.space6 },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityLabel="Memuat aplikasi"
    >
      <ActivityIndicator color={tokens.colors.primary} size="large" />
      <Text
        style={[
          tokens.typography.bodyLarge,
          styles.label,
          { color: tokens.colors.textSecondary, marginTop: tokens.spacing.space4 },
        ]}
      >
        Memuat aplikasi…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {},
});
