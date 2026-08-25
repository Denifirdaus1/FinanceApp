import { ROUTE_MANIFEST, type RouteManifestEntry } from '../../navigation/route-manifest';

export type ScreenCatalogEntry = RouteManifestEntry;

export const SCREEN_CATALOG: readonly ScreenCatalogEntry[] = ROUTE_MANIFEST.map((entry) => ({
  ...entry,
}));
