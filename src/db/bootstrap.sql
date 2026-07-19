-- =============================================================================
-- PchClk - Database Bootstrap Script
-- =============================================================================
-- Run with: sqlite3 pchclk.db < bootstrap.sql
--
-- This script creates all tables, indexes, and seeds the default superadmin.
-- It is idempotent: safe to run on an existing database (uses IF NOT EXISTS
-- and INSERT OR IGNORE).
--
-- Default credentials:  username: admin  |  password: admin
-- ⚠  Change the password immediately after first login in production!
-- =============================================================================

-- Enable Write-Ahead Logging for concurrent read performance
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'admin', -- 'admin' | 'superadmin'
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS employees (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid                TEXT    NOT NULL UNIQUE,
    name                TEXT    NOT NULL,
    registration_number TEXT    NOT NULL UNIQUE,
    status              TEXT    NOT NULL DEFAULT 'active', -- 'active' | 'inactive'
    created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS device_authorizations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    auth_code   TEXT    NOT NULL UNIQUE,
    device_key  TEXT    UNIQUE,
    paired_at   TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1, -- 1 = active, 0 = revoked
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    expires_at  TEXT    NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS logs (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id    INTEGER NOT NULL,
    timestamp      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    device_key     TEXT    NOT NULL,
    type           TEXT    NOT NULL DEFAULT 'punch_in',
    hash_validated INTEGER NOT NULL DEFAULT 1, -- 1 = QR hash validated, 0 = bypass
    ip_address     TEXT,
    user_agent     TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    admin_id      INTEGER,
    action        TEXT    NOT NULL,
    endpoint      TEXT    NOT NULL,
    affected_rows INTEGER NOT NULL DEFAULT 0,
    details       TEXT,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_employees_uuid        ON employees(uuid);
CREATE INDEX IF NOT EXISTS idx_device_auth_key       ON device_authorizations(device_key);
CREATE INDEX IF NOT EXISTS idx_device_auth_code      ON device_authorizations(auth_code);
CREATE INDEX IF NOT EXISTS idx_logs_employee_time    ON logs(employee_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp        ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp  ON audit_logs(timestamp);

-- -----------------------------------------------------------------------------
-- Default superadmin  (password: admin — bcrypt cost 10)
-- INSERT OR IGNORE makes this idempotent; won't overwrite an existing user.
-- -----------------------------------------------------------------------------

INSERT OR IGNORE INTO admins (username, password_hash, role)
VALUES (
    'admin',
    '$2a$10$MpSQa5yecSbSC9VLwDYFJ.2jh77RbRJF60Dm0Gd8/jUDY/Uzk1Yo6',
    'superadmin'
);
