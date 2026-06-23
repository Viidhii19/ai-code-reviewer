import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

// Track the original mongoose.connect to restore later
const originalConnect = mongoose.connect;
let connectCallCount = 0;
let connectShouldSucceed = false;

// Mock mongoose.connect to avoid actual network calls
mongoose.connect = async (uri, options) => {
  connectCallCount++;
  if (connectShouldSucceed) {
    return Promise.resolve({ mockConnection: true });
  }
  throw new Error('Mock connection refused');
};

const originalDisconnect = mongoose.disconnect;
mongoose.disconnect = async () => {};

// Re-import config after mocking so it picks up the mocked mongoose
const { isDatabaseConnected, closeDatabase } = await import('../config/db.js');
const { ensureConnection } = await import('../config/db.js');

test('isDatabaseConnected returns boolean', () => {
  const result = isDatabaseConnected();
  assert.equal(typeof result, 'boolean');
});

test('isDatabaseConnected returns false when not connected', () => {
  closeDatabase();
  assert.equal(isDatabaseConnected(), false);
});

test('closeDatabase does not throw when already disconnected', async () => {
  let threw = false;
  try {
    await closeDatabase();
  } catch (e) {
    threw = true;
  }
  assert.equal(threw, false);
});

test('closeDatabase resets connection state to false', async () => {
  await closeDatabase();
  assert.equal(isDatabaseConnected(), false);
});

test('ensureConnection returns false after retries when DB is unavailable', async () => {
  connectCallCount = 0;
  connectShouldSucceed = false;

  const result = await ensureConnection();

  assert.equal(typeof result, 'boolean');
  assert.equal(result, false);
  assert.ok(connectCallCount >= 1);
});

test('ensureConnection returns true when DB connects successfully', async () => {
  connectCallCount = 0;
  connectShouldSucceed = true;

  await closeDatabase();

  const result = await ensureConnection();
  assert.equal(result, true);
  assert.ok(connectCallCount >= 1);

  await closeDatabase();
  connectShouldSucceed = false;
});

after(async () => {
  mongoose.connect = originalConnect;
  mongoose.disconnect = originalDisconnect;
  await closeDatabase();
});