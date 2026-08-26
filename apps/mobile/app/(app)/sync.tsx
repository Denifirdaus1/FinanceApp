import { router } from 'expo-router';

import { SyncWireframe } from '../../src/screens/sync/sync-wireframe';

export default function SyncScreen() {
  return <SyncWireframe onBack={() => router.back()} />;
}
