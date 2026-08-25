import { router } from 'expo-router';
import { Button } from '@financeapp/ui';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../src/app/providers/theme-provider';
import {
  createMockCaptureResult,
  type MockCaptureResult,
} from '../../src/navigation/capture-action';

export default function CaptureScreen() {
  const { tokens } = useTheme();
  const [result, setResult] = useState<MockCaptureResult | null>(null);

  return (
    <View
      accessibilityLabel="Add transaction screen"
      style={[
        styles.container,
        { backgroundColor: tokens.colors.canvas, padding: tokens.spacing.space6 },
      ]}
    >
      <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
        Add transaction
      </Text>
      <Text
        style={[
          tokens.typography.bodyLarge,
          { color: tokens.colors.textSecondary, marginTop: tokens.spacing.space2 },
        ]}
      >
        Deterministic fixture flow untuk validasi interaksi U01.
      </Text>

      {result ? (
        <Text
          accessibilityRole="summary"
          style={[
            tokens.typography.bodyLarge,
            { color: tokens.colors.primary, marginTop: tokens.spacing.space5 },
          ]}
        >
          {result.message} · {result.currency} {result.amountMinor}
        </Text>
      ) : null}

      <Button
        label="Use example transaction"
        onPress={() => setResult(createMockCaptureResult())}
        style={{ marginTop: tokens.spacing.space6, alignSelf: 'flex-start' }}
      />
      <Button
        label="Back"
        onPress={() => router.back()}
        style={{ marginTop: tokens.spacing.space3, alignSelf: 'flex-start' }}
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
