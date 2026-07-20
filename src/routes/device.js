import express from 'express';
import crypto from 'crypto';
import db from '../config/db.js';
import { config } from '../config/index.js';

const router = express.Router();

// POST /api/device/pair - Pair employee PWA device using 6-digit code
router.post('/pair', (req, res) => {
  const { auth_code } = req.body;

  if (!auth_code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  try {
    // 1. Fetch active, unexpired authorization matching the code
    const nowIso = new Date().toISOString();
    const auth = db.prepare(`
      SELECT da.*, e.name as employee_name, e.registration_number, e.status as employee_status
      FROM device_authorizations da
      JOIN employees e ON da.employee_id = e.id
      WHERE da.auth_code = ? AND da.is_active = 1 AND da.expires_at > ?
    `).get(auth_code, nowIso);

    if (!auth) {
      return res.status(400).json({ error: 'Invalid or expired authorization code' });
    }

    if (auth.employee_status !== 'active') {
      return res.status(403).json({ error: 'Employee account is inactive' });
    }

    // 2. Generate secure unique device key
    const deviceKey = crypto.randomBytes(32).toString('hex');
    const pairedAtIso = new Date().toISOString();

    db.transaction(() => {
      // Deactivate all other device authorizations for this employee (only one device paired at a time)
      db.prepare(`
        UPDATE device_authorizations 
        SET is_active = 0 
        WHERE employee_id = ? AND id != ?
      `).run(auth.employee_id, auth.id);

      // Activate and bind device key to this auth record
      db.prepare(`
        UPDATE device_authorizations
        SET device_key = ?, paired_at = ?
        WHERE id = ?
      `).run(deviceKey, pairedAtIso, auth.id);
    })();

    res.json({
      success: true,
      device_key: deviceKey,
      employee: {
        name: auth.employee_name,
        registration_number: auth.registration_number
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/device/verify - Verify device key pairing status
router.get('/verify', (req, res) => {
  const { device_key } = req.query;

  if (!device_key) {
    return res.status(400).json({ error: 'Device key is required' });
  }

  try {
    const auth = db.prepare(`
      SELECT 1
      FROM device_authorizations da
      JOIN employees e ON da.employee_id = e.id
      WHERE da.device_key = ? AND da.is_active = 1 AND e.status = 'active'
    `).get(device_key);

    res.json({ paired: !!auth });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/device/logs - Fetch logs for the last 3 months for paired device
router.get('/logs', (req, res) => {
  const { device_key } = req.query;

  if (!device_key) {
    return res.status(400).json({ error: 'Device key is required' });
  }

  try {
    // Verify active device pairing
    const auth = db.prepare(`
      SELECT da.*, e.status as employee_status
      FROM device_authorizations da
      JOIN employees e ON da.employee_id = e.id
      WHERE da.device_key = ? AND da.is_active = 1
    `).get(device_key);

    if (!auth) {
      return res.status(401).json({ error: 'Device is not paired or inactive' });
    }

    if (auth.employee_status !== 'active') {
      return res.status(403).json({ error: 'Employee account is inactive' });
    }

    // Fetch logs for this device from the last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const logs = db.prepare(`
      SELECT l.*
      FROM logs l
      WHERE l.device_key = ? AND l.timestamp >= ?
      ORDER BY l.timestamp DESC
    `).all(device_key, threeMonthsAgo.toISOString());

    res.json({
      success: true,
      globalStartDay: config.globalStartDay,
      logs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
