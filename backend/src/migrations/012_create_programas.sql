CREATE TABLE IF NOT EXISTS Programas (
    ProgramaID INTEGER PRIMARY KEY AUTOINCREMENT,
    OportunidadID TEXT NOT NULL,
    ContactoID INTEGER NOT NULL,
    TipoPrograma TEXT NOT NULL,
    RegaloElegido TEXT,
    EstadoRegalo TEXT DEFAULT 'Pendiente',
    FechaInicio DATE DEFAULT CURRENT_DATE,
    MetaReferidos INTEGER NOT NULL,
    MetaDemos INTEGER NOT NULL,
    Notas TEXT,
    FOREIGN KEY (OportunidadID) REFERENCES Oportunidades(OportunidadID) ON DELETE CASCADE,
    FOREIGN KEY (ContactoID) REFERENCES Clientes(ClienteID) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_programa_oportunidad ON Programas(OportunidadID);
CREATE INDEX IF NOT EXISTS idx_programa_tipo ON Programas(TipoPrograma);
