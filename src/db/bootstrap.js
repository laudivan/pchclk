import bcrypt from 'bcryptjs';
import db from '../config/db.js';

/**
 * Bootstraps the database with the default superadmin account.
 * Only inserts the admin if no admins exist at all — fully idempotent.
 * Runs in all environments (development and production).
 */
export function runBootstrap() {
  console.log('Running database bootstrap...');
  try {
    db.transaction(() => {
      const adminExists = db.prepare('SELECT 1 FROM admins LIMIT 1').get();

      if (!adminExists) {
        const passwordHash = bcrypt.hashSync('admin', 10);
        db.prepare('INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)')
          .run('admin', passwordHash, 'superadmin');
        console.log('Bootstrap: default superadmin created (username: admin, password: admin).');
        console.log('⚠  Change the default password immediately after first login!');
      } else {
        console.log('Bootstrap: admin account already exists, skipping.');
      }
    })();

    console.log('Database bootstrap completed.');
  } catch (error) {
    console.error('Error during database bootstrap:', error);
    process.exit(1);
  }
}
