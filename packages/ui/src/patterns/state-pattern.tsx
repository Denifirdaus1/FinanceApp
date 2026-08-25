import type { ReactNode } from 'react';

import { EmptyState } from '../components/empty-state';
import { ErrorState } from '../components/error-state';
import { OfflineBanner } from '../components/offline-banner';
import { Skeleton } from '../components/skeleton';

export type ResourceStatus = 'loading' | 'empty' | 'offline' | 'error' | 'ready';

export interface ResourceStateProps {
  status: ResourceStatus;
  children: ReactNode;
  loading?: ReactNode;
  empty?: ReactNode;
  offline?: ReactNode;
  error?: ReactNode;
}

export function ResourceState({
  status,
  children,
  loading = <Skeleton height={96} />,
  empty = (
    <EmptyState
      actionLabel="Tambah data"
      message="Belum ada data untuk ditampilkan."
      onAction={() => undefined}
      title="Belum ada data"
    />
  ),
  offline = <OfflineBanner />,
  error = (
    <ErrorState
      message="Data lokal tetap aman. Coba lagi."
      title="Tidak dapat memuat data"
    />
  ),
}: ResourceStateProps) {
  if (status === 'loading') {
    return loading;
  }
  if (status === 'empty') {
    return empty;
  }
  if (status === 'offline') {
    return offline;
  }
  if (status === 'error') {
    return error;
  }
  return children;
}
