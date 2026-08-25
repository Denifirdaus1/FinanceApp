import { router } from 'expo-router';

import { AuthBootstrapWireframe } from '../../src/screens/auth/auth-bootstrap-wireframe';

export default function OnboardingRoute() {
  return <AuthBootstrapWireframe onFinancialProfile={() => router.push('/profile/preferences')} />;
}
