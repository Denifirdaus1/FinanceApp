import { createOutboxEnvelope, type JsonValue } from './outbox-envelope';

const FIXED_OPERATION_ID = '11111111-1111-4111-8111-111111111111';

describe('outbox envelope', () => {
  const createMinimal = (overrides: Record<string, unknown> = {}) =>
    createOutboxEnvelope(
      {
        scope: { type: 'user', id: 'user-1' },
        entity: { type: 'transaction', id: 'entry-1', version: 1 },
        command: 'transaction.upsert',
        payload: {},
        ...overrides,
      },
      {
        createOperationId: () => FIXED_OPERATION_ID,
        now: () => '2026-08-25T10:00:00.000Z',
      },
    );

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

  it('rejects unsafe identifiers, commands, and operation IDs', () => {
    expect(() => createMinimal({ scope: { type: 'user', id: 'user:other' } })).toThrow('scope id');
    expect(() => createMinimal({ command: 'DROP TABLE outbox' })).toThrow('command');
    expect(() =>
      createOutboxEnvelope(
        {
          scope: { type: 'user', id: 'user-1' },
          entity: { type: 'transaction', id: 'entry-1', version: 1 },
          command: 'transaction.upsert',
          payload: {},
        },
        { createOperationId: () => 'predictable-id', now: () => '2026-08-25T10:00:00.000Z' },
      ),
    ).toThrow('operation id');
  });

  it('rejects a purge directive whose authorization scope does not match', () => {
    expect(() =>
      createMinimal({
        purge: {
          directiveVersion: 1,
          reason: 'access_revoked',
          scope: { type: 'household', id: 'household-1' },
          requestedAt: '2026-08-25T10:00:00.000Z',
        },
      }),
    ).toThrow('purge scope');
  });

  it('clones and freezes a valid purge directive at the envelope boundary', () => {
    const purge = {
      directiveVersion: 1 as const,
      reason: 'logout' as const,
      scope: { type: 'user' as const, id: 'user-1' },
      requestedAt: '2026-08-25T10:00:00.000Z',
    };
    const envelope = createMinimal({ purge });
    purge.scope.id = 'changed-after-validation';
    expect(envelope.purge?.scope.id).toBe('user-1');
    expect(Object.isFrozen(envelope.purge)).toBe(true);
    expect(Object.isFrozen(envelope.purge?.scope)).toBe(true);
  });

  it('rejects malformed purge directives and tombstone command mismatches', () => {
    expect(() =>
      createMinimal({
        purge: {
          directiveVersion: 2,
          reason: 'logout',
          scope: { type: 'user', id: 'user-1' },
          requestedAt: '2026-08-25T10:00:00.000Z',
        },
      }),
    ).toThrow('purge directive');
    expect(() =>
      createMinimal({
        tombstone: { deletedAt: '2026-08-25T10:00:00.000Z' },
        command: 'transaction.upsert',
      }),
    ).toThrow('tombstone');
  });

  it('rejects non-JSON-safe payload values', () => {
    const invalidPayloads: unknown[] = [
      { value: undefined },
      { value: Number.POSITIVE_INFINITY },
      new Date('2026-08-25T10:00:00.000Z'),
      { constructor: 'polluted' },
    ];
    for (const payload of invalidPayloads) {
      expect(() => createMinimal({ payload })).toThrow('payload');
    }
  });

  it('rejects cyclic payloads', () => {
    const payload: Record<string, unknown> = {};
    payload.self = payload;
    expect(() => createMinimal({ payload })).toThrow('cycles');
  });

  it('deep-freezes JSON arrays and rejects invalid timestamps', () => {
    const envelope = createMinimal({ payload: { values: ['one', { nested: true }] } });
    const payload = envelope.payload as { values: JsonValue[] };
    expect(Object.isFrozen(payload)).toBe(true);
    expect(Object.isFrozen(payload.values)).toBe(true);
    expect(Object.isFrozen(payload.values[1])).toBe(true);
    expect(() =>
      createMinimal({
        command: 'transaction.delete',
        tombstone: { deletedAt: 'not-a-timestamp' },
      }),
    ).toThrow('deletedAt');
  });
});
