import {
  createPurgeDirective,
  runInLocalTransaction,
  type LocalRepository,
  type LocalTransaction,
  type LocalTransactionBoundary,
} from './local-database-contract';

interface TestEntity {
  id: string;
  version: number;
  tombstone: boolean;
}

describe('local database contracts', () => {
  it('executes repository work inside the exclusive transaction boundary', async () => {
    const transaction: LocalTransaction = {
      execute: jest.fn(async () => undefined),
      first: jest.fn(async () => null),
      all: jest.fn(async () => []),
    };
    const boundary: LocalTransactionBoundary = {
      withExclusiveTransaction: jest.fn(async (work) => work(transaction)),
    };
    const repository: LocalRepository<TestEntity> = {
      findById: jest.fn(async () => null),
      upsert: jest.fn(async () => undefined),
      tombstone: jest.fn(async () => undefined),
      purge: jest.fn(async () => undefined),
    };

    const result = await runInLocalTransaction(boundary, async (tx) => {
      await repository.upsert(tx, { id: 'entry-1', version: 1, tombstone: false });
      return 'committed';
    });

    expect(result).toBe('committed');
    expect(boundary.withExclusiveTransaction).toHaveBeenCalledTimes(1);
    expect(repository.upsert).toHaveBeenCalledWith(transaction, {
      id: 'entry-1',
      version: 1,
      tombstone: false,
    });
  });

  it('does not retry failed transaction work implicitly', async () => {
    const transaction = {} as LocalTransaction;
    const boundary: LocalTransactionBoundary = {
      withExclusiveTransaction: jest.fn(async (work) => work(transaction)),
    };
    const work = jest.fn(async () => {
      throw new Error('write failed');
    });

    await expect(runInLocalTransaction(boundary, work)).rejects.toThrow('write failed');
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('creates a versioned, immutable purge directive with an explicit scope', () => {
    const directive = createPurgeDirective({
      reason: 'session_revoked',
      scope: { type: 'user', id: 'user-1' },
      requestedAt: '2026-08-25T10:00:00.000Z',
    });

    expect(directive).toEqual({
      directiveVersion: 1,
      reason: 'session_revoked',
      scope: { type: 'user', id: 'user-1' },
      requestedAt: '2026-08-25T10:00:00.000Z',
    });
    expect(Object.isFrozen(directive)).toBe(true);
    expect(Object.isFrozen(directive.scope)).toBe(true);
  });

  it('rejects an unscoped purge directive', () => {
    expect(() =>
      createPurgeDirective({
        reason: 'access_revoked',
        scope: { type: 'household', id: '   ' },
        requestedAt: '2026-08-25T10:00:00.000Z',
      }),
    ).toThrow('scope id');
  });

  it('rejects a purge directive without a UTC timestamp', () => {
    expect(() =>
      createPurgeDirective({
        reason: 'logout',
        scope: { type: 'database', id: 'local' },
        requestedAt: '25 August 2026',
      }),
    ).toThrow('requestedAt');
  });
});
