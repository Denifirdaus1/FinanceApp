import { router } from 'expo-router';

import { ReceiptCaptureWireframe } from '../../src/screens/receipt/receipt-capture-wireframe';

export default function ReceiptCaptureScreen() {
  return <ReceiptCaptureWireframe onBack={() => router.back()} />;
}
