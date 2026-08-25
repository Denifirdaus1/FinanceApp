import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../src/app/providers/theme-provider';

export default function PublicLandingScreen() {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: tokens.colors.canvas, padding: tokens.spacing.space6 },
      ]}
    >
      <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
        FinanceApp
      </Text>
      <Text
        style={[
          tokens.typography.bodyLarge,
          styles.tagline,
          { color: tokens.colors.textSecondary, marginTop: tokens.spacing.space3 },
        ]}
      >
        Catat cepat, pahami uangmu, rencanakan dengan tenang.
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
  tagline: {
    textAlign: 'center',
  },
});
