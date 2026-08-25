import { File } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

import type { DatabaseFileLifecycle, DatabaseKeyVault } from './database-key-lifecycle';
import type { LocalDatabaseConnection, LocalDatabaseDriver } from './local-database-bootstrap';

export const LOCAL_DATABASE_NAME = 'financeapp-local.db';
const DATABASE_KEY_NAME = 'financeapp.sqlcipher.install-key.v1';
const DATABASE_KEY_SERVICE = 'id.financeapp.sqlcipher.install-key';
const SQLCIPHER_KEY = /^[0-9a-f]{64}$/;

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: DATABASE_KEY_SERVICE,
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  requireAuthentication: false,
};

export class ExpoDatabaseKeyVault implements DatabaseKeyVault {
  read(): Promise<string | null> {
    return SecureStore.getItemAsync(DATABASE_KEY_NAME, SECURE_STORE_OPTIONS);
  }

  write(key: string): Promise<void> {
    return SecureStore.setItemAsync(DATABASE_KEY_NAME, key, SECURE_STORE_OPTIONS);
  }

  delete(): Promise<void> {
    return SecureStore.deleteItemAsync(DATABASE_KEY_NAME, SECURE_STORE_OPTIONS);
  }
}

export async function generateSqlCipherKey(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

class ExpoLocalDatabaseConnection implements LocalDatabaseConnection {
  private closed = false;

  constructor(private readonly database: SQLite.SQLiteDatabase) {}

  async configure(key: string): Promise<void> {
    if (!SQLCIPHER_KEY.test(key)) {
      throw new LocalDatabaseConfigurationError();
    }
    await this.database.execAsync(`PRAGMA key = '${key}'`);
    await this.database.execAsync(
      'PRAGMA cipher_memory_security = ON; PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA secure_delete = ON;',
    );
  }

  async verify(): Promise<void> {
    await this.database.getFirstAsync('SELECT count(*) AS table_count FROM sqlite_master');
    const integrity =
      await this.database.getFirstAsync<Record<string, unknown>>('PRAGMA quick_check');
    if (!integrity || !Object.values(integrity).includes('ok')) {
      throw new LocalDatabaseConfigurationError();
    }
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    await this.database.execAsync('PRAGMA wal_checkpoint(TRUNCATE)').catch(() => undefined);
    await this.database.closeAsync();
    this.closed = true;
  }
}

export class LocalDatabaseConfigurationError extends Error {
  constructor() {
    super('Encrypted local database configuration failed');
    this.name = 'LocalDatabaseConfigurationError';
  }
}

export class ExpoSqlCipherDatabase implements LocalDatabaseDriver, DatabaseFileLifecycle {
  private current: LocalDatabaseConnection | null = null;

  async open(): Promise<LocalDatabaseConnection> {
    const database = await SQLite.openDatabaseAsync(LOCAL_DATABASE_NAME);
    const connection = new ExpoLocalDatabaseConnection(database);
    this.current = connection;
    return connection;
  }

  async exists(): Promise<boolean> {
    const file = new File(SQLite.defaultDatabaseDirectory, LOCAL_DATABASE_NAME);
    return file.exists;
  }

  async close(): Promise<void> {
    const connection = this.current;
    this.current = null;
    await connection?.close();
  }

  async delete(): Promise<void> {
    if (await this.exists()) {
      await SQLite.deleteDatabaseAsync(LOCAL_DATABASE_NAME);
    }
  }
}
