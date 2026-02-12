CREATE TABLE IF NOT EXISTS ProgramasReferencias (
    ReferenciaID TEXT PRIMARY KEY,
    ProgramaID TEXT NOT NULL,
    FileName TEXT NOT NULL,
    FilePath TEXT NOT NULL,
    FileType TEXT NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ProgramaID) REFERENCES ProgramasCRM(ProgramaID) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_programas_referencias_programa ON ProgramasReferencias(ProgramaID);
