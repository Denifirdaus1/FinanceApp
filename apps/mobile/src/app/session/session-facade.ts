export const SESSION_STATUSES = ['loading', 'signedOut', 'signedIn', 'revoked', 'error'] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export interface SessionUser {
  id: string;
  displayName: string;
}

export interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
  offline: boolean;
}

export interface SessionAdapter {
  bootstrap(): Promise<SessionState>;
  getOffline(): boolean;
}
