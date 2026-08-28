import { router } from 'expo-router';

import { ReportsWireframe } from '../../src/screens/reports/reports-wireframe';

export default function ReportsScreen() {
  return (
    <ReportsWireframe
      onDrillDown={(route) => router.push(route)}
      onOpenInsights={() => router.push('/reports/insights')}
    />
  );
}
