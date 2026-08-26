import { router } from 'expo-router';
import { useMemo } from 'react';

import { AccountsWireframe } from '../../src/screens/accounts/accounts-wireframe';
import { createAccountsFixture } from '../../src/screens/accounts/accounts-fixture';

export default function AccountsRoute() {
  const fixture = useMemo(() => createAccountsFixture(), []);
  return <AccountsWireframe fixture={fixture} onBack={() => router.back()} />;
}
