PRAGMA foreign_keys = OFF;

DROP VIEW IF EXISTS Vista_Pipeline_Stats;
DROP TRIGGER IF EXISTS update_oportunidad_timestamp;
DROP TRIGGER IF EXISTS after_oportunidad_created;

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
    RomperHielo INTEGER DEFAULT 0,
    RegaloVisitaEntregado INTEGER DEFAULT 0,
    DemoCompletada INTEGER DEFAULT 0,
    ProgramaVisitaID INTEGER,
    ProgramaID TEXT,
    ProgramaTipo TEXT,
    ReferidoPorId INTEGER,
    source TEXT,
    source_name TEXT,
    assigned_to_user_id INTEGER,
    ReferidoPorTipo TEXT,
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
    MejorHoraContacto,
    RomperHielo,
    RegaloVisitaEntregado,
    DemoCompletada,
    ProgramaVisitaID,
    ProgramaID,
    ProgramaTipo,
    ReferidoPorId,
    source,
    source_name,
    assigned_to_user_id,
    ReferidoPorTipo
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
    MejorHoraContacto,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
FROM Oportunidades_old;

DROP TABLE Oportunidades_old;

CREATE INDEX IF NOT EXISTS idx_oportunidad_contacto ON Oportunidades(ContactoID);
CREATE INDEX IF NOT EXISTS idx_oportunidad_cliente ON Oportunidades(ClienteID);
CREATE INDEX IF NOT EXISTS idx_oportunidad_etapa ON Oportunidades(Etapa);
CREATE INDEX IF NOT EXISTS idx_oportunidad_owner ON Oportunidades(OwnerUserID);
CREATE INDEX IF NOT EXISTS idx_oportunidad_origen ON Oportunidades(OrigenID);
CREATE INDEX IF NOT EXISTS idx_oportunidad_fecha_proxima ON Oportunidades(FechaProximaAccion);
CREATE INDEX IF NOT EXISTS idx_oportunidad_programa ON Oportunidades(ProgramaID);

CREATE TRIGGER update_oportunidad_timestamp
AFTER UPDATE ON Oportunidades
FOR EACH ROW
BEGIN
    UPDATE Oportunidades
    SET UpdatedAt = CURRENT_TIMESTAMP
    WHERE OportunidadID = NEW.OportunidadID;
END;

CREATE TRIGGER after_oportunidad_created
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
    SUM(COALESCE(ValorEstimado, 0)) AS ValorTotal,
    AVG(COALESCE(ValorEstimado, 0)) AS ValorPromedio,
    COUNT(CASE WHEN FechaProximaAccion <= DATE('now') THEN 1 END) AS AccionesVencidas
FROM Oportunidades
WHERE Etapa NOT IN ('CIERRE_GANADO', 'CIERRE_PERDIDO')
GROUP BY Etapa;

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

ALTER TABLE Referidos RENAME TO Referidos_old;

CREATE TABLE Referidos (
    ReferidoID INTEGER PRIMARY KEY AUTOINCREMENT,
    OwnerContactoID INTEGER,
    OwnerClienteID INTEGER,
    ContactoReferidoID INTEGER,
    Nombre TEXT NOT NULL,
    Telefono TEXT NOT NULL,
    Ciudad TEXT,
    Tipo TEXT NOT NULL CHECK (Tipo IN ('simple', '20_y_gana', '4_en_14')),
    OportunidadID TEXT,
    Estado TEXT DEFAULT 'nuevo',
    Notas TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OwnerContactoID) REFERENCES Contactos(ContactoID) ON DELETE SET NULL,
    FOREIGN KEY (OwnerClienteID) REFERENCES Clientes(ClienteID) ON DELETE SET NULL,
    FOREIGN KEY (ContactoReferidoID) REFERENCES Contactos(ContactoID) ON DELETE SET NULL,
    FOREIGN KEY (OportunidadID) REFERENCES Oportunidades(OportunidadID) ON DELETE SET NULL
);

INSERT INTO Referidos (
    ReferidoID,
    OwnerContactoID,
    OwnerClienteID,
    ContactoReferidoID,
    Nombre,
    Telefono,
    Ciudad,
    Tipo,
    OportunidadID,
    Estado,
    Notas,
    CreatedAt
)
SELECT
    ReferidoID,
    OwnerContactoID,
    OwnerClienteID,
    ContactoReferidoID,
    Nombre,
    Telefono,
    Ciudad,
    Tipo,
    OportunidadID,
    Estado,
    Notas,
    CreatedAt
FROM Referidos_old;

DROP TABLE Referidos_old;

CREATE INDEX IF NOT EXISTS idx_referidos_owner_contacto ON Referidos(OwnerContactoID);
CREATE INDEX IF NOT EXISTS idx_referidos_owner_cliente ON Referidos(OwnerClienteID);
CREATE INDEX IF NOT EXISTS idx_referidos_tipo ON Referidos(Tipo);
CREATE INDEX IF NOT EXISTS idx_referidos_oportunidad ON Referidos(OportunidadID);

ALTER TABLE ProgramasVisita RENAME TO ProgramasVisita_old;

CREATE TABLE ProgramasVisita (
    ProgramaVisitaID INTEGER PRIMARY KEY AUTOINCREMENT,
    OportunidadID TEXT NOT NULL,
    TipoPrograma TEXT NOT NULL CHECK (TipoPrograma IN ('20_y_gana', '4_en_14')),
    OwnerContactoID INTEGER,
    OwnerClienteID INTEGER,
    FechaInicio DATE DEFAULT CURRENT_DATE,
    FechaFin DATE,
    MinimoRequerido INTEGER NOT NULL,
    ReferidosCount INTEGER NOT NULL DEFAULT 0,
    RewardStatus TEXT NOT NULL DEFAULT 'pendiente',
    WhatsappStatus TEXT NOT NULL DEFAULT 'pendiente',
    Notas TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OportunidadID) REFERENCES Oportunidades(OportunidadID) ON DELETE CASCADE,
    FOREIGN KEY (OwnerContactoID) REFERENCES Contactos(ContactoID) ON DELETE SET NULL,
    FOREIGN KEY (OwnerClienteID) REFERENCES Clientes(ClienteID) ON DELETE SET NULL
);

INSERT INTO ProgramasVisita (
    ProgramaVisitaID,
    OportunidadID,
    TipoPrograma,
    OwnerContactoID,
    OwnerClienteID,
    FechaInicio,
    FechaFin,
    MinimoRequerido,
    ReferidosCount,
    RewardStatus,
    WhatsappStatus,
    Notas,
    CreatedAt,
    UpdatedAt
)
SELECT
    ProgramaVisitaID,
    OportunidadID,
    TipoPrograma,
    OwnerContactoID,
    OwnerClienteID,
    FechaInicio,
    FechaFin,
    MinimoRequerido,
    ReferidosCount,
    RewardStatus,
    WhatsappStatus,
    Notas,
    CreatedAt,
    UpdatedAt
FROM ProgramasVisita_old;

DROP TABLE ProgramasVisita_old;

CREATE INDEX IF NOT EXISTS idx_programas_visita_oportunidad ON ProgramasVisita(OportunidadID);
CREATE INDEX IF NOT EXISTS idx_programas_visita_tipo ON ProgramasVisita(TipoPrograma);

ALTER TABLE ProgramasCRM RENAME TO ProgramasCRM_old;

CREATE TABLE ProgramasCRM (
    ProgramaID TEXT PRIMARY KEY,
    Tipo TEXT NOT NULL CHECK (Tipo IN ('20_Y_GANA', '4_EN_14', 'REFERIDO_SIMPLE')),
    OwnerType TEXT NOT NULL CHECK (OwnerType IN ('contacto', 'cliente')),
    OwnerID TEXT NOT NULL,
    OportunidadID TEXT,
    AsesorID INTEGER,
    Estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (Estado IN ('ACTIVO', 'PENDIENTE', 'COMPLETADO', 'EXPIRADO', 'CANCELADO')),
    FechaInicio DATE DEFAULT CURRENT_DATE,
    FechaFin DATE,
    WhatsappEnviado INTEGER DEFAULT 0,
    WhatsappEnviadoAt DATETIME,
    RegaloElegible INTEGER DEFAULT 0,
    RegaloEntregado INTEGER DEFAULT 0,
    RegaloEntregadoAt DATETIME,
    Notas TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    RegaloElegido TEXT,
    RegaloElegidoOtro TEXT,
    FOREIGN KEY (OportunidadID) REFERENCES Oportunidades(OportunidadID) ON DELETE SET NULL,
    FOREIGN KEY (AsesorID) REFERENCES Usuarios(UsuarioID) ON DELETE SET NULL
);

INSERT INTO ProgramasCRM (
    ProgramaID,
    Tipo,
    OwnerType,
    OwnerID,
    OportunidadID,
    AsesorID,
    Estado,
    FechaInicio,
    FechaFin,
    WhatsappEnviado,
    WhatsappEnviadoAt,
    RegaloElegible,
    RegaloEntregado,
    RegaloEntregadoAt,
    Notas,
    CreatedAt,
    UpdatedAt,
    RegaloElegido,
    RegaloElegidoOtro
)
SELECT
    ProgramaID,
    Tipo,
    OwnerType,
    OwnerID,
    OportunidadID,
    AsesorID,
    Estado,
    FechaInicio,
    FechaFin,
    WhatsappEnviado,
    WhatsappEnviadoAt,
    RegaloElegible,
    RegaloEntregado,
    RegaloEntregadoAt,
    Notas,
    CreatedAt,
    UpdatedAt,
    RegaloElegido,
    RegaloElegidoOtro
FROM ProgramasCRM_old;

DROP TABLE ProgramasCRM_old;

CREATE INDEX IF NOT EXISTS idx_programas_crm_owner ON ProgramasCRM(OwnerType, OwnerID);
CREATE INDEX IF NOT EXISTS idx_programas_crm_tipo ON ProgramasCRM(Tipo);
CREATE INDEX IF NOT EXISTS idx_programas_crm_estado ON ProgramasCRM(Estado);
CREATE INDEX IF NOT EXISTS idx_programas_crm_oportunidad ON ProgramasCRM(OportunidadID);

PRAGMA foreign_keys = ON;
