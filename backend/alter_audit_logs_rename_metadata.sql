-- Rename metadata to entry_metadata in audit_logs (metadata is reserved by SQLAlchemy)
ALTER TABLE audit_logs RENAME COLUMN metadata TO entry_metadata;
