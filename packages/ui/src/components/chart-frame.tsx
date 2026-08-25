import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
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
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.borderSubtle,
          borderRadius: tokens.radius.lg,
          borderWidth: tokens.stroke.hairline,
          gap: tokens.componentMetrics.cardContentGap,
          padding: tokens.spacing.space4,
        },
        tokens.elevation.level1,
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
        style={[
          tokens.typography.body,
          {
            color: tokens.colors.textSecondary,
            maxWidth: tokens.componentMetrics.chartSummaryMaxWidth,
          },
        ]}
      >
        {privacyHidden ? hiddenSummary : summary}
      </Text>
      {loading ? (
        <Skeleton height={tokens.componentMetrics.chartMinHeight} />
      ) : privacyHidden ? (
        <View
          style={{
            alignItems: 'center',
            backgroundColor: tokens.colors.surfaceMuted,
            justifyContent: 'center',
            minHeight: tokens.componentMetrics.chartMinHeight,
          }}
        >
          <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
            {hiddenSummary}
          </Text>
        </View>
      ) : emptyMessage ? (
        <Text style={[tokens.typography.body, { color: tokens.colors.textSecondary }]}>
          {emptyMessage}
        </Text>
      ) : (
        <View style={{ minHeight: tokens.componentMetrics.chartMinHeight }}>{children}</View>
      )}
      {privacyHidden || !dataTable ? null : (
        <View
          style={[
            {
              borderTopWidth: tokens.stroke.hairline,
              paddingTop: tokens.spacing.space3,
            },
          ]}
        >
          {dataTable}
        </View>
      )}
    </View>
  );
}
