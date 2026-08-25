import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';

import { Skeleton } from './skeleton';
import { useTheme } from './theme-provider';

export interface ChartFrameProps {
  title: string;
  summary: string;
  children: ReactNode;
  dataTable?: ReactNode;
  privacyHidden?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ChartFrame({
  title,
  summary,
  children,
  dataTable,
  privacyHidden = false,
  loading = false,
  emptyMessage,
  style,
  testID,
}: ChartFrameProps) {
  const { tokens } = useTheme();
  const hiddenSummary = 'Nominal disembunyikan.';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.borderSubtle,
          borderRadius: tokens.radius.lg,
        },
        tokens.elevation.level1,
        style,
      ]}
      testID={testID}
    >
      <Text accessibilityRole="header" style={[tokens.typography.heading3, { color: tokens.colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[tokens.typography.body, styles.summary, { color: tokens.colors.textSecondary }]}>
        {privacyHidden ? hiddenSummary : summary}
      </Text>
      {loading ? (
        <Skeleton height={160} />
      ) : emptyMessage ? (
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>{emptyMessage}</Text>
      ) : privacyHidden ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.hiddenChart}>
          {children}
        </View>
      ) : (
        <View accessibilityElementsHidden={false} style={styles.chart}>
          {children}
        </View>
      )}
      {privacyHidden ? null : dataTable ? <View style={styles.dataTable}>{dataTable}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  summary: {
    maxWidth: 680,
  },
  chart: {
    minHeight: 160,
  },
  hiddenChart: {
    minHeight: 160,
  },
  dataTable: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
});
