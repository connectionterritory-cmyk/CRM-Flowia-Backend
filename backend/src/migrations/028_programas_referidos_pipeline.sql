ALTER TABLE ProgramasReferidosCRM ADD COLUMN EstadoCivil TEXT;
ALTER TABLE ProgramasReferidosCRM ADD COLUMN CreatedOpportunityID TEXT;

ALTER TABLE Oportunidades ADD COLUMN ProgramaID TEXT;
ALTER TABLE Oportunidades ADD COLUMN ProgramaTipo TEXT;
ALTER TABLE Oportunidades ADD COLUMN ReferidoPorTipo TEXT;
ALTER TABLE Oportunidades ADD COLUMN ReferidoPorId INTEGER;

CREATE INDEX IF NOT EXISTS idx_oportunidad_programa ON Oportunidades(ProgramaID);
