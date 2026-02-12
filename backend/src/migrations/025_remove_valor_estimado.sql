PRAGMA foreign_keys = OFF;

DROP VIEW IF EXISTS Vista_Pipeline_Stats;

ALTER TABLE Oportunidades RENAME TO Oportunidades_old;

CREATE TABLE Oportunidades (
    OportunidadID TEXT PRIMARY KEY,
    ContactoID INTEGER,
    ClienteID INTEGER,
    OrigenID INTEGER,
    Etapa TEXT NOT NULL DEFAULT 'NUEVO_LEAD',
    ProductoInteres TEXT,
    FechaCita DATETIME,
    ProximaAccion TEXT,
    FechaProximaAccion DATETIME,
    RazonPerdida TEXT,
    OwnerUserID INTEGER,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    EstadoCierre TEXT DEFAULT 'Activo',
    ProximoContactoFecha DATETIME,
    MotivoNoInteresado TEXT,
    ReferidoPor TEXT,
    EstadoCivil TEXT,
    NombrePareja TEXT,
    TrabajaActualmente TEXT,
    MejorHoraContacto TEXT,
    RomperHielo INTEGER DEFAULT 0,
    RegaloVisitaEntregado INTEGER DEFAULT 0,
    DemoCompletada INTEGER DEFAULT 0,
    ProgramaVisitaID INTEGER,
    FOREIGN KEY (ContactoID) REFERENCES Contactos(ContactoID) ON DELETE SET NULL,
    FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID) ON DELETE SET NULL,
    FOREIGN KEY (OrigenID) REFERENCES Origenes(OrigenID) ON DELETE SET NULL,
    FOREIGN KEY (OwnerUserID) REFERENCES Usuarios(UsuarioID) ON DELETE SET NULL,
    CHECK (Etapa IN (
        'NUEVO_LEAD',
        'INTENTO_CONTACTO',
        'CONTACTADO',
        'CALIFICACION',
        'CITA_AGENDADA',
        'DEMO_REALIZADA',
        'PROPUESTA',
        'SEGUIMIENTO',
        'CIERRE_GANADO',
        'CIERRE_PERDIDO'
    ))
);

INSERT INTO Oportunidades (
    OportunidadID,
    ContactoID,
    ClienteID,
    OrigenID,
    Etapa,
    ProductoInteres,
    FechaCita,
    ProximaAccion,
    FechaProximaAccion,
    RazonPerdida,
    OwnerUserID,
    CreatedAt,
    UpdatedAt,
    EstadoCierre,
    ProximoContactoFecha,
    MotivoNoInteresado,
    ReferidoPor,
    EstadoCivil,
    NombrePareja,
    TrabajaActualmente,
    MejorHoraContacto,
    RomperHielo,
    RegaloVisitaEntregado,
    DemoCompletada,
    ProgramaVisitaID
)
SELECT
    OportunidadID,
    ContactoID,
    ClienteID,
    OrigenID,
    Etapa,
    ProductoInteres,
    FechaCita,
    ProximaAccion,
    FechaProximaAccion,
    RazonPerdida,
    OwnerUserID,
    CreatedAt,
    UpdatedAt,
    EstadoCierre,
    ProximoContactoFecha,
    MotivoNoInteresado,
    ReferidoPor,
    EstadoCivil,
    NombrePareja,
    TrabajaActualmente,
    MejorHoraContacto,
    RomperHielo,
    RegaloVisitaEntregado,
    DemoCompletada,
    ProgramaVisitaID
FROM Oportunidades_old;

DROP TABLE Oportunidades_old;

CREATE INDEX IF NOT EXISTS idx_oportunidad_contacto ON Oportunidades(ContactoID);
CREATE INDEX IF NOT EXISTS idx_oportunidad_cliente ON Oportunidades(ClienteID);
CREATE INDEX IF NOT EXISTS idx_oportunidad_etapa ON Oportunidades(Etapa);
CREATE INDEX IF NOT EXISTS idx_oportunidad_owner ON Oportunidades(OwnerUserID);
CREATE INDEX IF NOT EXISTS idx_oportunidad_origen ON Oportunidades(OrigenID);
CREATE INDEX IF NOT EXISTS idx_oportunidad_fecha_proxima ON Oportunidades(FechaProximaAccion);
CREATE INDEX IF NOT EXISTS idx_oportunidad_estado_cierre ON Oportunidades(EstadoCierre);

DROP TRIGGER IF EXISTS update_oportunidad_timestamp;
DROP TRIGGER IF EXISTS after_oportunidad_created;

CREATE TRIGGER IF NOT EXISTS update_oportunidad_timestamp
AFTER UPDATE ON Oportunidades
FOR EACH ROW
BEGIN
    UPDATE Oportunidades
    SET UpdatedAt = CURRENT_TIMESTAMP
    WHERE OportunidadID = NEW.OportunidadID;
END;

CREATE TRIGGER IF NOT EXISTS after_oportunidad_created
AFTER INSERT ON Oportunidades
WHEN NEW.ClienteID IS NOT NULL
BEGIN
    UPDATE Clientes
    SET LifecycleStage = 'OPORTUNIDAD'
    WHERE ClienteID = NEW.ClienteID
      AND LifecycleStage = 'LEAD';
END;

CREATE VIEW Vista_Pipeline_Stats AS
SELECT
    Etapa,
    COUNT(*) AS Total,
    0 AS ValorTotal,
    0 AS ValorPromedio,
    COUNT(CASE WHEN FechaProximaAccion <= DATE('now') THEN 1 END) AS AccionesVencidas
FROM Oportunidades
WHERE Etapa NOT IN ('CIERRE_GANADO', 'CIERRE_PERDIDO')
GROUP BY Etapa;

PRAGMA foreign_keys = ON;
