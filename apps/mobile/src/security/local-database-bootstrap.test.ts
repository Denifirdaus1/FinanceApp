import { DatabaseKeyLifecycle } from './database-key-lifecycle';
import {
  LocalDatabaseBootstrap,
  LocalDatabaseUnavailableError,
  type LocalDatabaseConnection,
  type LocalDatabaseDriver,
} from './local-database-bootstrap';

function createConnection(verify: () => Promise<void>): LocalDatabaseConnection {
  return {
    configure: jest.fn(async () => undefined),
    verify,
    close: jest.fn(async () => undefined),
  };
}

function createHarness() {
  let key: string | null = 'b'.repeat(64);
  let databaseExists = true;
  const file = {
    exists: jest.fn(async () => databaseExists),
    close: jest.fn(async () => undefined),
    delete: jest.fn(async () => {
      databaseExists = false;
    }),
  };
  const vault = {
    read: jest.fn(async () => key),
    write: jest.fn(async (next: string) => {
      key = next;
    }),
    delete: jest.fn(async () => {
      key = null;
    }),
  };
  const generateKey = jest.fn(async () => 'a'.repeat(64));
  const lifecycle = new DatabaseKeyLifecycle(vault, file, generateKey);
  const driver: LocalDatabaseDriver = {
    open: jest.fn(async () => createConnection(async () => undefined)),
  };
  return { driver, file, generateKey, lifecycle, vault };
}

describe('local database bootstrap recovery', () => {
  it('boots from encrypted local state while offline without a network dependency', async () => {
    const harness = createHarness();
    const bootstrap = new LocalDatabaseBootstrap(harness.lifecycle, harness.driver);
    await expect(
      bootstrap.boot({ sessionStatus: 'signedIn', offline: true }),
    ).resolves.toMatchObject({
      status: 'ready',
      offline: true,
      recovery: 'none',
    });
    expect(harness.driver.open).toHaveBeenCalledTimes(1);
  });

  it('purges local authorization state for a revoked session without opening the DB', async () => {
    const harness = createHarness();
    const bootstrap = new LocalDatabaseBootstrap(harness.lifecycle, harness.driver);
    await expect(bootstrap.boot({ sessionStatus: 'revoked', offline: false })).resolves.toEqual({
      status: 'purged',
      offline: false,
      recovery: 'session_revoked',
    });
    expect(harness.file.delete).toHaveBeenCalledTimes(1);
    expect(harness.vault.delete).toHaveBeenCalledTimes(1);
    expect(harness.driver.open).not.toHaveBeenCalled();
  });

  it('reports key-loss recovery after replacing the unreadable local database', async () => {
    const harness = createHarness();
    await harness.vault.delete();
    const bootstrap = new LocalDatabaseBootstrap(harness.lifecycle, harness.driver);
    await expect(
      bootstrap.boot({ sessionStatus: 'signedIn', offline: false }),
    ).resolves.toMatchObject({
      status: 'ready',
      recovery: 'key_loss',
    });
    expect(harness.generateKey).toHaveBeenCalledTimes(1);
  });

  it('purges and recreates a corrupted database once', async () => {
    const harness = createHarness();
    const corrupted = createConnection(async () => {
      throw new Error('sensitive native database detail');
    });
    const recovered = createConnection(async () => undefined);
    jest
      .mocked(harness.driver.open)
      .mockResolvedValueOnce(corrupted)
      .mockResolvedValueOnce(recovered);
    const bootstrap = new LocalDatabaseBootstrap(harness.lifecycle, harness.driver);

    await expect(
      bootstrap.boot({ sessionStatus: 'signedIn', offline: false }),
    ).resolves.toMatchObject({
      status: 'ready',
      recovery: 'database_corrupted',
    });
    expect(corrupted.close).toHaveBeenCalledTimes(1);
    expect(harness.file.delete).toHaveBeenCalledTimes(1);
    expect(harness.driver.open).toHaveBeenCalledTimes(2);
  });

  it('returns a generic fail-closed error when recovery also fails', async () => {
    const harness = createHarness();
    jest
      .mocked(harness.driver.open)
      .mockRejectedValueOnce(new Error('first sensitive detail'))
      .mockRejectedValueOnce(new Error('second sensitive detail'));
    const bootstrap = new LocalDatabaseBootstrap(harness.lifecycle, harness.driver);

    const result = bootstrap.boot({ sessionStatus: 'signedIn', offline: false });
    await expect(result).rejects.toBeInstanceOf(LocalDatabaseUnavailableError);
    await expect(result).rejects.not.toThrow('sensitive detail');
  });
});
