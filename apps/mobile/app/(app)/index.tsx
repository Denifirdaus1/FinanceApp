import { router } from 'expo-router';
import { Button } from '@financeapp/ui';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../src/app/providers/theme-provider';

export default function AuthenticatedShellScreen() {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: tokens.colors.canvas, padding: tokens.spacing.space6 },
      ]}
    >
      <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
        Beranda
      </Text>
      <Text
        style={[
          tokens.typography.bodyLarge,
          { color: tokens.colors.textSecondary, marginTop: tokens.spacing.space2 },
        ]}
      >
        Ruang pribadi
      </Text>
      <Button label="Open sync status" onPress={() => router.push('/sync')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
