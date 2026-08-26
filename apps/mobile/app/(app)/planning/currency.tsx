import { router } from 'expo-router';

import { CurrencyWireframe } from '../../../src/screens/currency/currency-wireframe';

export default function CurrencyScreen() {
  return <CurrencyWireframe onBack={() => router.back()} />;
}
