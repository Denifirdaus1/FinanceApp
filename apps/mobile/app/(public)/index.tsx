import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../src/app/providers/theme-provider';

export default function PublicLandingScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>FinanceApp</Text>
      <Text style={[styles.tagline, { color: colors.textSecondary }]}>
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
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  tagline: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
});
