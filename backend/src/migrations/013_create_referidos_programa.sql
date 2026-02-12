CREATE TABLE IF NOT EXISTS ReferidosPrograma (
    ReferidoID INTEGER PRIMARY KEY AUTOINCREMENT,
    ProgramaID INTEGER NOT NULL,
    Nombre TEXT NOT NULL,
    Telefono TEXT,
    Ciudad TEXT NOT NULL,
    EstadoCivil TEXT,
    MejorHoraContacto TEXT,
    TrabajaActualmente TEXT,
    EstadoReferido TEXT DEFAULT 'Nuevo',
    Notas TEXT,
    FOREIGN KEY (ProgramaID) REFERENCES Programas(ProgramaID) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_referido_programa ON ReferidosPrograma(ProgramaID);
CREATE INDEX IF NOT EXISTS idx_referido_estado ON ReferidosPrograma(EstadoReferido);
