import type { RoutePath } from './route-manifest';

export const DEEP_LINK_TYPES = [
  'transaction',
  'receipt',
  'recurring-item',
  'notification',
  'connection',
  'household-invite',
] as const;

export type DeepLinkType = (typeof DEEP_LINK_TYPES)[number];

interface DeepLinkConfig {
  targetRouteId: string;
  path: RoutePath;
}

export const DEEP_LINK_MAP = {
  transaction: { targetRouteId: 'transactions', path: '/transactions' },
  receipt: { targetRouteId: 'receipt-capture', path: '/receipt-capture' },
  'recurring-item': { targetRouteId: 'recurring', path: '/planning/recurring' },
  notification: { targetRouteId: 'notifications', path: '/notifications' },
  connection: { targetRouteId: 'connections', path: '/profile/connections' },
  'household-invite': { targetRouteId: 'household', path: '/profile/household' },
} as const satisfies Record<DeepLinkType, DeepLinkConfig>;

export interface ResolvedDeepLink extends DeepLinkConfig {
  type: DeepLinkType;
  referenceId: string;
}

const SAFE_REFERENCE_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function resolveDeepLink(type: string, referenceId: string): ResolvedDeepLink | null {
  if (!DEEP_LINK_TYPES.includes(type as DeepLinkType) || !SAFE_REFERENCE_ID.test(referenceId)) {
    return null;
  }

  const deepLinkType = type as DeepLinkType;
  return {
    ...DEEP_LINK_MAP[deepLinkType],
    type: deepLinkType,
    referenceId,
  };
}

export function resolveDeepLinkUrl(value: string): ResolvedDeepLink | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) {
    return null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'financeapp:' || parsed.search || parsed.hash) {
      return null;
    }

    const pathSegments = parsed.pathname.split('/').filter(Boolean);
    const typeSegment = parsed.hostname || pathSegments.shift();
    const referenceId = pathSegments.shift();

    if (pathSegments.length > 0 || !typeSegment || !referenceId) {
      return null;
    }

    return resolveDeepLink(typeSegment, referenceId);
  } catch {
    return null;
  }
}
