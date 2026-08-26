import { router } from 'expo-router';
import { useMemo } from 'react';

import { CategoriesWireframe } from '../../src/screens/categories/categories-wireframe';
import { createCategoriesFixture } from '../../src/screens/categories/categories-fixture';

export default function CategoriesRoute() {
  const fixture = useMemo(() => createCategoriesFixture(), []);
  return <CategoriesWireframe fixture={fixture} onBack={() => router.back()} />;
}
