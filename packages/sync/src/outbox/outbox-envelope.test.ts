import { createOutboxEnvelope } from './outbox-envelope';

const FIXED_OPERATION_ID = '11111111-1111-4111-8111-111111111111';

describe('outbox envelope', () => {
  it('creates a deterministic versioned envelope and idempotency key', () => {
    const envelope = createOutboxEnvelope(
      {
        scope: { type: 'user', id: 'user-1' },
        entity: { type: 'transaction', id: 'entry-1', version: 3 },
        command: 'transaction.upsert',
        payload: { categoryId: 'category-1' },
      },
      {
        createOperationId: () => FIXED_OPERATION_ID,
        now: () => '2026-08-25T10:00:00.000Z',
      },
    );

    expect(envelope).toEqual({
      envelopeVersion: 1,
      operationId: FIXED_OPERATION_ID,
      idempotencyKey: `user:user-1:transaction:entry-1:3:${FIXED_OPERATION_ID}`,
      scope: { type: 'user', id: 'user-1' },
      entity: { type: 'transaction', id: 'entry-1', version: 3 },
      command: 'transaction.upsert',
      payload: { categoryId: 'category-1' },
      tombstone: null,
      purge: null,
      createdAt: '2026-08-25T10:00:00.000Z',
    });
    expect(Object.isFrozen(envelope)).toBe(true);
  });

  it('carries tombstones without removing entity identity or version', () => {
    const envelope = createOutboxEnvelope(
      {
        scope: { type: 'household', id: 'household-1' },
        entity: { type: 'account', id: 'account-1', version: 8 },
        command: 'account.delete',
        payload: {},
        tombstone: { deletedAt: '2026-08-25T09:59:00.000Z' },
      },
      {
        createOperationId: () => FIXED_OPERATION_ID,
        now: () => '2026-08-25T10:00:00.000Z',
      },
    );

    expect(envelope.entity).toEqual({ type: 'account', id: 'account-1', version: 8 });
    expect(envelope.tombstone).toEqual({ deletedAt: '2026-08-25T09:59:00.000Z' });
  });

  it('carries a purge directive as an explicit authorization boundary', () => {
    const envelope = createOutboxEnvelope(
      {
        scope: { type: 'user', id: 'user-1' },
        entity: { type: 'local_scope', id: 'user-1', version: 1 },
        command: 'local.purge',
        payload: {},
        purge: {
          directiveVersion: 1,
          reason: 'logout',
          scope: { type: 'user', id: 'user-1' },
          requestedAt: '2026-08-25T10:00:00.000Z',
        },
      },
      {
        createOperationId: () => FIXED_OPERATION_ID,
        now: () => '2026-08-25T10:00:00.000Z',
      },
    );

    expect(envelope.purge?.reason).toBe('logout');
  });

  it.each([0, -1, 1.5])('rejects invalid entity version %s', (version) => {
    expect(() =>
      createOutboxEnvelope(
        {
          scope: { type: 'user', id: 'user-1' },
          entity: { type: 'transaction', id: 'entry-1', version },
          command: 'transaction.upsert',
          payload: {},
        },
        {
          createOperationId: () => FIXED_OPERATION_ID,
          now: () => '2026-08-25T10:00:00.000Z',
        },
      ),
    ).toThrow('version');
  });
});
