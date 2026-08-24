import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../src/app/providers/theme-provider';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Halaman tidak ditemukan</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        Akses tidak tersedia atau tautan tidak dikenal.
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
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
});
