import { router } from 'expo-router';

import { DashboardWireframe } from '../../src/screens/dashboard/dashboard-wireframe';

export default function AuthenticatedShellScreen() {
  return (
    <DashboardWireframe
      onQuickAction={(route) => router.push(route)}
      onOpenSync={() => router.push('/sync')}
    />
  );
}
