import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../config/db.js';
import { config } from '../config/index.js';

const router = Router();

// Middleware to authenticate admin token via JWT
const adminAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: res.t('unauthorized') });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: res.t('unauthorized') });
  }
};

// POST /api/admin/login - Authenticate admin and return JWT
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role }, 
      config.jwtSecret, 
      { expiresIn: '8h' }
    );
    
    res.json({ token, username: admin.username, role: admin.role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/config - Get current global configurations
router.get('/config', adminAuth, (req, res) => {
  res.json({
    globalStartDay: config.globalStartDay
  });
});

// POST /api/admin/config - Update global start day configuration
router.post('/config', adminAuth, (req, res) => {
  const { globalStartDay } = req.body;
  if (typeof globalStartDay !== 'number' || globalStartDay < 1 || globalStartDay > 28) {
    return res.status(400).json({ error: 'Invalid start day. Must be between 1 and 28.' });
  }

  config.globalStartDay = globalStartDay;

  // Insert audit log tracking administrative action
  const auditResult = db.prepare(`
    INSERT INTO audit_logs (admin_id, action, endpoint, affected_rows, details) 
    VALUES (?, ?, ?, ?, ?)
  `).run(
    req.admin.id, 
    'UPDATE_CONFIG', 
    '/api/admin/config', 
    1, 
    JSON.stringify({ globalStartDay })
  );

  res.json({ success: true, globalStartDay, changes: auditResult.changes });
});

// GET /api/admin/employees - Get employee records and active device authorizations
router.get('/employees', adminAuth, (req, res) => {
  try {
    const employees = db.prepare(`
      SELECT e.*, 
             da.auth_code, da.device_key, da.paired_at, da.is_active as is_device_active
      FROM employees e
      LEFT JOIN device_authorizations da ON e.id = da.employee_id AND da.is_active = 1
      ORDER BY e.name ASC
    `).all();
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/employees - Create a new employee record
router.post('/employees', adminAuth, (req, res) => {
  const { name, registration_number } = req.body;
  if (!name || !registration_number) {
    return res.status(400).json({ error: 'Name and registration number required' });
  }

  try {
    const uuid = crypto.randomUUID();
    const result = db.prepare('INSERT INTO employees (uuid, name, registration_number) VALUES (?, ?, ?)')
      .run(uuid, name, registration_number);

    // Audit logging
    db.prepare(`
      INSERT INTO audit_logs (admin_id, action, endpoint, affected_rows, details) 
      VALUES (?, ?, ?, ?, ?)
    `).run(
      req.admin.id, 
      'CREATE_EMPLOYEE', 
      '/api/admin/employees', 
      result.changes, 
      JSON.stringify({ employeeId: result.lastInsertRowid, name, registration_number })
    );

    res.json({ id: result.lastInsertRowid, uuid, name, registration_number });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Registration number already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/employees/:id/authorize - Generate new device authorization QR/code for employee
router.post('/employees/:id/authorize', adminAuth, (req, res) => {
  const employeeId = req.params.id;

  try {
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Invalidate existing active authorizations for this employee
    db.prepare('UPDATE device_authorizations SET is_active = 0 WHERE employee_id = ?').run(employeeId);

    // Generate random 6-digit pairing code
    const authCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours validity

    const result = db.prepare('INSERT INTO device_authorizations (employee_id, auth_code, expires_at) VALUES (?, ?, ?)')
      .run(employeeId, authCode, expiresAt);

    // Audit logging
    db.prepare(`
      INSERT INTO audit_logs (admin_id, action, endpoint, affected_rows, details) 
      VALUES (?, ?, ?, ?, ?)
    `).run(
      req.admin.id, 
      'AUTHORIZE_DEVICE', 
      `/api/admin/employees/${employeeId}/authorize`, 
      result.changes, 
      JSON.stringify({ employeeId, authCode })
    );

    res.json({
      authCode,
      expiresAt,
      qrUrl: `https://pchclk.local/auth?u=${employee.uuid}&code=${authCode}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/logs - Get log report based on frequency custom period
router.get('/logs', adminAuth, (req, res) => {
  const { month, year } = req.query;
  const selectedYear = parseInt(year || new Date().getFullYear(), 10);
  const selectedMonth = parseInt(month || (new Date().getMonth() + 1), 10);

  try {
    const startDay = config.globalStartDay;
    
    // Period start date: previous month (selectedMonth - 2) on startDay at UTC midnight
    const startDate = new Date(Date.UTC(selectedYear, selectedMonth - 2, startDay, 0, 0, 0, 0));
    // Period end date: current month (selectedMonth - 1) on startDay - 1 at UTC 23:59:59.999
    const endDate = new Date(Date.UTC(selectedYear, selectedMonth - 1, startDay - 1, 23, 59, 59, 999));

    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    const logs = db.prepare(`
      SELECT l.id, l.timestamp, l.device_key, l.hash_validated, l.ip_address, l.user_agent,
             e.name as employee_name, e.registration_number
      FROM logs l
      JOIN employees e ON l.employee_id = e.id
      WHERE l.timestamp >= ? AND l.timestamp <= ?
      ORDER BY l.timestamp DESC
    `).all(startDateStr, endDateStr);

    res.json({
      period: {
        start: startDateStr,
        end: endDateStr,
        startDay
      },
      logs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/employees/:id - Update employee name and registration number
router.put('/employees/:id', adminAuth, (req, res) => {
  const employeeId = req.params.id;
  const { name, registration_number } = req.body;

  if (!name || !registration_number) {
    return res.status(400).json({ error: 'Name and registration number required' });
  }

  try {
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if registration number is already taken by another employee
    const duplicate = db.prepare('SELECT * FROM employees WHERE registration_number = ? AND id != ?').get(registration_number, employeeId);
    if (duplicate) {
      return res.status(400).json({ error: 'Registration number already exists' });
    }

    const result = db.prepare('UPDATE employees SET name = ?, registration_number = ? WHERE id = ?')
      .run(name, registration_number, employeeId);

    // Audit logging
    db.prepare(`
      INSERT INTO audit_logs (admin_id, action, endpoint, affected_rows, details) 
      VALUES (?, ?, ?, ?, ?)
    `).run(
      req.admin.id, 
      'UPDATE_EMPLOYEE', 
      `/api/admin/employees/${employeeId}`, 
      result.changes, 
      JSON.stringify({ employeeId, name, registration_number })
    );

    res.json({ id: parseInt(employeeId, 10), name, registration_number });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/employees/:id - Delete employee record (cascading deletes authorizations and logs)
router.delete('/employees/:id', adminAuth, (req, res) => {
  const employeeId = req.params.id;

  try {
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const result = db.prepare('DELETE FROM employees WHERE id = ?').run(employeeId);

    // Audit logging
    db.prepare(`
      INSERT INTO audit_logs (admin_id, action, endpoint, affected_rows, details) 
      VALUES (?, ?, ?, ?, ?)
    `).run(
      req.admin.id, 
      'DELETE_EMPLOYEE', 
      `/api/admin/employees/${employeeId}`, 
      result.changes, 
      JSON.stringify({ employeeId, name: employee.name, registration_number: employee.registration_number })
    );

    res.json({ success: true, message: 'Employee deleted successfully', employeeId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/admins - Get list of administrators (superadmin only)
router.get('/admins', adminAuth, (req, res) => {
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only superadmins can manage administrator accounts' });
  }

  try {
    const admins = db.prepare('SELECT id, username, role, created_at FROM admins ORDER BY username ASC').all();
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/admins - Create a new administrator account (superadmin only)
router.post('/admins', adminAuth, (req, res) => {
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only superadmins can manage administrator accounts' });
  }

  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password and role required' });
  }

  if (role !== 'admin' && role !== 'superadmin') {
    return res.status(400).json({ error: 'Invalid role. Must be admin or superadmin.' });
  }

  try {
    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)')
      .run(username, passwordHash, role);

    // Audit logging
    db.prepare(`
      INSERT INTO audit_logs (admin_id, action, endpoint, affected_rows, details) 
      VALUES (?, ?, ?, ?, ?)
    `).run(
      req.admin.id, 
      'CREATE_ADMIN', 
      '/api/admin/admins', 
      result.changes, 
      JSON.stringify({ adminId: result.lastInsertRowid, username, role })
    );

    res.json({ id: result.lastInsertRowid, username, role });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/admins/:id - Update an administrator account (superadmin only)
router.put('/admins/:id', adminAuth, (req, res) => {
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only superadmins can manage administrator accounts' });
  }

  const adminId = req.params.id;
  const { username, password, role } = req.body;

  if (!username || !role) {
    return res.status(400).json({ error: 'Username and role required' });
  }

  if (role !== 'admin' && role !== 'superadmin') {
    return res.status(400).json({ error: 'Invalid role. Must be admin or superadmin.' });
  }

  try {
    const existing = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);
    if (!existing) {
      return res.status(404).json({ error: 'Administrator not found' });
    }

    // Check if username is taken by another admin
    const duplicate = db.prepare('SELECT * FROM admins WHERE username = ? AND id != ?').get(username, adminId);
    if (duplicate) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    let result;
    if (password) {
      const passwordHash = bcrypt.hashSync(password, 10);
      result = db.prepare('UPDATE admins SET username = ?, password_hash = ?, role = ? WHERE id = ?')
        .run(username, passwordHash, role, adminId);
    } else {
      result = db.prepare('UPDATE admins SET username = ?, role = ? WHERE id = ?')
        .run(username, role, adminId);
    }

    // Audit logging
    db.prepare(`
      INSERT INTO audit_logs (admin_id, action, endpoint, affected_rows, details) 
      VALUES (?, ?, ?, ?, ?)
    `).run(
      req.admin.id, 
      'UPDATE_ADMIN', 
      `/api/admin/admins/${adminId}`, 
      result.changes, 
      JSON.stringify({ adminId, username, role })
    );

    res.json({ id: parseInt(adminId, 10), username, role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/admins/:id - Delete an administrator account (superadmin only)
router.delete('/admins/:id', adminAuth, (req, res) => {
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only superadmins can manage administrator accounts' });
  }

  const adminId = req.params.id;

  // Prevent self-deletion
  if (parseInt(adminId, 10) === req.admin.id) {
    return res.status(400).json({ error: 'Self-deletion is not allowed' });
  }

  try {
    const existing = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);
    if (!existing) {
      return res.status(404).json({ error: 'Administrator not found' });
    }

    const result = db.prepare('DELETE FROM admins WHERE id = ?').run(adminId);

    // Audit logging
    db.prepare(`
      INSERT INTO audit_logs (admin_id, action, endpoint, affected_rows, details) 
      VALUES (?, ?, ?, ?, ?)
    `).run(
      req.admin.id, 
      'DELETE_ADMIN', 
      `/api/admin/admins/${adminId}`, 
      result.changes, 
      JSON.stringify({ adminId, username: existing.username, role: existing.role })
    );

    res.json({ success: true, message: 'Administrator deleted successfully', adminId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
