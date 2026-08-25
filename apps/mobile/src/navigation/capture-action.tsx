import { router } from 'expo-router';
import { Button, type ButtonProps } from '@financeapp/ui';
import type { StyleProp, ViewStyle } from 'react-native';

export const CAPTURE_ACTION = {
  label: 'Add transaction',
  accessibilityLabel: 'Add transaction',
  accessibilityHint: 'Opens the deterministic transaction fixture flow',
  path: '/capture' as const,
  isPrimaryTab: false,
  minimumTouchTarget: 48,
};

export interface MockCaptureResult {
  status: 'mocked';
  flow: 'manual-transaction';
  message: 'Deterministic transaction fixture ready';
  amountMinor: 125000;
  currency: 'IDR';
}

export interface CaptureActionProps {
  onResult?: (result: MockCaptureResult) => void;
  style?: StyleProp<ViewStyle>;
}

export function createMockCaptureResult(): MockCaptureResult {
  return {
    status: 'mocked',
    flow: 'manual-transaction',
    message: 'Deterministic transaction fixture ready',
    amountMinor: 125000,
    currency: 'IDR',
  };
}

export function CaptureAction({ onResult, style }: CaptureActionProps) {
  const handlePress: ButtonProps['onPress'] = () => {
    const result = createMockCaptureResult();
    onResult?.(result);
    router.push(CAPTURE_ACTION.path);
  };

  return (
    <Button
      accessibilityHint={CAPTURE_ACTION.accessibilityHint}
      accessibilityLabel={CAPTURE_ACTION.accessibilityLabel}
      label={CAPTURE_ACTION.label}
      onPress={handlePress}
      style={style}
    />
  );
}
