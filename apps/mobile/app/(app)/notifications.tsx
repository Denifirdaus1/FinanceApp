import { router } from 'expo-router';

import { NotificationsWireframe } from '../../src/screens/notifications/notifications-wireframe';

export default function NotificationsScreen() {
  return <NotificationsWireframe onBack={() => router.back()} />;
}
