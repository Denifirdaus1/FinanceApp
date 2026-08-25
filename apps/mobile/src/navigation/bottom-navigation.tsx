import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { Button, useTheme } from '@financeapp/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

import { BOTTOM_TABS } from './route-manifest';
import { CaptureAction } from './capture-action';

export function BottomNavigation({ state, navigation }: BottomTabBarProps) {
  const { tokens } = useTheme();
  const routesByName = new Map(state.routes.map((route) => [route.name, route]));

  return (
    <SafeAreaView edges={['bottom']} style={{ backgroundColor: tokens.colors.surfaceRaised }}>
      <View
        accessibilityLabel="Primary navigation"
        style={[
          styles.bar,
          {
            borderColor: tokens.colors.borderSubtle,
            gap: tokens.spacing.space1,
            paddingHorizontal: tokens.spacing.space2,
            paddingTop: tokens.spacing.space2,
          },
        ]}
      >
        {BOTTOM_TABS.slice(0, 2).map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            route={routesByName.get(tab.screenName)}
            focused={state.routes[state.index]?.name === tab.screenName}
            navigation={navigation}
          />
        ))}

        <CaptureAction />

        {BOTTOM_TABS.slice(2).map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            route={routesByName.get(tab.screenName)}
            focused={state.routes[state.index]?.name === tab.screenName}
            navigation={navigation}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

interface TabButtonProps {
  tab: (typeof BOTTOM_TABS)[number];
  route: BottomTabBarProps['state']['routes'][number] | undefined;
  focused: boolean;
  navigation: BottomTabBarProps['navigation'];
}

function TabButton({ tab, route, focused, navigation }: TabButtonProps) {
  const { tokens } = useTheme();

  if (!route) {
    return null;
  }

  const handlePress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <Button
      accessibilityHint={focused ? 'Current tab' : `Open ${tab.label}`}
      accessibilityLabel={`${tab.label} tab`}
      label={tab.label}
      onPress={handlePress}
      style={[
        styles.tabButton,
        {
          backgroundColor: focused ? tokens.colors.primaryContainer : 'transparent',
        },
      ]}
      variant="icon"
    >
      <View style={[styles.tabContent, { gap: tokens.spacing.space0 }]}>
        <Text
          accessible={false}
          style={[
            styles.icon,
            {
              color: focused ? tokens.colors.onPrimaryContainer : tokens.colors.textSecondary,
              fontSize: tokens.icon.medium,
              lineHeight: tokens.icon.medium,
            },
          ]}
        >
          {tab.icon}
        </Text>
        <Text
          accessible={false}
          style={[
            tokens.typography.label,
            {
              color: focused ? tokens.colors.onPrimaryContainer : tokens.colors.textSecondary,
            },
          ]}
        >
          {tab.label}
        </Text>
      </View>
    </Button>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    includeFontPadding: false,
  },
});
