import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { i18n } from './middleware/i18n.js';
import db from './config/db.js';
import adminRouter from './routes/admin.js';
import punchRouter from './routes/punch.js';
import deviceRouter from './routes/device.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(i18n);

// Mount admin routes
app.use('/api/admin', adminRouter);

// Mount public punch routes
app.use('/api/punch', punchRouter);

// Mount public device pairing/log routes
app.use('/api/device', deviceRouter);

// Public TV Token rotation endpoint (HMAC-SHA256 based on 15m intervals)
app.get('/api/tv/token', (req, res) => {
  try {
    const now = Date.now();
    const interval = 15 * 60 * 1000; // 15 minutes
    const currentBlock = Math.floor(now / interval) * interval;
    const secret = process.env.JWT_SECRET || 'fallback-tv-secret';

    const token = crypto
      .createHmac('sha256', secret)
      .update(String(currentBlock))
      .digest('hex');

    const nextBlock = currentBlock + interval;
    const expiresIn = Math.max(0, Math.floor((nextBlock - now) / 1000));

    res.json({
      token,
      expires_in: expiresIn
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate TV token' });
  }
});

// Health Check endpoint
app.get('/api/health', (req, res) => {
  try {
    const dbStatus = db.prepare("PRAGMA journal_mode").get();
    
    res.json({
      status: 'OK',
      message: res.t('health_ok'),
      database: {
        journal_mode: dbStatus.journal_mode,
        type: 'sqlite'
      },
      locale: res.locale,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: res.t('db_error'),
      error: error.message
    });
  }
});

// API Welcome endpoint
app.get('/api', (req, res) => {
  res.json({
    project: 'PchClk API',
    message: res.t('welcome'),
    version: '1.0.0'
  });
});

// Serve static assets in production
const publicPath = path.resolve('public');
app.use(express.static(publicPath));

// Route for Smart TV view
app.get('/pchclk', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'), (err) => {
    if (err) {
      // In development mode, redirect developer locally to Vite port 5173
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>PchClk Smart TV</title>
          <script>
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
              window.location.href = 'http://' + window.location.hostname + ':5173/pchclk';
            }
          </script>
        </head>
        <body style="background:#0a0b10; color:#fff; font-family:sans-serif; text-align:center; padding-top:20%;">
          <h2>PchClk Smart TV (Development Mode)</h2>
          <p>Redirecting to Vite development server at port 5173...</p>
        </body>
        </html>
      `);
    }
  });
});

// Admin panel route serving index.html
app.get('/admin', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>PchClk Admin</title>
          <script>
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
              window.location.href = 'http://' + window.location.hostname + ':5173/';
            }
          </script>
        </head>
        <body style="background:#0a0b10; color:#fff; font-family:sans-serif; text-align:center; padding-top:20%;">
          <h2>PchClk Admin (Development Mode)</h2>
          <p>Redirecting to Vite development server at port 5173...</p>
        </body>
        </html>
      `);
    }
  });
});

// Root route handler serving index.html or welcome API depending on headers
app.get('/', (req, res) => {
  if (req.accepts('html')) {
    res.sendFile(path.join(publicPath, 'index.html'), (err) => {
      if (err) {
        res.json({
          project: 'PchClk API',
          message: res.t('welcome'),
          version: '1.0.0'
        });
      }
    });
  } else {
    res.json({
      project: 'PchClk API',
      message: res.t('welcome'),
      version: '1.0.0'
    });
  }
});

// Catch-all route handler for undefined API routes
app.use((req, res) => {
  res.status(404).json({
    error: res.t('route_not_found')
  });
});

export default app;
