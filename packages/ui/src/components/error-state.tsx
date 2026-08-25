import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

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
      style={[
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.danger,
          borderRadius: tokens.radius.lg,
          borderWidth: tokens.stroke.hairline,
          gap: tokens.spacing.space3,
          padding: tokens.spacing.space4,
        },
        style,
      ]}
      testID={testID}
    >
      <Text
        accessibilityRole="header"
        style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}
      >
        {title}
      </Text>
      <Text
        accessibilityLiveRegion="assertive"
        accessibilityRole="alert"
        style={[
          tokens.typography.body,
          {
            color: tokens.colors.textSecondary,
            maxWidth: tokens.componentMetrics.errorMessageMaxWidth,
          },
        ]}
      >
        {message}
      </Text>
      {onRetry ? <Button label={retryLabel} onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}
