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

    // Run migrations inside a transaction
    db.transaction(() => {
      // Run base schema
      db.exec(schemaSql);

      // Ensure migrations tracking table exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS _migrations (
          name TEXT PRIMARY KEY,
          run_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        );
      `);

      // Scan and apply migrations
      const migrationsDir = path.resolve(__dirname, 'migrations');
      if (fs.existsSync(migrationsDir)) {
        const files = fs.readdirSync(migrationsDir)
          .filter(f => f.endsWith('.sql'))
          .sort();

        for (const file of files) {
          const alreadyRun = db.prepare('SELECT 1 FROM _migrations WHERE name = ?').get(file);
          if (!alreadyRun) {
            console.log(`Applying migration: ${file}`);
            const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            try {
              db.exec(migrationSql);
            } catch (err) {
              if (err.message.includes('duplicate column name')) {
                console.log(`Column already exists. Marking migration ${file} as applied.`);
              } else {
                throw err;
              }
            }
            db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
          }
        }
      }
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
