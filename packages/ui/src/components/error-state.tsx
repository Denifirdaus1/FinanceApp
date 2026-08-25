import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Button } from './button';
import { useTheme } from './theme-provider';

export interface ErrorStateProps {
  title: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ErrorState({
  title,
  message,
  retryLabel = 'Coba lagi',
  onRetry,
  style,
  testID,
}: ErrorStateProps) {
  const { tokens } = useTheme();

  return (
    <View
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.danger,
          borderRadius: tokens.radius.lg,
        },
        style,
      ]}
      testID={testID}
    >
      <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>{title}</Text>
      <Text style={[tokens.typography.body, styles.message, { color: tokens.colors.textSecondary }]}>
        {message}
      </Text>
      {onRetry ? <Button label={retryLabel} onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  message: {
    maxWidth: 640,
  },
});
