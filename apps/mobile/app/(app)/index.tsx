import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../src/app/providers/theme-provider';

export default function AuthenticatedShellScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Beranda</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Ruang pribadi</Text>
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
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
});
