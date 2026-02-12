ALTER TABLE Contactos ADD COLUMN phone_digits TEXT;
ALTER TABLE Contactos ADD COLUMN phone_e164 TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contactos_phone_e164 ON Contactos(phone_e164);
