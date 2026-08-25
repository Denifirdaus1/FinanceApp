import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../app/providers/theme-provider';

import { SCREEN_CATALOG } from './screen-catalog';

export function ScreenCatalogScreen() {
  const { tokens } = useTheme();

  return (
    <ScrollView
      accessibilityLabel="Screen catalog"
      contentContainerStyle={{ padding: tokens.spacing.space5 }}
      style={{ backgroundColor: tokens.colors.canvas }}
    >
      <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
        Screen catalog
      </Text>
      <Text
        style={[
          tokens.typography.bodyLarge,
          styles.description,
          { color: tokens.colors.textSecondary, marginTop: tokens.spacing.space2 },
        ]}
      >
        Inventory route F01–F24 untuk fondasi navigasi U01.
      </Text>

      {SCREEN_CATALOG.map((entry) => (
        <View
          key={entry.featureId}
          accessible
          accessibilityLabel={`${entry.featureId}, ${entry.title}, ${entry.readiness}`}
          style={[
            {
              backgroundColor: tokens.colors.surfaceRaised,
              borderColor: tokens.colors.borderSubtle,
              borderRadius: tokens.radius.md,
              borderWidth: tokens.stroke.hairline,
              marginTop: tokens.spacing.space3,
              padding: tokens.spacing.space4,
            },
          ]}
        >
          <View>
            <Text style={[tokens.typography.label, { color: tokens.colors.textPrimary }]}>
              {entry.featureId} · {entry.title}
            </Text>
            <Text style={[tokens.typography.label, { color: tokens.colors.primary }]}>
              {entry.readiness}
            </Text>
          </View>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSecondary }]}>
            {entry.path} · {entry.routeId}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  description: {
    maxWidth: 680,
  },
});
