-- Add invite/reset fields and normalized auth columns
ALTER TABLE Usuarios ADD COLUMN password_hash TEXT;
ALTER TABLE Usuarios ADD COLUMN invite_token_hash TEXT;
ALTER TABLE Usuarios ADD COLUMN invite_expires_at DATETIME;
ALTER TABLE Usuarios ADD COLUMN reset_token_hash TEXT;
ALTER TABLE Usuarios ADD COLUMN reset_expires_at DATETIME;
ALTER TABLE Usuarios ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE Usuarios ADD COLUMN last_login_at DATETIME;

-- Backfill from legacy columns if present
UPDATE Usuarios
SET password_hash = COALESCE(password_hash, Password);

UPDATE Usuarios
SET is_active = COALESCE(is_active, Activo, 1);

UPDATE Usuarios
SET last_login_at = COALESCE(last_login_at, UltimoAcceso);
