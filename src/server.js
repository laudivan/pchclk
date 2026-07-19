import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { config } from './config/index.js';
import { runMigrations } from './db/migrate.js';
import { runBootstrap } from './db/bootstrap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`Starting PchClk Backend in [${config.nodeEnv}] mode...`);

// Run schema migrations on every start (idempotent)
runMigrations();

// Bootstrap default superadmin if no admins exist (runs in all environments)
runBootstrap();

// --- TLS Setup ---
const certDir  = path.resolve(__dirname, '../certs');
const certPath = path.join(certDir, 'cert.pem');
const keyPath  = path.join(certDir, 'key.pem');

const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);

if (hasCerts) {
  const httpsPort = config.port;        // 3000 → HTTPS
  const httpPort  = config.port + 1;   // 3001 → plain HTTP redirect

  const tlsOptions = {
    cert: fs.readFileSync(certPath),
    key:  fs.readFileSync(keyPath),
  };

  // HTTPS server (primary)
  https.createServer(tlsOptions, app).listen(httpsPort, '0.0.0.0', () => {
    console.log(`PchClk HTTPS server is running on https://localhost:${httpsPort}`);
  });

  // HTTP → HTTPS redirect server
  const redirectApp = (req, res) => {
    const host = (req.headers.host || '').replace(`:${httpPort}`, `:${httpsPort}`);
    res.writeHead(301, { Location: `https://${host}${req.url}` });
    res.end();
  };
  http.createServer(redirectApp).listen(httpPort, '0.0.0.0', () => {
    console.log(`PchClk HTTP redirect server is running on http://localhost:${httpPort} → https`);
  });

} else {
  // Fallback: plain HTTP (development without certs)
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`PchClk HTTP server is running on http://localhost:${config.port} (no TLS certs found)`);
  });
}
