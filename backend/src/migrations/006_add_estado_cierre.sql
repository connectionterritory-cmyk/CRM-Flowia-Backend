ALTER TABLE Oportunidades ADD COLUMN EstadoCierre TEXT DEFAULT 'Activo';

CREATE INDEX IF NOT EXISTS idx_oportunidad_estado_cierre ON Oportunidades(EstadoCierre);
