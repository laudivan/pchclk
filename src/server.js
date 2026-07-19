import app from './app.js';
import { config } from './config/index.js';
import { runMigrations } from './db/migrate.js';
import { runBootstrap } from './db/bootstrap.js';

console.log(`Starting PchClk Backend in [${config.nodeEnv}] mode...`);

// Run schema migrations on every start (idempotent)
runMigrations();

// Bootstrap default superadmin if no admins exist (runs in all environments)
runBootstrap();

// Bind server port and listen
app.listen(config.port, '0.0.0.0', () => {
  console.log(`PchClk Backend server is running on http://localhost:${config.port}`);
});
