import { router } from 'expo-router';

import { ConnectionsWireframe } from '../../../src/screens/connections/connections-wireframe';

export default function ConnectionsScreen() {
  return <ConnectionsWireframe onBack={() => router.back()} />;
}
