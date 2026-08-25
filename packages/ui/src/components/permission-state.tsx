import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from './button';
import { useTheme } from './theme-provider';

export type PermissionStatus = 'prompt' | 'denied' | 'blocked';

export interface PermissionStateProps {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  status?: PermissionStatus;
  alternativeLabel?: string;
  onAlternative?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function PermissionState({
  title,
  message,
  actionLabel,
  onAction,
  status = 'prompt',
  alternativeLabel,
  onAlternative,
  style,
  testID,
}: PermissionStateProps) {
  const { tokens } = useTheme();
  const statusMessage = {
    prompt: 'Izin belum diminta.',
    denied: 'Izin ditolak. Kamu tetap dapat memakai metode manual.',
    blocked: 'Izin diblokir. Buka pengaturan untuk mengubahnya.',
  }[status];

  return (
    <View
      style={[
        {
          backgroundColor: tokens.colors.surfaceMuted,
          borderColor: tokens.colors.borderStrong,
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
      <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
        {message}
      </Text>
      <Text
        accessibilityLiveRegion="polite"
        style={[tokens.typography.body, { color: tokens.colors.warning }]}
      >
        {statusMessage}
      </Text>
      <Button label={actionLabel} onPress={onAction} variant="secondary" />
      {alternativeLabel && onAlternative ? (
        <Button label={alternativeLabel} onPress={onAlternative} variant="tertiary" />
      ) : null}
    </View>
  );
}
