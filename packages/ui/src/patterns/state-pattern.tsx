import type { ReactNode } from 'react';

import { OfflineBanner } from '../components/offline-banner';
import { Skeleton } from '../components/skeleton';

export type ResourceStatus = 'loading' | 'empty' | 'offline' | 'error' | 'ready';

interface ResourceStateBaseProps {
  children: ReactNode;
  loading?: ReactNode;
  offline?: ReactNode;
}

export type ResourceStateProps =
  | (ResourceStateBaseProps & { status: 'loading' })
  | (ResourceStateBaseProps & { status: 'empty'; empty: ReactNode })
  | (ResourceStateBaseProps & { status: 'offline' })
  | (ResourceStateBaseProps & { status: 'error'; error: ReactNode })
  | (ResourceStateBaseProps & { status: 'ready' });

export function ResourceState(props: ResourceStateProps): ReactNode {
  if (props.status === 'loading') {
    return props.loading ?? <Skeleton />;
  }
  if (props.status === 'empty') {
    return props.empty;
  }
  if (props.status === 'offline') {
    return props.offline ?? <OfflineBanner />;
  }
  if (props.status === 'error') {
    return props.error;
  }
  return props.children;
}
