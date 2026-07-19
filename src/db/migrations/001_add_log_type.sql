-- Migration 001: Add log type column to logs table
ALTER TABLE logs ADD COLUMN type TEXT NOT NULL DEFAULT 'punch_in';
