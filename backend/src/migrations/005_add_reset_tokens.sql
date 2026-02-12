-- Migration: Add ResetToken and ResetTokenExpiry to Usuarios table

ALTER TABLE Usuarios ADD COLUMN ResetToken TEXT;
ALTER TABLE Usuarios ADD COLUMN ResetTokenExpiry DATETIME;
