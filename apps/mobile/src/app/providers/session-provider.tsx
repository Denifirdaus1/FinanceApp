import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { SessionAdapter, SessionState } from '../session/session-facade';
import { defaultSessionAdapter } from '../session/fake-session-adapter';

export interface SessionContextValue {
  state: SessionState;
  retry: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export interface SessionProviderProps {
  adapter?: SessionAdapter;
  children: ReactNode;
}

export function SessionProvider({
  adapter = defaultSessionAdapter,
  children,
}: SessionProviderProps) {
  const [state, setState] = useState<SessionState>({
    status: 'loading',
    user: null,
    offline: false,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    adapter
      .bootstrap()
      .then((next) => {
        if (!cancelled) {
          setState(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: 'error', user: null, offline: adapter.getOffline() });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [adapter, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading', user: null, offline: false });
    setAttempt((current) => current + 1);
  }, []);

  const value = useMemo(() => ({ state, retry }), [state, retry]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}
