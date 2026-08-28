import { router } from 'expo-router';

import { ImportExportWireframe } from '../../../src/screens/import-export/import-export-wireframe';

export default function ImportExportScreen() {
  return <ImportExportWireframe onBack={() => router.back()} />;
}
