import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Button } from './button';
import { useReducedMotion, useTheme } from './theme-provider';

export interface DialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  onCancel: () => void;
  destructive?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Dialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  cancelLabel = 'Batal',
  onCancel,
  destructive = false,
  loading = false,
  style,
  testID,
}: DialogProps) {
  const { tokens } = useTheme();
  const reducedMotion = useReducedMotion();

  if (!visible) {
    return null;
  }

  return (
    <Modal
      accessibilityViewIsModal
      animationType={reducedMotion ? 'none' : 'fade'}
      onRequestClose={onCancel}
      transparent
      visible
    >
      <View style={styles.modalRoot}>
        <Pressable accessibilityElementsHidden accessible={false} onPress={onCancel} style={[styles.scrim, { backgroundColor: tokens.colors.scrim }]} />
        <View
          accessibilityRole="alert"
          style={[
            styles.dialog,
            {
              backgroundColor: tokens.colors.surfaceRaised,
              borderColor: tokens.colors.borderStrong,
              borderRadius: tokens.radius.lg,
            },
            tokens.elevation.level3,
            style,
          ]}
          testID={testID}
        >
          <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>{title}</Text>
          <Text style={[tokens.typography.body, styles.message, { color: tokens.colors.textSecondary }]}>
            {message}
          </Text>
          <View style={styles.actions}>
            <Button label={cancelLabel} onPress={onCancel} variant="tertiary" />
            <Button
              label={confirmLabel}
              loading={loading}
              onPress={onConfirm}
              variant={destructive ? 'destructive' : 'primary'}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  scrim: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  dialog: {
    gap: 12,
    maxWidth: 520,
    padding: 20,
    width: '100%',
  },
  message: {
    marginTop: 4,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
});
