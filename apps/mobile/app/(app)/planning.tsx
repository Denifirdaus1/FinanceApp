import { router } from 'expo-router';
import { Button } from '@financeapp/ui';
import { StyleSheet, View } from 'react-native';

import { NavigationPlaceholder } from '../../src/screens/navigation-placeholder';

export default function PlanningScreen() {
  return (
    <View style={styles.container}>
      <NavigationPlaceholder
        title="Planning"
        description="Planning fixture siap untuk pengaturan multi-currency."
      />
      <Button label="Open multi-currency" onPress={() => router.push('/planning/currency')} />
      <Button label="Open budgets" onPress={() => router.push('/planning/budgets')} />
      <Button label="Open goals" onPress={() => router.push('/planning/goals')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
