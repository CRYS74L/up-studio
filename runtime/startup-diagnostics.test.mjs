import test from 'node:test';
import assert from 'node:assert/strict';
import { retryTransientDatabaseStartup, serializeStartupError } from './d1.mjs';

test('retries transient SQLite lock errors with bounded delays', async () => {
  let attempts = 0;
  const delays = [];
  const result = await retryTransientDatabaseStartup(async () => {
    attempts++;
    if (attempts < 3) {
      const error = new Error('database is locked');
      error.code = 'ERR_SQLITE_ERROR';
      error.errcode = 517;
      throw error;
    }
    return 'ready';
  }, { sleep: async delay => delays.push(delay) });

  assert.equal(result.value, 'ready');
  assert.equal(result.attempts, 3);
  assert.deepEqual(delays, [250, 1000]);
});

test('does not retry permanent SQLite errors', async () => {
  let attempts = 0;
  const error = new Error('database disk image is malformed');
  error.code = 'ERR_SQLITE_ERROR';
  error.errcode = 11;

  await assert.rejects(retryTransientDatabaseStartup(async () => {
    attempts++;
    throw error;
  }, { sleep: async () => assert.fail('permanent errors must not retry') }), error);

  assert.equal(attempts, 1);
});

test('stops after the configured number of transient failures', async () => {
  let attempts = 0;
  const delays = [];
  const error = new Error('database is locked');
  error.code = 'ERR_SQLITE_ERROR';
  error.errcode = 5;

  await assert.rejects(retryTransientDatabaseStartup(async () => {
    attempts++;
    throw error;
  }, { sleep: async delay => delays.push(delay) }), error);

  assert.equal(attempts, 3);
  assert.deepEqual(delays, [250, 1000]);
});

test('serializes only safe diagnostic fields from listener errors', () => {
  const error = new Error('listen EACCES: permission denied 127.0.0.1:5173');
  Object.assign(error, {
    code: 'EACCES',
    errno: -4092,
    syscall: 'listen',
    address: '127.0.0.1',
    port: 5173,
    secret: 'must not be logged',
  });

  assert.deepEqual(serializeStartupError(error), {
    name: 'Error',
    message: 'listen EACCES: permission denied 127.0.0.1:5173',
    code: 'EACCES',
    errno: -4092,
    syscall: 'listen',
    address: '127.0.0.1',
    port: 5173,
  });
});
