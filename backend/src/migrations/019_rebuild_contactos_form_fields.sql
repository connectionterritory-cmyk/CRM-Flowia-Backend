-- CONTACTOS_FORM_FIELDS
PRAGMA foreign_keys = OFF;

DROP VIEW IF EXISTS Vista_Pipeline_Stats;
DROP TRIGGER IF EXISTS after_oportunidad_ganada;

CREATE TABLE Contactos_new (
    ContactoID INTEGER PRIMARY KEY AUTOINCREMENT,
    NombreCompleto TEXT NOT NULL,
    Telefono TEXT NOT NULL,
    Email TEXT,
    Direccion TEXT,
    Ciudad TEXT,
    Estado TEXT,
    Zipcode TEXT,
    Pais TEXT NOT NULL DEFAULT 'Estados Unidos',
    EstadoCivil TEXT,
    NombrePareja TEXT,
    TrabajaActualmente TEXT,
    MejorHoraContacto TEXT,
    OrigenFuente TEXT,
    ReferidoPorId INTEGER,
    Convertido INTEGER NOT NULL DEFAULT 0,
    ClienteID INTEGER,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID) ON DELETE SET NULL
);

INSERT INTO Contactos_new (
    ContactoID,
    NombreCompleto,
    Telefono,
    Email,
    Direccion,
    Ciudad,
    Estado,
    Zipcode,
    Pais,
    EstadoCivil,
    NombrePareja,
    TrabajaActualmente,
    MejorHoraContacto,
    OrigenFuente,
    ReferidoPorId,
    Convertido,
    ClienteID,
    CreatedAt,
    UpdatedAt
)
SELECT
    ContactoID,
    NombreCompleto,
    COALESCE(Telefono, ''),
    Email,
    Direccion,
    Ciudad,
    Estado,
    Zipcode,
    COALESCE(Pais, 'Estados Unidos'),
    EstadoCivil,
    NombrePareja,
    TrabajaActualmente,
    MejorHoraContacto,
    OrigenFuente,
    ReferidoPorId,
    COALESCE(Convertido, 0),
    ClienteID,
    CreatedAt,
    UpdatedAt
FROM Contactos;

DROP TABLE Contactos;
ALTER TABLE Contactos_new RENAME TO Contactos;

CREATE INDEX IF NOT EXISTS idx_contactos_nombre ON Contactos(NombreCompleto);
CREATE INDEX IF NOT EXISTS idx_contactos_convertido ON Contactos(Convertido);

CREATE TABLE Oportunidades_new (
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

INSERT INTO Oportunidades_new (
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
FROM Oportunidades;

DROP TABLE Oportunidades;
ALTER TABLE Oportunidades_new RENAME TO Oportunidades;

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

CREATE TABLE Programas_new (
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

INSERT INTO Programas_new (
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
FROM Programas;

DROP TABLE Programas;
ALTER TABLE Programas_new RENAME TO Programas;

CREATE UNIQUE INDEX IF NOT EXISTS idx_programa_oportunidad ON Programas(OportunidadID);
CREATE INDEX IF NOT EXISTS idx_programa_tipo ON Programas(TipoPrograma);

CREATE VIEW Vista_Pipeline_Stats AS
SELECT
    Etapa,
    COUNT(*) AS Total,
    SUM(COALESCE(ValorEstimado, 0)) AS ValorTotal,
    AVG(COALESCE(ValorEstimado, 0)) AS ValorPromedio,
    COUNT(CASE WHEN FechaProximaAccion <= DATE('now') THEN 1 END) AS AccionesVencidas
FROM Oportunidades
WHERE Etapa NOT IN ('CIERRE_GANADO', 'CIERRE_PERDIDO')
GROUP BY Etapa;

PRAGMA foreign_keys = ON;
