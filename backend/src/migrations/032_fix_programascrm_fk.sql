PRAGMA foreign_keys = OFF;

ALTER TABLE ProgramasReferidosCRM RENAME TO ProgramasReferidosCRM_old;

CREATE TABLE ProgramasReferidosCRM (
    ReferidoID TEXT PRIMARY KEY,
    ProgramaID TEXT NOT NULL,
    NombreCompleto TEXT NOT NULL,
    Telefono TEXT,
    Estado TEXT NOT NULL DEFAULT 'NUEVO' CHECK (Estado IN ('NUEVO', 'CONTACTADO', 'CITA', 'DEMO', 'VENTA', 'NO_INTERESA')),
    CreatedLeadID TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    NombrePareja TEXT,
    Direccion TEXT,
    Ciudad TEXT,
    EstadoLugar TEXT,
    Zipcode TEXT,
    Relacion TEXT,
    TrabajaActualmente TEXT,
    MejorHoraContacto TEXT,
    PropietarioCasa TEXT,
    ConoceRoyalPrestige TEXT,
    Prioridad INTEGER DEFAULT 0,
    PrioridadNota TEXT,
    Notas TEXT,
    EstadoCivil TEXT,
    CreatedOpportunityID TEXT,
    FOREIGN KEY (ProgramaID) REFERENCES ProgramasCRM(ProgramaID) ON DELETE CASCADE
);

INSERT INTO ProgramasReferidosCRM (
    ReferidoID,
    ProgramaID,
    NombreCompleto,
    Telefono,
    Estado,
    CreatedLeadID,
    CreatedAt,
    UpdatedAt,
    NombrePareja,
    Direccion,
    Ciudad,
    EstadoLugar,
    Zipcode,
    Relacion,
    TrabajaActualmente,
    MejorHoraContacto,
    PropietarioCasa,
    ConoceRoyalPrestige,
    Prioridad,
    PrioridadNota,
    Notas,
    EstadoCivil,
    CreatedOpportunityID
)
SELECT
    ReferidoID,
    ProgramaID,
    NombreCompleto,
    Telefono,
    Estado,
    CreatedLeadID,
    CreatedAt,
    UpdatedAt,
    NombrePareja,
    Direccion,
    Ciudad,
    EstadoLugar,
    Zipcode,
    Relacion,
    TrabajaActualmente,
    MejorHoraContacto,
    PropietarioCasa,
    ConoceRoyalPrestige,
    Prioridad,
    PrioridadNota,
    Notas,
    EstadoCivil,
    CreatedOpportunityID
FROM ProgramasReferidosCRM_old;

DROP TABLE ProgramasReferidosCRM_old;

CREATE INDEX IF NOT EXISTS idx_programas_ref_programa ON ProgramasReferidosCRM(ProgramaID);
CREATE INDEX IF NOT EXISTS idx_programas_ref_estado ON ProgramasReferidosCRM(Estado);

ALTER TABLE ProgramasEventosCRM RENAME TO ProgramasEventosCRM_old;

CREATE TABLE ProgramasEventosCRM (
    EventoID TEXT PRIMARY KEY,
    ProgramaID TEXT NOT NULL,
    TipoEvento TEXT NOT NULL,
    PayloadJSON TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ProgramaID) REFERENCES ProgramasCRM(ProgramaID) ON DELETE CASCADE
);

INSERT INTO ProgramasEventosCRM (
    EventoID,
    ProgramaID,
    TipoEvento,
    PayloadJSON,
    CreatedAt
)
SELECT
    EventoID,
    ProgramaID,
    TipoEvento,
    PayloadJSON,
    CreatedAt
FROM ProgramasEventosCRM_old;

DROP TABLE ProgramasEventosCRM_old;

CREATE INDEX IF NOT EXISTS idx_programas_eventos_programa ON ProgramasEventosCRM(ProgramaID);

PRAGMA foreign_keys = ON;
