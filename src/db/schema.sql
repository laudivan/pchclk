-- SQLite Schema for PchClk (WAL enabled)

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin', -- 'admin', 'superadmin'
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    registration_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive'
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Device Authorizations table
CREATE TABLE IF NOT EXISTS device_authorizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    auth_code TEXT NOT NULL UNIQUE,
    device_key TEXT UNIQUE, -- local device paired token (paired_at sets this)
    paired_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1, -- 1 = active, 0 = revoked/inactive
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    expires_at TEXT NOT NULL,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Logs (Punch Clock events) table
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    device_key TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'punch_in',
    hash_validated INTEGER NOT NULL DEFAULT 1, -- 1 = validated QR hash, 0 = direct/bypass
    qr_token TEXT,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    admin_id INTEGER,
    action TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    affected_rows INTEGER NOT NULL DEFAULT 0,
    details TEXT,
    FOREIGN KEY(admin_id) REFERENCES admins(id) ON DELETE SET NULL
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_employees_uuid ON employees(uuid);
CREATE INDEX IF NOT EXISTS idx_device_auth_key ON device_authorizations(device_key);
CREATE INDEX IF NOT EXISTS idx_device_auth_code ON device_authorizations(auth_code);
CREATE INDEX IF NOT EXISTS idx_logs_employee_time ON logs(employee_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
