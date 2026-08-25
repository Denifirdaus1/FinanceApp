import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

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
      style={[
        styles.container,
        {
          backgroundColor: tokens.colors.primaryContainer,
          borderColor: tokens.colors.borderStrong,
          borderRadius: tokens.radius.sm,
          borderWidth: tokens.stroke.hairline,
          gap: tokens.interaction.minimumAdjacentTargetGap,
          minHeight: tokens.interaction.minimumTouchTarget,
          paddingHorizontal: tokens.spacing.space3,
          paddingVertical: tokens.spacing.space2,
        },
        style,
      ]}
      testID={testID}
    >
      <Text
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[
          tokens.typography.body,
          styles.message,
          {
            color: tokens.colors.onPrimaryContainer,
            minWidth: tokens.componentMetrics.bannerMessageMinWidth,
          },
        ]}
      >
        {message}
      </Text>
      {onRetry ? <Button label={retryLabel} onPress={onRetry} variant="tertiary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  message: {
    flex: 1,
    minWidth: 0,
  },
});
