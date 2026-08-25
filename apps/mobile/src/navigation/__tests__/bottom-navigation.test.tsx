import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';

import { router } from 'expo-router';

import { BottomNavigation } from '../bottom-navigation';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement(View, props, children),
  };
});

jest.mock('@financeapp/ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const tokens = {
    colors: {
      borderSubtle: '#DDD',
      onPrimaryContainer: '#111',
      primaryContainer: '#EEE',
      surfaceRaised: '#FFF',
      textSecondary: '#555',
    },
    icon: { medium: 24 },
    spacing: { space0: 0, space1: 4, space2: 8 },
    typography: { label: {} },
  };

  return {
    Button: (props: {
      accessibilityHint?: string;
      accessibilityLabel?: string;
      label: string;
      onPress?: () => void;
      children?: React.ReactNode;
    }) =>
      React.createElement(
        Pressable,
        {
          accessibilityHint: props.accessibilityHint,
          accessibilityLabel: props.accessibilityLabel,
          accessibilityRole: 'button',
          onPress: props.onPress,
        },
        props.children ?? React.createElement(Text, null, props.label),
      ),
    useTheme: () => ({ tokens }),
  };
});

describe('BottomNavigation', () => {
  it('exposes five accessible tabs and a separate capture action', () => {
    const navigation = {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate: jest.fn(),
    } as unknown as BottomTabBarProps['navigation'];
    const state = {
      index: 0,
      routes: [
        { key: 'index-key', name: 'index' },
        { key: 'transactions-key', name: 'transactions' },
        { key: 'planning-key', name: 'planning' },
        { key: 'reports-key', name: 'reports' },
        { key: 'profile-key', name: 'profile' },
        { key: 'capture-key', name: 'capture' },
      ],
    } as BottomTabBarProps['state'];

    render(
      <BottomNavigation
        descriptors={{} as BottomTabBarProps['descriptors']}
        insets={{ bottom: 0, left: 0, right: 0, top: 0 }}
        navigation={navigation}
        state={state}
      />,
    );

    expect(screen.getByRole('button', { name: 'Home tab' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Transactions tab' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Planning tab' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reports tab' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Profile tab' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add transaction' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Home tab' }).props.accessibilityHint).toBe(
      'Current tab',
    );
  });

  it('navigates a tab through the Expo Router navigation contract', () => {
    const navigation = {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate: jest.fn(),
    } as unknown as BottomTabBarProps['navigation'];
    const state = {
      index: 0,
      routes: [
        { key: 'index-key', name: 'index' },
        { key: 'transactions-key', name: 'transactions' },
        { key: 'planning-key', name: 'planning' },
        { key: 'reports-key', name: 'reports' },
        { key: 'profile-key', name: 'profile' },
      ],
    } as BottomTabBarProps['state'];

    render(
      <BottomNavigation
        descriptors={{} as BottomTabBarProps['descriptors']}
        insets={{ bottom: 0, left: 0, right: 0, top: 0 }}
        navigation={navigation}
        state={state}
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Transactions tab' }));

    expect(navigation.emit).toHaveBeenCalledWith({
      canPreventDefault: true,
      target: 'transactions-key',
      type: 'tabPress',
    });
    expect(navigation.navigate).toHaveBeenCalledWith('transactions');
    fireEvent.press(screen.getByRole('button', { name: 'Add transaction' }));
    expect(router.push).toHaveBeenCalledWith('/capture');
  });
});
