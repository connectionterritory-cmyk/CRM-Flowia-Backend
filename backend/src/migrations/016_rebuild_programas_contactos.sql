ALTER TABLE Programas RENAME TO Programas_old;

CREATE TABLE Programas (
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
    FOREIGN KEY (ContactoID) REFERENCES Contactos(ContactoID) ON DELETE CASCADE
);

INSERT INTO Programas (
    ProgramaID,
    OportunidadID,
    ContactoID,
    TipoPrograma,
    RegaloElegido,
    EstadoRegalo,
    FechaInicio,
    MetaReferidos,
    MetaDemos,
    Notas
)
SELECT
    ProgramaID,
    OportunidadID,
    ContactoID,
    TipoPrograma,
    RegaloElegido,
    EstadoRegalo,
    FechaInicio,
    MetaReferidos,
    MetaDemos,
    Notas
FROM Programas_old;

DROP TABLE Programas_old;

CREATE UNIQUE INDEX IF NOT EXISTS idx_programa_oportunidad ON Programas(OportunidadID);
CREATE INDEX IF NOT EXISTS idx_programa_tipo ON Programas(TipoPrograma);
