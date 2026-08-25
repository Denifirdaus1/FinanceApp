import {
  Modal,
  Pressable,
  ScrollView,
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
      animationType={reducedMotion ? 'none' : 'fade'}
      onRequestClose={onCancel}
      transparent
      visible
    >
      <View style={[styles.modalRoot, { padding: tokens.spacing.space5 }]}>
        <Pressable
          accessibilityElementsHidden
          accessible={false}
          onPress={onCancel}
          style={[styles.scrim, { backgroundColor: tokens.colors.scrim }]}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.dialog,
            {
              backgroundColor: tokens.colors.surfaceRaised,
              borderColor: tokens.colors.borderStrong,
              borderRadius: tokens.radius.lg,
              gap: tokens.spacing.space3,
              maxHeight: tokens.componentMetrics.dialogMaxHeight,
              maxWidth: tokens.componentMetrics.dialogMaxWidth,
              padding: tokens.spacing.space5,
            },
            tokens.elevation.level3,
            style,
          ]}
          testID={testID}
        >
          <Text
            accessibilityRole="header"
            style={[
              tokens.typography.heading3,
              { color: tokens.colors.textPrimary, flexShrink: 1 },
            ]}
          >
            {title}
          </Text>
          <ScrollView
            contentContainerStyle={{ paddingBottom: tokens.spacing.space1 }}
            keyboardShouldPersistTaps="handled"
            style={{ flexShrink: 1, maxHeight: tokens.componentMetrics.dialogBodyMaxHeight }}
          >
            <Text
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}
            >
              {message}
            </Text>
          </ScrollView>
          <View
            style={[
              styles.actions,
              {
                gap: tokens.interaction.minimumAdjacentTargetGap,
                marginTop: tokens.spacing.space1,
                width: '100%',
              },
            ]}
          >
            <Button
              label={cancelLabel}
              onPress={onCancel}
              style={styles.actionButton}
              variant="tertiary"
            />
            <Button
              label={confirmLabel}
              loading={loading}
              onPress={onConfirm}
              style={styles.actionButton}
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
  },
  scrim: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  dialog: {
    width: '100%',
  },
  actionButton: {
    flexShrink: 1,
    maxWidth: '100%',
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
});
