import express from 'express';
import crypto from 'crypto';
import db from '../config/db.js';

const router = express.Router();

// Helper to generate dynamic QR validation hash for a 15-minute block
const generateHashForBlock = (timestampMs, secret) => {
  const interval = 15 * 60 * 1000; // 15 minutes
  const blockTime = Math.floor(timestampMs / interval) * interval;
  return crypto.createHmac('sha256', secret).update(String(blockTime)).digest('hex');
};

// POST /api/punch - Register employee clock-in
router.post('/', (req, res) => {
  const { device_key, token } = req.body;

  if (!device_key) {
    return res.status(400).json({ error: 'Device key is required' });
  }

  try {
    // 1. Fetch active device authorization and matching employee status
    const auth = db.prepare(`
      SELECT da.*, e.id as emp_id, e.status as emp_status
      FROM device_authorizations da
      JOIN employees e ON da.employee_id = e.id
      WHERE da.device_key = ? AND da.is_active = 1
    `).get(device_key);

    if (!auth) {
      return res.status(401).json({ error: 'Device is not paired or authorization is inactive' });
    }

    if (auth.emp_status !== 'active') {
      return res.status(403).json({ error: 'Employee account is inactive' });
    }

    // 2. Reconcile dynamic validation token
    let hash_validated = 0;
    if (token) {
      const secret = process.env.JWT_SECRET || 'fallback-tv-secret';
      const now = Date.now();
      
      const currentHash = generateHashForBlock(now, secret);
      const previousHash = generateHashForBlock(now - 15 * 60 * 1000, secret);

      if (token === currentHash || token === previousHash) {
        hash_validated = 1;
      } else {
        return res.status(400).json({ error: 'Invalid or expired QR code' });
      }
    }

    // 3. Register punch log entry
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const nowIso = new Date().toISOString();

    db.prepare(`
      INSERT INTO logs (employee_id, timestamp, device_key, hash_validated, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(auth.emp_id, nowIso, device_key, hash_validated, ip, userAgent);

    res.json({
      success: true,
      message: hash_validated === 1 ? 'Punch registered successfully' : 'Punch registered via manual bypass',
      hash_validated
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
