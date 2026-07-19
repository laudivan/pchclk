import bcrypt from 'bcryptjs';
import db from '../config/db.js';

export function runSeeds() {
  console.log('Running database seeding...');
  try {
    db.transaction(() => {
      // Check if admin already exists
      const adminExists = db.prepare('SELECT 1 FROM admins WHERE username = ?').get('admin');
      
      if (!adminExists) {
        // Hash password
        const passwordHash = bcrypt.hashSync('admin', 10);
        
        // Insert admin
        db.prepare('INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)')
          .run('admin', passwordHash, 'superadmin');
        console.log('Seeded default admin (username: admin, password: admin)');
      }

      // Seed employees if none exist
      const employeeCount = db.prepare('SELECT count(*) as count FROM employees').get().count;
      if (employeeCount === 0) {
        const insertEmployee = db.prepare('INSERT INTO employees (uuid, name, registration_number) VALUES (?, ?, ?)');
        const insertDeviceAuth = db.prepare('INSERT INTO device_authorizations (employee_id, auth_code, expires_at) VALUES (?, ?, ?)');

        // Employee 1
        const emp1Result = insertEmployee.run('71a2e3a8-6cd5-4f40-8b6f-71a39f688001', 'José Silva', 'EMP001');
        // Pre-create authorization code 123456 for José
        insertDeviceAuth.run(emp1Result.lastInsertRowid, '123456', '2030-01-01T00:00:00Z');

        // Employee 2
        const emp2Result = insertEmployee.run('71a2e3a8-6cd5-4f40-8b6f-71a39f688002', 'Maria Santos', 'EMP002');
        insertDeviceAuth.run(emp2Result.lastInsertRowid, '654321', '2030-01-01T00:00:00Z');

        // Employee 3
        insertEmployee.run('71a2e3a8-6cd5-4f40-8b6f-71a39f688003', 'Antônio Souza', 'EMP003');

        console.log('Seeded 3 employees and device authorizations (codes: 123456, 654321)');
      } else {
        console.log('Employees already present, skipping employee seeding.');
      }
    })();

    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error running seeds:', error);
    process.exit(1);
  }
}

// Allow direct execution
import fs from 'fs';
import { fileURLToPath } from 'url';
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
  runSeeds();
  process.exit(0);
}
