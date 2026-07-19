import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { config } from './index.js';

// Ensure database directory exists before establishing connection
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Establish the SQLite database connection using native DatabaseSync
const db = new DatabaseSync(config.dbPath);

// Compatibility helpers to match better-sqlite3 API
db.pragma = (pragmaStr) => {
  return db.prepare(`PRAGMA ${pragmaStr}`).get();
};

db.transaction = (fn) => {
  return (...args) => {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (error) {
      console.error('Underlying transaction error:', error);
      db.exec('ROLLBACK');
      throw error;
    }
  };
};

// Enable WAL journal mode and configure robust pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

export default db;
