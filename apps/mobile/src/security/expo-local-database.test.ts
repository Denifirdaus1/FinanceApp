import { File } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

import {
  ExpoDatabaseKeyVault,
  ExpoSqlCipherDatabase,
  LOCAL_DATABASE_NAME,
  LocalDatabaseConfigurationError,
  generateSqlCipherKey,
} from './expo-local-database';

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 7,
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(),
}));
jest.mock('expo-sqlite', () => ({
  defaultDatabaseDirectory: 'file:///local-database',
  openDatabaseAsync: jest.fn(),
  deleteDatabaseAsync: jest.fn(),
}));
jest.mock('expo-file-system', () => ({
  File: jest.fn(() => ({ exists: true })),
}));

const mockSecureStore = {
  getItemAsync: jest.mocked(SecureStore.getItemAsync),
  setItemAsync: jest.mocked(SecureStore.setItemAsync),
  deleteItemAsync: jest.mocked(SecureStore.deleteItemAsync),
};
const mockGetRandomBytesAsync = jest.mocked(Crypto.getRandomBytesAsync);
const mockSqlite = {
  openDatabaseAsync: jest.mocked(SQLite.openDatabaseAsync),
  deleteDatabaseAsync: jest.mocked(SQLite.deleteDatabaseAsync),
};
const mockFile = jest.mocked(File);
const mockDatabase = {
  execAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  closeAsync: jest.fn(),
};

describe('Expo SQLCipher adapters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFile.mockImplementation(() => ({ exists: true }) as InstanceType<typeof File>);
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
    mockSqlite.openDatabaseAsync.mockResolvedValue(
      mockDatabase as unknown as SQLite.SQLiteDatabase,
    );
    mockSqlite.deleteDatabaseAsync.mockResolvedValue(undefined);
    mockDatabase.execAsync.mockResolvedValue(undefined);
    mockDatabase.getFirstAsync
      .mockResolvedValueOnce({ table_count: 0 })
      .mockResolvedValueOnce({ quick_check: 'ok' });
    mockDatabase.closeAsync.mockResolvedValue(undefined);
  });

  it('generates a 256-bit key through the native asynchronous CSPRNG', async () => {
    mockGetRandomBytesAsync.mockResolvedValue(Uint8Array.from({ length: 32 }, (_, index) => index));
    await expect(generateSqlCipherKey()).resolves.toBe(
      '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
    );
    expect(mockGetRandomBytesAsync).toHaveBeenCalledWith(32);
  });

  it('uses one non-migratable SecureStore service for read, write, and delete', async () => {
    const vault = new ExpoDatabaseKeyVault();
    await vault.read();
    await vault.write('a'.repeat(64));
    await vault.delete();

    const options = {
      keychainService: 'id.financeapp.sqlcipher.install-key',
      keychainAccessible: 7,
      requireAuthentication: false,
    };
    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(
      'financeapp.sqlcipher.install-key.v1',
      options,
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'financeapp.sqlcipher.install-key.v1',
      'a'.repeat(64),
      options,
    );
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'financeapp.sqlcipher.install-key.v1',
      options,
    );
  });

  it('sets the key first, applies hardening pragmas, and verifies integrity', async () => {
    const driver = new ExpoSqlCipherDatabase();
    const connection = await driver.open();
    await connection.configure('a'.repeat(64));
    await connection.verify();

    expect(mockSqlite.openDatabaseAsync).toHaveBeenCalledWith(LOCAL_DATABASE_NAME);
    expect(mockDatabase.execAsync.mock.calls[0]?.[0]).toBe(`PRAGMA key = '${'a'.repeat(64)}'`);
    expect(mockDatabase.execAsync.mock.calls[1]?.[0]).toContain('cipher_memory_security = ON');
    expect(mockDatabase.execAsync.mock.calls[1]?.[0]).toContain('secure_delete = ON');
    expect(mockDatabase.getFirstAsync).toHaveBeenNthCalledWith(
      1,
      'SELECT count(*) AS table_count FROM sqlite_master',
    );
    expect(mockDatabase.getFirstAsync).toHaveBeenNthCalledWith(2, 'PRAGMA quick_check');
  });

  it('rejects invalid key material before sending SQL to the database', async () => {
    const connection = await new ExpoSqlCipherDatabase().open();
    await expect(connection.configure("bad-key' OR 1=1")).rejects.toBeInstanceOf(
      LocalDatabaseConfigurationError,
    );
    expect(mockDatabase.execAsync).not.toHaveBeenCalled();
  });

  it('checkpoints before close and deletes only an existing database file', async () => {
    const driver = new ExpoSqlCipherDatabase();
    const connection = await driver.open();
    await connection.close();
    await driver.close();
    await driver.delete();
    expect(mockDatabase.execAsync).toHaveBeenCalledWith('PRAGMA wal_checkpoint(TRUNCATE)');
    expect(mockDatabase.closeAsync).toHaveBeenCalledTimes(1);
    expect(mockSqlite.deleteDatabaseAsync).toHaveBeenCalledWith(LOCAL_DATABASE_NAME);

    mockFile.mockImplementation(() => ({ exists: false }) as InstanceType<typeof File>);
    await driver.delete();
    expect(mockSqlite.deleteDatabaseAsync).toHaveBeenCalledTimes(1);
  });
});
