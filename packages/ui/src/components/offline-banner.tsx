import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Button } from './button';
import { useTheme } from './theme-provider';

export interface OfflineBannerProps {
  visible?: boolean;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function OfflineBanner({
  visible = true,
  message = 'Offline—perubahan disimpan di perangkat.',
  retryLabel = 'Coba lagi',
  onRetry,
  style,
  testID,
}: OfflineBannerProps) {
  const { tokens } = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor: tokens.colors.primaryContainer,
          borderColor: tokens.colors.borderStrong,
          borderRadius: tokens.radius.sm,
        },
        style,
      ]}
      testID={testID}
    >
      <Text style={[tokens.typography.body, styles.message, { color: tokens.colors.onPrimaryContainer }]}>
        {message}
      </Text>
      {onRetry ? <Button label={retryLabel} onPress={onRetry} variant="tertiary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  message: {
    flex: 1,
    minWidth: 180,
  },
});
