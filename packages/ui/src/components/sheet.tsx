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
import { useContext, type ReactNode } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

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
  safeAreaBottomInset,
  style,
  testID,
}: SheetProps) {
  const { tokens } = useTheme();
  const reducedMotion = useReducedMotion();
  const safeAreaInsets = useContext(SafeAreaInsetsContext);
  const bottomInset = safeAreaBottomInset ?? safeAreaInsets?.bottom ?? 0;

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
        <Pressable
          accessibilityElementsHidden
          accessible={false}
          onPress={onClose}
          style={[styles.scrim, { backgroundColor: tokens.colors.scrim }]}
        />
        <View
          accessibilityViewIsModal
          style={[
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.borderSubtle,
              borderTopLeftRadius: tokens.radius.xl,
              borderTopRightRadius: tokens.radius.xl,
              borderTopWidth: tokens.stroke.hairline,
              maxHeight: tokens.componentMetrics.sheetMaxHeight,
              paddingBottom: tokens.spacing.space4 + bottomInset,
              paddingHorizontal: tokens.spacing.space5,
              paddingTop: tokens.spacing.space3,
            },
            tokens.elevation.level3,
            style,
          ]}
          testID={testID}
        >
          <View
            style={[
              styles.header,
              {
                gap: tokens.componentMetrics.cardContentGap,
                minHeight: tokens.interaction.buttonHeight,
              },
            ]}
          >
            <Text
              accessibilityRole="header"
              style={[
                tokens.typography.heading3,
                { color: tokens.colors.textPrimary, flexShrink: 1, minWidth: 0 },
              ]}
            >
              {title}
            </Text>
            <Button label={closeLabel} onPress={onClose} variant="tertiary" />
          </View>
          <ScrollView
            contentContainerStyle={[
              {
                gap: tokens.spacing.space4,
                paddingBottom: tokens.spacing.space4,
                paddingTop: tokens.spacing.space2,
              },
            ]}
            keyboardShouldPersistTaps="handled"
          >
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
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
