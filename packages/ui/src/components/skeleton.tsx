import { useEffect, useState } from 'react';
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
  height,
  borderRadius,
  animate = true,
  style,
  testID,
}: SkeletonProps) {
  const { tokens } = useTheme();
  const reducedMotion = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(tokens.interaction.skeletonBaseOpacity));
  const resolvedHeight = height ?? tokens.componentMetrics.skeletonDefaultHeight;

  useEffect(() => {
    if (!animate || reducedMotion) {
      opacity.stopAnimation();
      opacity.setValue(tokens.interaction.skeletonBaseOpacity);
      return undefined;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: tokens.motion.slow.duration,
          toValue: tokens.interaction.skeletonLowOpacity,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: tokens.motion.slow.duration,
          toValue: tokens.interaction.skeletonBaseOpacity,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [animate, opacity, reducedMotion, tokens.interaction, tokens.motion.slow.duration]);

  const skeletonStyle = [
    styles.skeleton,
    {
      backgroundColor: tokens.colors.skeleton,
      borderRadius: borderRadius ?? tokens.radius.sm,
      height: resolvedHeight,
      width,
    },
    style,
  ];
  const accessibilityProps = {
    accessible: true,
    accessibilityLabel: 'Memuat',
    accessibilityRole: 'progressbar',
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
