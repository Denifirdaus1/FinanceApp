import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@financeapp/ui';

import { useTheme } from '../providers/theme-provider';

export interface ErrorScreenProps {
  onRetry: () => void;
}

export function ErrorScreen({ onRetry }: ErrorScreenProps) {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: tokens.colors.canvas, padding: tokens.spacing.space6 },
      ]}
      accessibilityLiveRegion="polite"
    >
      <Text
        accessibilityRole="header"
        style={[tokens.typography.heading2, styles.title, { color: tokens.colors.textPrimary }]}
      >
        Terjadi kesalahan
      </Text>
      <Text
        style={[
          tokens.typography.bodyLarge,
          styles.message,
          { color: tokens.colors.textSecondary, marginTop: tokens.spacing.space2 },
        ]}
      >
        Data Anda tetap aman di perangkat.
      </Text>
      <Button label="Coba lagi" onPress={onRetry} style={{ marginTop: tokens.spacing.space6 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
});
