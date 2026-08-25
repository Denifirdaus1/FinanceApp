import { router } from 'expo-router';

import { FinancialProfileWireframe } from '../../../src/screens/financial-profile/financial-profile-wireframe';

export default function FinancialPreferencesRoute() {
  return <FinancialProfileWireframe onBack={() => router.back()} />;
}
