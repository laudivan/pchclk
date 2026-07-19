import app from './app.js';
import { config } from './config/index.js';
import { runMigrations } from './db/migrate.js';
import { runSeeds } from './db/seed.js';

console.log(`Starting PchClk Backend in [${config.nodeEnv}] mode...`);

// Run migrations on start
runMigrations();

// Run seeds in development mode
if (config.nodeEnv === 'development') {
  runSeeds();
}

// Bind server port and listen
app.listen(config.port, '0.0.0.0', () => {
  console.log(`PchClk Backend server is running on http://localhost:${config.port}`);
});
