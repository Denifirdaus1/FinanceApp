import { router } from 'expo-router';
import { Button } from '@financeapp/ui';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../src/app/providers/theme-provider';

export default function ProfileScreen() {
  const { tokens } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: tokens.colors.canvas, padding: tokens.spacing.space6 },
      ]}
    >
      <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
        Profile
      </Text>
      <Text
        style={[
          tokens.typography.bodyLarge,
          { color: tokens.colors.textSecondary, marginTop: tokens.spacing.space2 },
        ]}
      >
        Navigation foundation siap untuk ruang profil dan kontrol akun.
      </Text>
      <Button
        label="Open financial profile"
        onPress={() => router.push('/profile/preferences')}
        style={{ marginTop: tokens.spacing.space6, alignSelf: 'flex-start' }}
      />
      <Button
        label="Open screen catalog"
        onPress={() => router.push('/screen-catalog')}
        style={{ marginTop: tokens.spacing.space4, alignSelf: 'flex-start' }}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
});
