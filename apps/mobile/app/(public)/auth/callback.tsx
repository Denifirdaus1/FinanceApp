import { useLocalSearchParams } from 'expo-router';

import {
  AuthBootstrapWireframe,
  type AuthBootstrapWireframeProps,
} from '../../../src/screens/auth/auth-bootstrap-wireframe';
import type { AuthCallbackParams } from '../../../src/screens/auth/auth-bootstrap-fixture';

export default function AuthCallbackRoute() {
  const params = useLocalSearchParams() as AuthCallbackParams;
  const props: AuthBootstrapWireframeProps = { initialCallbackParams: params };

  return <AuthBootstrapWireframe {...props} />;
}
