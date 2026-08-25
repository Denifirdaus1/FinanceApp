import { fireEvent, render, screen } from '@testing-library/react-native';

import { router } from 'expo-router';

import {
  BOTTOM_TABS,
  FEATURE_IDS,
  READINESS_STATUSES,
  ROUTE_MANIFEST,
} from '../route-manifest';
import {
  DEEP_LINK_TYPES,
  resolveDeepLink,
  resolveDeepLinkUrl,
} from '../deep-links';
import { CaptureAction, createMockCaptureResult } from '../capture-action';
import { SCREEN_CATALOG } from '../../screens/screen-catalog/screen-catalog';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('@financeapp/ui', () => ({
  Button: (props: {
    accessibilityHint?: string;
    accessibilityLabel?: string;
    label: string;
    onPress?: () => void;
  }) => {
    const React = require('react');
    const { Pressable: MockPressable, Text: MockText } = require('react-native');
    return React.createElement(
      MockPressable,
      {
        accessibilityHint: props.accessibilityHint,
        accessibilityLabel: props.accessibilityLabel,
        accessibilityRole: 'button',
        onPress: props.onPress,
      },
      React.createElement(MockText, null, props.label),
    );
  },
}));

describe('U01 navigation foundation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('covers F01-F24 with unique feature IDs and route paths', () => {
    expect(ROUTE_MANIFEST).toHaveLength(24);
    expect(ROUTE_MANIFEST.map((entry) => entry.featureId)).toEqual(FEATURE_IDS);
    expect(new Set(ROUTE_MANIFEST.map((entry) => entry.featureId)).size).toBe(24);
    expect(new Set(ROUTE_MANIFEST.map((entry) => entry.routeId)).size).toBe(24);
    expect(new Set(ROUTE_MANIFEST.map((entry) => entry.path)).size).toBe(24);
    expect(
      ROUTE_MANIFEST.every(
        (entry) =>
          entry.title.length > 0 &&
          entry.navigationGroup.length > 0 &&
          READINESS_STATUSES.includes(entry.readiness),
      ),
    ).toBe(true);
  });

  it('keeps the five primary tabs in the product order', () => {
    expect(BOTTOM_TABS.map((tab) => tab.label)).toEqual([
      'Home',
      'Transactions',
      'Planning',
      'Reports',
      'Profile',
    ]);
    expect(BOTTOM_TABS.map((tab) => tab.path)).toEqual([
      '/',
      '/transactions',
      '/planning',
      '/reports',
      '/profile',
    ]);
    expect(BOTTOM_TABS.every((tab) => tab.isPrimaryTab)).toBe(true);
  });

  it('makes the global capture action accessible and deterministic', () => {
    const onResult = jest.fn();

    render(<CaptureAction onResult={onResult} />);

    const action = screen.getByRole('button', { name: 'Add transaction' });
    expect(action.props.accessibilityHint).toBe('Opens the deterministic transaction fixture flow');

    fireEvent.press(action);

    expect(router.push).toHaveBeenCalledWith('/capture');
    expect(onResult).toHaveBeenCalledWith(createMockCaptureResult());
  });

  it('resolves every supported deep-link type without putting the reference in its path', () => {
    const expectedTargets = {
      transaction: 'transactions',
      receipt: 'receipt-capture',
      'recurring-item': 'recurring',
      notification: 'notifications',
      connection: 'connections',
      'household-invite': 'household',
    } as const;

    for (const type of DEEP_LINK_TYPES) {
      const resolved = resolveDeepLink(type, 'opaque_ref_123');
      expect(resolved).toMatchObject({
        type,
        targetRouteId: expectedTargets[type],
        referenceId: 'opaque_ref_123',
      });
      expect(resolved?.path).not.toContain('opaque_ref_123');
    }
  });

  it('rejects invalid or malformed deep links safely', () => {
    expect(resolveDeepLink('unknown', 'opaque_ref_123')).toBeNull();
    expect(resolveDeepLink('transaction', '')).toBeNull();
    expect(resolveDeepLink('transaction', '../private')).toBeNull();
    expect(resolveDeepLinkUrl('not-a-url')).toBeNull();
    expect(resolveDeepLinkUrl('financeapp://transaction/')).toBeNull();
    expect(resolveDeepLinkUrl('financeapp://transaction/opaque_ref_123?amount=999')).toBeNull();
    expect(resolveDeepLinkUrl('financeapp://unknown/opaque_ref_123')).toBeNull();
  });

  it('catalogs every manifest route with a valid readiness status', () => {
    expect(SCREEN_CATALOG).toHaveLength(ROUTE_MANIFEST.length);
    expect(SCREEN_CATALOG.map((entry) => entry.routeId)).toEqual(
      ROUTE_MANIFEST.map((entry) => entry.routeId),
    );
    expect(
      SCREEN_CATALOG.every((entry) => READINESS_STATUSES.includes(entry.readiness)),
    ).toBe(true);
  });
});
