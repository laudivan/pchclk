import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runMigrations() {
  console.log('Running database migrations...');
  try {
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Run schema commands inside a transaction
    db.transaction(() => {
      db.exec(schemaSql);
    })();

    console.log('Database migrations completed successfully.');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Allow direct execution
const isDirectRun = () => {
  try {
    const mainScriptPath = fs.realpathSync(process.argv[1]);
    const currentScriptPath = fileURLToPath(import.meta.url);
    return mainScriptPath === currentScriptPath;
  } catch {
    return false;
  }
};

if (isDirectRun()) {
  runMigrations();
  process.exit(0);
}
