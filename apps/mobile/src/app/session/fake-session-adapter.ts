import type { SessionAdapter, SessionState, SessionUser } from './session-facade';

export class FakeSessionAdapter implements SessionAdapter {
  private status: SessionState['status'] = 'loading';
  private offline = false;
  private failBootstrap = false;
  private user: SessionUser | null = null;

  reset(): void {
    this.status = 'loading';
    this.offline = false;
    this.failBootstrap = false;
    this.user = null;
  }

  setLoading(): void {
    this.status = 'loading';
    this.user = null;
  }

  setSignedOut(): void {
    this.status = 'signedOut';
    this.user = null;
  }

  setSignedIn(user: SessionUser = { id: 'user-fake', displayName: 'Pengguna Uji' }): void {
    this.status = 'signedIn';
    this.user = user;
  }

  setRevoked(): void {
    this.status = 'revoked';
    this.user = null;
  }

  setError(): void {
    this.status = 'error';
    this.user = null;
  }

  setOffline(offline: boolean): void {
    this.offline = offline;
  }

  setFailBootstrap(fail: boolean): void {
    this.failBootstrap = fail;
  }

  getOffline(): boolean {
    return this.offline;
  }

  async bootstrap(): Promise<SessionState> {
    if (this.failBootstrap) {
      throw new Error('fake bootstrap failure');
    }
    return {
      status: this.status,
      user: this.status === 'signedIn' ? this.user : null,
      offline: this.offline,
    };
  }
}

export const defaultSessionAdapter = new FakeSessionAdapter();
