import { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useReducedMotion, useTheme } from './theme-provider';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  animate?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius,
  animate = true,
  style,
  testID,
}: SkeletonProps) {
  const { tokens } = useTheme();
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.65)).current;

  useEffect(() => {
    if (!animate || reducedMotion) {
      opacity.stopAnimation();
      opacity.setValue(1);
      return undefined;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: tokens.motion.slow.duration,
          toValue: 0.35,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: tokens.motion.slow.duration,
          toValue: 0.65,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [animate, opacity, reducedMotion, tokens.motion.slow.duration]);

  const skeletonStyle = [
    styles.skeleton,
    {
      backgroundColor: tokens.colors.skeleton,
      borderRadius: borderRadius ?? tokens.radius.sm,
      height,
      width,
    },
    style,
  ];
  const accessibilityProps = {
    accessibilityLabel: 'Memuat',
    accessibilityState: { busy: true },
    testID,
  } as const;

  if (reducedMotion || !animate) {
    return <View {...accessibilityProps} style={skeletonStyle} />;
  }

  return <Animated.View {...accessibilityProps} style={[skeletonStyle, { opacity }]} />;
}

const styles = StyleSheet.create({
  skeleton: {
    minWidth: 0,
  },
});
