import { Redirect, Tabs } from 'expo-router';

import { useSession } from '../../src/app/providers/session-provider';
import { BottomNavigation } from '../../src/navigation/bottom-navigation';

export default function AppLayout() {
  const { state } = useSession();
  if (state.status !== 'signedIn') {
    return <Redirect href="/(public)" />;
  }
  return (
    <Tabs
      tabBar={(props) => <BottomNavigation {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Tabs.Screen name="transactions/review" options={{ href: null }} />
      <Tabs.Screen name="planning" options={{ title: 'Planning' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
      <Tabs.Screen name="reports/insights" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="profile/import-export" options={{ href: null }} />
      <Tabs.Screen name="profile/connections" options={{ href: null }} />
      <Tabs.Screen name="capture" options={{ href: null }} />
      <Tabs.Screen name="screen-catalog" options={{ href: null }} />
      <Tabs.Screen name="accounts" options={{ href: null }} />
      <Tabs.Screen name="categories" options={{ href: null }} />
      <Tabs.Screen name="transfers" options={{ href: null }} />
      <Tabs.Screen name="planning/currency" options={{ href: null }} />
      <Tabs.Screen name="planning/budgets" options={{ href: null }} />
      <Tabs.Screen name="planning/goals" options={{ href: null }} />
      <Tabs.Screen name="planning/recurring" options={{ href: null }} />
      <Tabs.Screen name="planning/debts" options={{ href: null }} />
      <Tabs.Screen name="planning/forecast" options={{ href: null }} />
      <Tabs.Screen name="sync" options={{ href: null }} />
      <Tabs.Screen name="receipt-capture" options={{ href: null }} />
      <Tabs.Screen name="voice-capture" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
