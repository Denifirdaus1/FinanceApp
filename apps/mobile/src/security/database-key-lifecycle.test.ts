import {
  DatabaseKeyLifecycle,
  type DatabaseFileLifecycle,
  type DatabaseKeyVault,
} from './database-key-lifecycle';

function createHarness(options: { key?: string | null; databaseExists?: boolean } = {}) {
  const calls: string[] = [];
  let key = options.key ?? null;
  let databaseExists = options.databaseExists ?? false;
  const vault: DatabaseKeyVault = {
    read: jest.fn(async () => key),
    write: jest.fn(async (next) => {
      calls.push('key:write');
      key = next;
    }),
    delete: jest.fn(async () => {
      calls.push('key:delete');
      key = null;
    }),
  };
  const database: DatabaseFileLifecycle = {
    exists: jest.fn(async () => databaseExists),
    close: jest.fn(async () => {
      calls.push('db:close');
    }),
    delete: jest.fn(async () => {
      calls.push('db:delete');
      databaseExists = false;
    }),
  };
  const generateKey = jest.fn(async () => 'a'.repeat(64));
  return {
    calls,
    vault,
    database,
    generateKey,
    lifecycle: new DatabaseKeyLifecycle(vault, database, generateKey),
  };
}

describe('per-install database key lifecycle', () => {
  it('reuses an existing valid install key', async () => {
    const harness = createHarness({ key: 'b'.repeat(64), databaseExists: true });
    await expect(harness.lifecycle.acquire()).resolves.toEqual({
      key: 'b'.repeat(64),
      disposition: 'existing',
    });
    expect(harness.generateKey).not.toHaveBeenCalled();
    expect(harness.database.delete).not.toHaveBeenCalled();
  });

  it('rotates a stale iOS Keychain value when the app database no longer exists', async () => {
    const harness = createHarness({ key: 'b'.repeat(64), databaseExists: false });
    await expect(harness.lifecycle.acquire()).resolves.toEqual({
      key: 'a'.repeat(64),
      disposition: 'created',
    });
    expect(harness.calls).toEqual(['key:delete', 'key:write']);
  });

  it('purges an unreadable database before replacing a lost key', async () => {
    const harness = createHarness({ key: null, databaseExists: true });
    await expect(harness.lifecycle.acquire()).resolves.toEqual({
      key: 'a'.repeat(64),
      disposition: 'recovered_key_loss',
    });
    expect(harness.calls).toEqual(['db:close', 'db:delete', 'key:delete', 'key:write']);
  });

  it.each(['logout', 'account_deleted'] as const)(
    'purges the database before the key for %s',
    async (reason) => {
      const harness = createHarness({ key: 'b'.repeat(64), databaseExists: true });
      await harness.lifecycle.purge(reason);
      expect(harness.calls).toEqual(['db:close', 'db:delete', 'key:delete']);
    },
  );

  it('fails closed when generated key material is invalid', async () => {
    const harness = createHarness();
    harness.generateKey.mockResolvedValue('not-a-sqlcipher-key');
    await expect(harness.lifecycle.acquire()).rejects.toThrow('key material');
    expect(harness.vault.write).not.toHaveBeenCalled();
  });
});
