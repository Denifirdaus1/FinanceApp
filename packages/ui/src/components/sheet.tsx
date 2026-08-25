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
import type { ReactNode } from 'react';

import { Button } from './button';
import { useReducedMotion, useTheme } from './theme-provider';

export interface SheetProps {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  safeAreaBottomInset?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Sheet({
  visible,
  title,
  children,
  onClose,
  closeLabel = 'Tutup',
  safeAreaBottomInset = 0,
  style,
  testID,
}: SheetProps) {
  const { tokens } = useTheme();
  const reducedMotion = useReducedMotion();

  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible
    >
      <View style={styles.modalRoot}>
        <Pressable accessibilityElementsHidden accessible={false} onPress={onClose} style={[styles.scrim, { backgroundColor: tokens.colors.scrim }]} />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.borderSubtle,
              borderTopLeftRadius: tokens.radius.xl,
              borderTopRightRadius: tokens.radius.xl,
              paddingBottom: tokens.spacing.space4 + safeAreaBottomInset,
            },
            tokens.elevation.level3,
            style,
          ]}
          testID={testID}
        >
          <View style={styles.header}>
            <Text style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>{title}</Text>
            <Button label={closeLabel} onPress={onClose} variant="tertiary" />
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheet: {
    borderTopWidth: 1,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 52,
  },
  content: {
    gap: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
});
