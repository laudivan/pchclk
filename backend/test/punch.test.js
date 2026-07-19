import { test, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Set environment variables before dynamically importing modules to enforce isolation
process.env.NODE_ENV = 'test';
process.env.DB_PATH = 'data/test_punch.db';
process.env.JWT_SECRET = 'test-secret-for-pchclk-2026';

// Wipe test DB if it exists before importing to ensure a clean start
const dbFile = path.resolve('data/test_punch.db');
const walFile = path.resolve('data/test_punch.db-wal');
const shmFile = path.resolve('data/test_punch.db-shm');
try {
  if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
  if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
  if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
} catch (err) {
  // Ignore
}

// Dynamically import DB and App
const { default: db } = await import('../src/config/db.js');
const { runMigrations } = await import('../src/db/migrate.js');
const { runSeeds } = await import('../src/db/seed.js');
const { default: app } = await import('../src/app.js');

let server;
let baseUrl;

// Setup server and test database
before(async () => {
  runMigrations();
  runSeeds();

  // Create additional test data for punch validation
  // 1. Valid active paired device authorization for Employee 1
  db.prepare(`
    INSERT INTO device_authorizations (employee_id, auth_code, device_key, paired_at, is_active, expires_at)
    VALUES (1, 'AUTH111', 'paired-device-key-active', '2026-07-19T12:00:00Z', 1, '2026-07-20T12:00:00Z')
  `).run();

  // 2. Inactive paired device authorization for Employee 2
  db.prepare(`
    INSERT INTO device_authorizations (employee_id, auth_code, device_key, paired_at, is_active, expires_at)
    VALUES (2, 'AUTH222', 'paired-device-key-inactive', '2026-07-19T12:00:00Z', 0, '2026-07-20T12:00:00Z')
  `).run();

  // 3. Set Employee 3 to 'inactive' and add an active paired device
  db.prepare(`UPDATE employees SET status = 'inactive' WHERE id = 3`).run();
  db.prepare(`
    INSERT INTO device_authorizations (employee_id, auth_code, device_key, paired_at, is_active, expires_at)
    VALUES (3, 'AUTH333', 'paired-device-key-inactive-emp', '2026-07-19T12:00:00Z', 1, '2026-07-20T12:00:00Z')
  `).run();

  // Start the server on an ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      console.log(`Punch test server running at ${baseUrl}`);
      resolve();
    });
  });
});

// Close database and stop server after tests
after(async () => {
  if (db) {
    db.close();
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  // Wipe test database files
  const dbFile = path.resolve('data/test_punch.db');
  const walFile = path.resolve('data/test_punch.db-wal');
  const shmFile = path.resolve('data/test_punch.db-shm');
  try {
    if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  } catch (err) {
    console.error('Error cleaning up test DB files:', err);
  }
});

// Helper for HTTP requests
async function makeRequest(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'en-US',
      ...options.headers,
    },
  });
  
  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    // Return text if not JSON
  }
  
  return {
    status: response.status,
    data,
  };
}

// Helper to generate dynamic QR validation hash
const generateHashForBlock = (timestampMs, secret) => {
  const interval = 15 * 60 * 1000;
  const blockTime = Math.floor(timestampMs / interval) * interval;
  return crypto.createHmac('sha256', secret).update(String(blockTime)).digest('hex');
};

// ----------------------------------------------------
// PUNCH REGISTRATION TESTS
// ----------------------------------------------------
test('POST /api/punch - Fail with missing device key', async () => {
  const { status, data } = await makeRequest('/api/punch', {
    method: 'POST',
    body: JSON.stringify({ token: 'dummy-token' }),
  });

  assert.strictEqual(status, 400);
  assert.strictEqual(data.error, 'Device key is required');
});

test('POST /api/punch - Fail with inactive/unpaired device key', async () => {
  const { status, data } = await makeRequest('/api/punch', {
    method: 'POST',
    body: JSON.stringify({ device_key: 'unpaired-device-key-999' }),
  });

  assert.strictEqual(status, 401);
  assert.strictEqual(data.error, 'Device is not paired or authorization is inactive');
});

test('POST /api/punch - Fail with revoked device key', async () => {
  const { status, data } = await makeRequest('/api/punch', {
    method: 'POST',
    body: JSON.stringify({ device_key: 'paired-device-key-inactive' }),
  });

  assert.strictEqual(status, 401);
  assert.strictEqual(data.error, 'Device is not paired or authorization is inactive');
});

test('POST /api/punch - Fail with inactive employee account', async () => {
  const { status, data } = await makeRequest('/api/punch', {
    method: 'POST',
    body: JSON.stringify({ device_key: 'paired-device-key-inactive-emp' }),
  });

  assert.strictEqual(status, 403);
  assert.strictEqual(data.error, 'Employee account is inactive');
});

test('POST /api/punch - Success with manual bypass (no token)', async () => {
  const { status, data } = await makeRequest('/api/punch', {
    method: 'POST',
    body: JSON.stringify({ device_key: 'paired-device-key-active' }),
  });

  assert.strictEqual(status, 200);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.hash_validated, 0);

  // Check database log insertion
  const log = db.prepare('SELECT * FROM logs WHERE device_key = ? ORDER BY id DESC LIMIT 1').get('paired-device-key-active');
  assert.ok(log);
  assert.strictEqual(log.employee_id, 1);
  assert.strictEqual(log.hash_validated, 0);
});

test('POST /api/punch - Success with current 15m block token', async () => {
  const secret = 'test-secret-for-pchclk-2026';
  const currentToken = generateHashForBlock(Date.now(), secret);

  const { status, data } = await makeRequest('/api/punch', {
    method: 'POST',
    body: JSON.stringify({ 
      device_key: 'paired-device-key-active',
      token: currentToken
    }),
  });

  assert.strictEqual(status, 200);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.hash_validated, 1);

  // Check database log insertion
  const log = db.prepare('SELECT * FROM logs WHERE device_key = ? ORDER BY id DESC LIMIT 1').get('paired-device-key-active');
  assert.ok(log);
  assert.strictEqual(log.employee_id, 1);
  assert.strictEqual(log.hash_validated, 1);
});

test('POST /api/punch - Success with previous 15m block token (grace period)', async () => {
  const secret = 'test-secret-for-pchclk-2026';
  const previousToken = generateHashForBlock(Date.now() - 15 * 60 * 1000, secret);

  const { status, data } = await makeRequest('/api/punch', {
    method: 'POST',
    body: JSON.stringify({ 
      device_key: 'paired-device-key-active',
      token: previousToken
    }),
  });

  assert.strictEqual(status, 200);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.hash_validated, 1);
});

test('POST /api/punch - Fail with invalid/expired token', async () => {
  const { status, data } = await makeRequest('/api/punch', {
    method: 'POST',
    body: JSON.stringify({ 
      device_key: 'paired-device-key-active',
      token: 'invalid-or-expired-token-string-value-here'
    }),
  });

  assert.strictEqual(status, 400);
  assert.strictEqual(data.error, 'Invalid or expired QR code');
});
