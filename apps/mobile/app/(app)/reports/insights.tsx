import { router } from 'expo-router';

import { AiInsightsWireframe } from '../../../src/screens/ai-insights/ai-insights-wireframe';

export default function AiInsightsScreen() {
  return (
    <AiInsightsWireframe
      onBack={() => router.back()}
      onOpenReport={() => router.push('/reports')}
    />
  );
}
