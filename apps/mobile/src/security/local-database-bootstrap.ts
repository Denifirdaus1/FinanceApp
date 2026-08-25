import { DatabaseKeyLifecycle, type DatabaseKeyDisposition } from './database-key-lifecycle';

export interface LocalDatabaseConnection {
  configure(key: string): Promise<void>;
  verify(): Promise<void>;
  close(): Promise<void>;
}

export interface LocalDatabaseDriver {
  open(): Promise<LocalDatabaseConnection>;
}

export type LocalDatabaseBootResult =
  | Readonly<{
      status: 'ready';
      offline: boolean;
      recovery: 'none' | 'key_loss' | 'database_corrupted';
      connection: LocalDatabaseConnection;
    }>
  | Readonly<{
      status: 'purged';
      offline: boolean;
      recovery: 'logout' | 'session_revoked';
    }>;

export class LocalDatabaseUnavailableError extends Error {
  constructor() {
    super('Local encrypted database is unavailable');
    this.name = 'LocalDatabaseUnavailableError';
  }
}

function acquisitionRecovery(disposition: DatabaseKeyDisposition): 'none' | 'key_loss' {
  return disposition === 'recovered_key_loss' ? 'key_loss' : 'none';
}

export class LocalDatabaseBootstrap {
  constructor(
    private readonly keyLifecycle: DatabaseKeyLifecycle,
    private readonly driver: LocalDatabaseDriver,
  ) {}

  async boot(input: {
    sessionStatus: 'signedIn' | 'signedOut' | 'revoked';
    offline: boolean;
  }): Promise<LocalDatabaseBootResult> {
    if (input.sessionStatus !== 'signedIn') {
      const revoked = input.sessionStatus === 'revoked';
      try {
        await this.keyLifecycle.purge(revoked ? 'session_revoked' : 'logout');
      } catch {
        throw new LocalDatabaseUnavailableError();
      }
      return Object.freeze({
        status: 'purged' as const,
        offline: input.offline,
        recovery: revoked ? ('session_revoked' as const) : ('logout' as const),
      });
    }

    let acquisition;
    try {
      acquisition = await this.keyLifecycle.acquire();
    } catch {
      throw new LocalDatabaseUnavailableError();
    }
    try {
      const connection = await this.openAndVerify(acquisition.key);
      return Object.freeze({
        status: 'ready' as const,
        offline: input.offline,
        recovery: acquisitionRecovery(acquisition.disposition),
        connection,
      });
    } catch {
      return this.recoverCorruptedDatabase(input.offline);
    }
  }

  private async openAndVerify(key: string): Promise<LocalDatabaseConnection> {
    let connection: LocalDatabaseConnection | null = null;
    try {
      connection = await this.driver.open();
      await connection.configure(key);
      await connection.verify();
      return connection;
    } catch (error) {
      await connection?.close().catch(() => undefined);
      throw error;
    }
  }

  private async recoverCorruptedDatabase(offline: boolean): Promise<LocalDatabaseBootResult> {
    try {
      await this.keyLifecycle.purge('database_corrupted');
      const replacement = await this.keyLifecycle.acquire();
      const connection = await this.openAndVerify(replacement.key);
      return Object.freeze({
        status: 'ready' as const,
        offline,
        recovery: 'database_corrupted' as const,
        connection,
      });
    } catch {
      await this.keyLifecycle.purge('database_corrupted').catch(() => undefined);
      throw new LocalDatabaseUnavailableError();
    }
  }
}
