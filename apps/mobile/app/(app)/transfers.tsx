import { router } from 'expo-router';

import { TransfersWireframe } from '../../src/screens/transfers/transfers-wireframe';

export default function TransfersScreen() {
  return (
    <TransfersWireframe
      onBack={() => router.back()}
      onOpenCurrency={() => router.push('/planning/currency')}
    />
  );
}
