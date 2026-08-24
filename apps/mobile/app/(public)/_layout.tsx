import { Redirect, Stack } from 'expo-router';

import { useSession } from '../../src/app/providers/session-provider';

export default function PublicLayout() {
  const { state } = useSession();
  if (state.status === 'signedIn') {
    return <Redirect href="/(app)" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
