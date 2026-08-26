import { router } from 'expo-router';
import { TransactionsWireframe } from '../../src/screens/transactions/transactions-wireframe';

export default function CaptureScreen() {
  return (
    <TransactionsWireframe
      initialMode="quick_add"
      onBack={() => router.back()}
      onOpenReceipt={() => router.push('/receipt-capture')}
    />
  );
}
