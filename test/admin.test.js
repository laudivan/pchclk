import { test, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

// Set environment variables before dynamically importing modules to enforce isolation
process.env.NODE_ENV = 'test';
process.env.DB_PATH = 'data/test.db';
process.env.JWT_SECRET = 'test-secret-for-pchclk-2026';

// Wipe test DB if it exists before importing to ensure a clean start
const dbFile = path.resolve('data/test.db');
const walFile = path.resolve('data/test.db-wal');
const shmFile = path.resolve('data/test.db-shm');
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
let adminToken;

// Setup server and test database
before(async () => {
  // Run migrations and seeds to prepare schemas and test users
  runMigrations();
  runSeeds();

  // Start the server on an ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      console.log(`Test server running at ${baseUrl}`);
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
  const dbFile = path.resolve('data/test.db');
  const walFile = path.resolve('data/test.db-wal');
  const shmFile = path.resolve('data/test.db-shm');
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
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

// ----------------------------------------------------
// 1. AUTHENTICATION TESTS (POST /api/admin/login)
// ----------------------------------------------------
test('POST /api/admin/login - Successful admin login', async () => {
  const { status, data } = await makeRequest('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'admin' }),
  });

  assert.strictEqual(status, 200);
  assert.ok(data.token);
  assert.strictEqual(data.username, 'admin');
  assert.strictEqual(data.role, 'superadmin');

  // Store token for subsequent tests
  adminToken = data.token;
});

test('POST /api/admin/login - Failed login with invalid credentials', async () => {
  const { status, data } = await makeRequest('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }),
  });

  assert.strictEqual(status, 401);
  assert.strictEqual(data.error, 'Invalid username or password');
});

test('POST /api/admin/login - Failed login with missing body parameters', async () => {
  const { status, data } = await makeRequest('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin' }),
  });

  assert.strictEqual(status, 400);
  assert.strictEqual(data.error, 'Username and password required');
});

// ----------------------------------------------------
// 2. CONFIGURATION TESTS (GET & POST /api/admin/config)
// ----------------------------------------------------
test('GET /api/admin/config - Fail without authentication', async () => {
  const { status, data } = await makeRequest('/api/admin/config');
  assert.strictEqual(status, 401);
  assert.strictEqual(data.error, 'Unauthorized access');
});

test('GET /api/admin/config - Success with valid token', async () => {
  const { status, data } = await makeRequest('/api/admin/config', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert.strictEqual(status, 200);
  assert.ok(typeof data.globalStartDay === 'number');
});

test('POST /api/admin/config - Fail without authentication', async () => {
  const { status, data } = await makeRequest('/api/admin/config', {
    method: 'POST',
    body: JSON.stringify({ globalStartDay: 15 }),
  });
  assert.strictEqual(status, 401);
});

test('POST /api/admin/config - Fail with invalid boundary start day (out of bounds)', async () => {
  const { status, data } = await makeRequest('/api/admin/config', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ globalStartDay: 0 }),
  });

  assert.strictEqual(status, 400);
  assert.strictEqual(data.error, 'Invalid start day. Must be between 1 and 28.');

  const { status: status2, data: data2 } = await makeRequest('/api/admin/config', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ globalStartDay: 29 }),
  });

  assert.strictEqual(status2, 400);
});

test('POST /api/admin/config - Success with valid boundary start day (creates audit log)', async () => {
  const { status, data } = await makeRequest('/api/admin/config', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ globalStartDay: 15 }),
  });

  assert.strictEqual(status, 200);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.globalStartDay, 15);

  // Check audit log entry
  const log = db.prepare("SELECT * FROM audit_logs WHERE action = 'UPDATE_CONFIG' ORDER BY id DESC LIMIT 1").get();
  assert.ok(log);
  assert.strictEqual(log.endpoint, '/api/admin/config');
  const details = JSON.parse(log.details);
  assert.strictEqual(details.globalStartDay, 15);
});

// ----------------------------------------------------
// 3. EMPLOYEE TESTS (GET & POST /api/admin/employees)
// ----------------------------------------------------
test('GET /api/admin/employees - Fail without authentication', async () => {
  const { status, data } = await makeRequest('/api/admin/employees');
  assert.strictEqual(status, 401);
});

test('GET /api/admin/employees - Success with valid token (returns seeded list)', async () => {
  const { status, data } = await makeRequest('/api/admin/employees', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert.strictEqual(status, 200);
  assert.ok(Array.isArray(data));
  assert.ok(data.length >= 3); // José Silva, Maria Santos, Antônio Souza
  
  const jose = data.find(e => e.name === 'José Silva');
  assert.ok(jose);
  assert.strictEqual(jose.registration_number, 'EMP001');
  assert.strictEqual(jose.auth_code, '123456');
  assert.strictEqual(jose.is_device_active, 1);
});

test('POST /api/admin/employees - Fail without authentication', async () => {
  const { status } = await makeRequest('/api/admin/employees', {
    method: 'POST',
    body: JSON.stringify({ name: 'Bob Dylan', registration_number: 'EMP999' }),
  });
  assert.strictEqual(status, 401);
});

test('POST /api/admin/employees - Fail with missing parameters', async () => {
  const { status, data } = await makeRequest('/api/admin/employees', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: 'Bob Dylan' }),
  });
  assert.strictEqual(status, 400);
  assert.strictEqual(data.error, 'Name and registration number required');
});

test('POST /api/admin/employees - Success with valid parameters (creates audit log)', async () => {
  const { status, data } = await makeRequest('/api/admin/employees', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: 'Bob Dylan', registration_number: 'EMP999' }),
  });

  assert.strictEqual(status, 200);
  assert.ok(data.id);
  assert.ok(data.uuid);
  assert.strictEqual(data.name, 'Bob Dylan');
  assert.strictEqual(data.registration_number, 'EMP999');

  // Verify in DB
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(data.id);
  assert.ok(employee);
  assert.strictEqual(employee.name, 'Bob Dylan');

  // Check audit log
  const log = db.prepare("SELECT * FROM audit_logs WHERE action = 'CREATE_EMPLOYEE' ORDER BY id DESC LIMIT 1").get();
  assert.ok(log);
  assert.strictEqual(log.endpoint, '/api/admin/employees');
  const details = JSON.parse(log.details);
  assert.strictEqual(details.name, 'Bob Dylan');
});

test('POST /api/admin/employees - Fail with duplicate registration_number', async () => {
  const { status, data } = await makeRequest('/api/admin/employees', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: 'Another Bob', registration_number: 'EMP999' }),
  });

  assert.strictEqual(status, 400);
  assert.strictEqual(data.error, 'Registration number already exists');
});

// ----------------------------------------------------
// 4. DEVICE AUTHORIZATION TESTS (POST /api/admin/employees/:id/authorize)
// ----------------------------------------------------
test('POST /api/admin/employees/:id/authorize - Fail without authentication', async () => {
  const { status } = await makeRequest('/api/admin/employees/1/authorize', {
    method: 'POST',
  });
  assert.strictEqual(status, 401);
});

test('POST /api/admin/employees/:id/authorize - Fail for non-existent employee', async () => {
  const { status, data } = await makeRequest('/api/admin/employees/99999/authorize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(status, 404);
  assert.strictEqual(data.error, 'Employee not found');
});

test('POST /api/admin/employees/:id/authorize - Success (generates code and audit log, invalidates old)', async () => {
  // Let's use Employee 1 (José Silva, id: 1)
  // First, verify José has active authorizations in DB
  const oldAuthsCount = db.prepare('SELECT count(*) as count FROM device_authorizations WHERE employee_id = 1 AND is_active = 1').get().count;
  assert.strictEqual(oldAuthsCount, 1);

  const { status, data } = await makeRequest('/api/admin/employees/1/authorize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert.strictEqual(status, 200);
  assert.ok(data.authCode);
  assert.ok(data.expiresAt);
  assert.ok(data.qrUrl);
  assert.strictEqual(data.authCode.length, 6);

  // Verify old authorizations are now inactive and new authorization is active
  const activeAuths = db.prepare('SELECT * FROM device_authorizations WHERE employee_id = 1 AND is_active = 1').all();
  assert.strictEqual(activeAuths.length, 1);
  assert.strictEqual(activeAuths[0].auth_code, data.authCode);

  const inactiveAuths = db.prepare('SELECT * FROM device_authorizations WHERE employee_id = 1 AND is_active = 0').all();
  assert.ok(inactiveAuths.length >= 1);

  // Check audit log
  const log = db.prepare("SELECT * FROM audit_logs WHERE action = 'AUTHORIZE_DEVICE' ORDER BY id DESC LIMIT 1").get();
  assert.ok(log);
  assert.strictEqual(log.endpoint, '/api/admin/employees/1/authorize');
});

// ----------------------------------------------------
// 5. PUNCH LOGS TESTS (GET /api/admin/logs)
// ----------------------------------------------------
test('GET /api/admin/logs - Fail without authentication', async () => {
  const { status } = await makeRequest('/api/admin/logs');
  assert.strictEqual(status, 401);
});

test('GET /api/admin/logs - Success retrieving filtered period logs', async () => {
  // Clear any existing logs and seed specific test logs
  db.prepare('DELETE FROM logs').run();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // Insert mock logs
  const insertLog = db.prepare(`
    INSERT INTO logs (employee_id, timestamp, device_key, hash_validated, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Insert punch log within the expected range
  // Suppose start day is configured to 15.
  // For the currentMonth, range is (currentMonth - 1) on day 15 to currentMonth on day 14.
  // Let's create a timestamp within that range: e.g. currentYear-currentMonth-01
  const testDateIn = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 12, 0, 0));
  insertLog.run(1, testDateIn.toISOString(), 'test-device-key', 1, '127.0.0.1', 'Mozilla');

  // Insert punch log outside the range (e.g. 3 months ago)
  const testDateOut = new Date(Date.UTC(currentYear, currentMonth - 4, 1, 12, 0, 0));
  insertLog.run(1, testDateOut.toISOString(), 'test-device-key', 1, '127.0.0.1', 'Mozilla');

  // Let's run a POST config to set startDay = 15
  await makeRequest('/api/admin/config', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ globalStartDay: 15 }),
  });

  const { status, data } = await makeRequest(`/api/admin/logs?month=${currentMonth}&year=${currentYear}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert.strictEqual(status, 200);
  assert.ok(data.period);
  assert.strictEqual(data.period.startDay, 15);
  assert.ok(Array.isArray(data.logs));

  // Should find exactly 1 log (the testDateIn log)
  assert.strictEqual(data.logs.length, 1);
  assert.strictEqual(data.logs[0].employee_name, 'José Silva');
  assert.strictEqual(data.logs[0].hash_validated, 1);
});

// ----------------------------------------------------
// 6. EMPLOYEE EDIT & DELETE TESTS
// ----------------------------------------------------
test('PUT /api/admin/employees/:id - Fail without authentication', async () => {
  const { status } = await makeRequest('/api/admin/employees/1', {
    method: 'PUT',
    body: JSON.stringify({ name: 'José Updated', registration_number: 'EMP001' }),
  });
  assert.strictEqual(status, 401);
});

test('PUT /api/admin/employees/:id - Success updating employee name and registration', async () => {
  const { status, data } = await makeRequest('/api/admin/employees/1', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: 'José Updated', registration_number: 'EMP001-NEW' }),
  });

  assert.strictEqual(status, 200);
  assert.strictEqual(data.name, 'José Updated');
  assert.strictEqual(data.registration_number, 'EMP001-NEW');

  // Verify database update
  const emp = db.prepare('SELECT * FROM employees WHERE id = 1').get();
  assert.strictEqual(emp.name, 'José Updated');
  assert.strictEqual(emp.registration_number, 'EMP001-NEW');

  // Verify audit log entry
  const log = db.prepare("SELECT * FROM audit_logs WHERE action = 'UPDATE_EMPLOYEE' ORDER BY id DESC LIMIT 1").get();
  assert.ok(log);
  assert.strictEqual(log.endpoint, '/api/admin/employees/1');
});

test('PUT /api/admin/employees/:id - Fail with duplicate registration', async () => {
  // Try to update Employee 2 (Maria Santos, id: 2) to use 'EMP001-NEW'
  const { status, data } = await makeRequest('/api/admin/employees/2', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: 'Maria Santos', registration_number: 'EMP001-NEW' }),
  });

  assert.strictEqual(status, 400);
  assert.strictEqual(data.error, 'Registration number already exists');
});

test('DELETE /api/admin/employees/:id - Fail without authentication', async () => {
  const { status } = await makeRequest('/api/admin/employees/1', {
    method: 'DELETE',
  });
  assert.strictEqual(status, 401);
});

test('DELETE /api/admin/employees/:id - Success deleting employee', async () => {
  const { status, data } = await makeRequest('/api/admin/employees/1', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert.strictEqual(status, 200);
  assert.strictEqual(data.success, true);

  // Verify deletion from DB
  const emp = db.prepare('SELECT * FROM employees WHERE id = 1').get();
  assert.strictEqual(emp, undefined);

  // Verify cascading deletion of authorizations (employee_id = 1 should have 0 records)
  const authCount = db.prepare('SELECT count(*) as count FROM device_authorizations WHERE employee_id = 1').get().count;
  assert.strictEqual(authCount, 0);

  // Verify audit log entry
  const log = db.prepare("SELECT * FROM audit_logs WHERE action = 'DELETE_EMPLOYEE' ORDER BY id DESC LIMIT 1").get();
  assert.ok(log);
  assert.strictEqual(log.endpoint, '/api/admin/employees/1');
});

// ----------------------------------------------------
// 7. ADMINISTRATOR USER CRUD TESTS (SUPERADMIN ONLY)
// ----------------------------------------------------
test('GET /api/admin/admins - Fail for unauthorized role', async () => {
  // 1. Create a regular admin using superadmin token
  const { status: createStatus, data: createData } = await makeRequest('/api/admin/admins', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ username: 'regadmin', password: 'password123', role: 'admin' }),
  });
  assert.strictEqual(createStatus, 200);
  assert.strictEqual(createData.username, 'regadmin');
  assert.strictEqual(createData.role, 'admin');

  // 2. Log in as the regular admin
  const { status: loginStatus, data: loginData } = await makeRequest('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'regadmin', password: 'password123' }),
  });
  assert.strictEqual(loginStatus, 200);
  const regAdminToken = loginData.token;

  // 3. Request list with regular admin token
  const { status: listStatus, data: listData } = await makeRequest('/api/admin/admins', {
    headers: { Authorization: `Bearer ${regAdminToken}` },
  });
  assert.strictEqual(listStatus, 403);
  assert.strictEqual(listData.error, 'Only superadmins can manage administrator accounts');
});

test('GET /api/admin/admins - Success for superadmin', async () => {
  const { status, data } = await makeRequest('/api/admin/admins', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert.strictEqual(status, 200);
  assert.ok(Array.isArray(data));
  assert.ok(data.length >= 2); // 'admin' and 'regadmin'
  const adminUser = data.find(u => u.username === 'admin');
  assert.ok(adminUser);
  assert.strictEqual(adminUser.role, 'superadmin');
});

test('POST /api/admin/admins - Fail duplicate username', async () => {
  const { status, data } = await makeRequest('/api/admin/admins', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ username: 'regadmin', password: 'password456', role: 'admin' }),
  });

  assert.strictEqual(status, 400);
  assert.strictEqual(data.error, 'Username already exists');
});

test('PUT /api/admin/admins/:id - Success updating admin', async () => {
  // Let's update 'regadmin'
  const targetAdmin = db.prepare("SELECT id FROM admins WHERE username = 'regadmin'").get();
  assert.ok(targetAdmin);

  const { status, data } = await makeRequest(`/api/admin/admins/${targetAdmin.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ username: 'regadmin-updated', role: 'admin' }),
  });

  assert.strictEqual(status, 200);
  assert.strictEqual(data.username, 'regadmin-updated');

  const updatedAdmin = db.prepare('SELECT * FROM admins WHERE id = ?').get(targetAdmin.id);
  assert.strictEqual(updatedAdmin.username, 'regadmin-updated');
});

test('DELETE /api/admin/admins/:id - Prevent self-deletion', async () => {
  const currentAdmin = db.prepare("SELECT id FROM admins WHERE username = 'admin'").get();
  assert.ok(currentAdmin);

  const { status, data } = await makeRequest(`/api/admin/admins/${currentAdmin.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert.strictEqual(status, 400);
  assert.strictEqual(data.error, 'Self-deletion is not allowed');
});

test('DELETE /api/admin/admins/:id - Success deleting admin', async () => {
  const targetAdmin = db.prepare("SELECT id FROM admins WHERE username = 'regadmin-updated'").get();
  assert.ok(targetAdmin);

  const { status, data } = await makeRequest(`/api/admin/admins/${targetAdmin.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert.strictEqual(status, 200);
  assert.strictEqual(data.success, true);

  const deletedAdmin = db.prepare('SELECT * FROM admins WHERE id = ?').get(targetAdmin.id);
  assert.strictEqual(deletedAdmin, undefined);
});

// ----------------------------------------------------
// 8. PUBLIC SMART TV ENDPOINTS
// ----------------------------------------------------
test('GET /api/tv/token - Public token endpoint', async () => {
  const { status, data } = await makeRequest('/api/tv/token');

  assert.strictEqual(status, 200);
  assert.ok(data.token);
  assert.strictEqual(typeof data.token, 'string');
  assert.strictEqual(data.token.length, 64); // SHA256 hex is 64 characters
  assert.ok(typeof data.expires_in === 'number');
  assert.ok(data.expires_in >= 0);
  assert.ok(data.expires_in <= 900); // max 15 minutes
});
