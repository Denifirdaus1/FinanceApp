import { Redirect, Stack } from 'expo-router';

import { useSession } from '../../src/app/providers/session-provider';

export default function AppLayout() {
  const { state } = useSession();
  if (state.status !== 'signedIn') {
    return <Redirect href="/(public)" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
