import express from 'express';
import cors from 'cors';
import { i18n } from './middleware/i18n.js';
import db from './config/db.js';
import adminRouter from './routes/admin.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(i18n);

// Mount admin routes
app.use('/api/admin', adminRouter);

// Health Check endpoint
app.get('/api/health', (req, res) => {
  try {
    // Execute a simple DB query to verify readiness
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
app.get('/', (req, res) => {
  res.json({
    project: 'PchClk API',
    message: res.t('welcome'),
    version: '1.0.0'
  });
});

// Catch-all route handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: res.t('route_not_found')
  });
});

export default app;
