-- Migration 002: Add qr_token column to logs table
ALTER TABLE logs ADD COLUMN qr_token TEXT;
