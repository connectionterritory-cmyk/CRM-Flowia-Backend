DROP TRIGGER IF EXISTS after_oportunidad_ganada;

ALTER TABLE Oportunidades RENAME TO Oportunidades_old;

CREATE TABLE Oportunidades (
    OportunidadID TEXT PRIMARY KEY,
    ContactoID INTEGER,
    ClienteID INTEGER,
    OrigenID INTEGER,
    Etapa TEXT NOT NULL DEFAULT 'NUEVO_LEAD',
    ProductoInteres TEXT,
    ValorEstimado DECIMAL(10,2),
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
    ValorEstimado,
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
    MejorHoraContacto
)
SELECT
    OportunidadID,
    NULL as ContactoID,
    ContactoID as ClienteID,
    OrigenID,
    Etapa,
    ProductoInteres,
    ValorEstimado,
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
    MejorHoraContacto
FROM Oportunidades_old;

DROP TABLE Oportunidades_old;

CREATE INDEX IF NOT EXISTS idx_oportunidad_contacto ON Oportunidades(ContactoID);
CREATE INDEX IF NOT EXISTS idx_oportunidad_cliente ON Oportunidades(ClienteID);
CREATE INDEX IF NOT EXISTS idx_oportunidad_etapa ON Oportunidades(Etapa);
CREATE INDEX IF NOT EXISTS idx_oportunidad_owner ON Oportunidades(OwnerUserID);
CREATE INDEX IF NOT EXISTS idx_oportunidad_origen ON Oportunidades(OrigenID);
CREATE INDEX IF NOT EXISTS idx_oportunidad_fecha_proxima ON Oportunidades(FechaProximaAccion);

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
