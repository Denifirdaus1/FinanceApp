export type DatabasePurgeReason =
  'logout' | 'account_deleted' | 'session_revoked' | 'key_lost' | 'database_corrupted';

export interface DatabaseKeyVault {
  read(): Promise<string | null>;
  write(key: string): Promise<void>;
  delete(): Promise<void>;
}

export interface DatabaseFileLifecycle {
  exists(): Promise<boolean>;
  close(): Promise<void>;
  delete(): Promise<void>;
}

export type DatabaseKeyDisposition = 'existing' | 'created' | 'recovered_key_loss';

export interface DatabaseKeyAcquisition {
  key: string;
  disposition: DatabaseKeyDisposition;
}

export type DatabaseKeyGenerator = () => Promise<string>;

const SQLCIPHER_KEY = /^[0-9a-f]{64}$/;

function assertKeyMaterial(key: string): void {
  if (!SQLCIPHER_KEY.test(key)) {
    throw new Error('Invalid database key material');
  }
}

export class DatabaseKeyLifecycle {
  constructor(
    private readonly vault: DatabaseKeyVault,
    private readonly database: DatabaseFileLifecycle,
    private readonly generateKey: DatabaseKeyGenerator,
  ) {}

  async acquire(): Promise<DatabaseKeyAcquisition> {
    const storedKey = await this.vault.read();
    const databaseExists = await this.database.exists();
    if (storedKey && SQLCIPHER_KEY.test(storedKey) && databaseExists) {
      return { key: storedKey, disposition: 'existing' };
    }

    if (storedKey && SQLCIPHER_KEY.test(storedKey) && !databaseExists) {
      await this.vault.delete();
      const key = await this.generateKey();
      assertKeyMaterial(key);
      await this.vault.write(key);
      return { key, disposition: 'created' };
    }

    const recoveredKeyLoss = databaseExists || storedKey !== null;
    if (recoveredKeyLoss) {
      await this.purge('key_lost');
    }

    const key = await this.generateKey();
    assertKeyMaterial(key);
    await this.vault.write(key);
    return { key, disposition: recoveredKeyLoss ? 'recovered_key_loss' : 'created' };
  }

  async purge(_reason: DatabasePurgeReason): Promise<void> {
    await this.database.close();
    await this.database.delete();
    await this.vault.delete();
  }
}
