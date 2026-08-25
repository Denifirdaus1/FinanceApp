import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../app/providers/theme-provider';

export interface NavigationPlaceholderProps {
  title: string;
  description: string;
}

export function NavigationPlaceholder({ title, description }: NavigationPlaceholderProps) {
  const { tokens } = useTheme();

  return (
    <View
      accessibilityLabel={`${title} screen`}
      style={[
        styles.container,
        { backgroundColor: tokens.colors.canvas, padding: tokens.spacing.space6 },
      ]}
    >
      <Text style={[tokens.typography.heading1, { color: tokens.colors.textPrimary }]}>
        {title}
      </Text>
      <Text
        style={[
          tokens.typography.bodyLarge,
          { color: tokens.colors.textSecondary, marginTop: tokens.spacing.space2 },
        ]}
      >
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
});
