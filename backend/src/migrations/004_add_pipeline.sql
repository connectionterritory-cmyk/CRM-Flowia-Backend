-- Crear tabla Origenes
CREATE TABLE IF NOT EXISTS Origenes (
    OrigenID INTEGER PRIMARY KEY AUTOINCREMENT,
    Nombre TEXT NOT NULL UNIQUE,
    Tipo TEXT,
    Activo INTEGER DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_origen_nombre ON Origenes(Nombre);

INSERT OR IGNORE INTO Origenes (Nombre, Tipo) VALUES
    ('Website', 'Web'),
    ('Referido', 'Referido'),
    ('Llamada Fría', 'Llamada_Fria'),
    ('Redes Sociales', 'Redes_Sociales'),
    ('Evento', 'Evento'),
    ('Email Marketing', 'Email'),
    ('Otro', 'Otro');

-- Crear tabla Usuarios si no existe (schema completo para auth)
CREATE TABLE IF NOT EXISTS Usuarios (
    UsuarioID INTEGER PRIMARY KEY AUTOINCREMENT,
    Codigo TEXT UNIQUE NOT NULL,
    Nombre TEXT NOT NULL,
    Email TEXT UNIQUE NOT NULL,
    Password TEXT NOT NULL,
    Rol TEXT NOT NULL CHECK (Rol IN ('DISTRIBUIDOR', 'VENDEDOR', 'TELEMARKETING')),
    Activo INTEGER DEFAULT 1,
    Telefono TEXT,
    MetaMensual DECIMAL(10,2),
    UltimoAcceso DATETIME,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agregar LifecycleStage a Clientes
-- Note: SQLite does not support IF NOT EXISTS for column addition, so we wrap in a safe block or just try.
-- However, since this is a controlled migration, we assume it's clean. 
-- But re-running might fail. Better to handle gracefully if possible, but standard SQL script usually just runs once.
-- We will stick to the standard ALTER TABLE.
ALTER TABLE Clientes ADD COLUMN LifecycleStage TEXT DEFAULT 'LEAD';

-- Crear tabla Oportunidades
CREATE TABLE IF NOT EXISTS Oportunidades (
    OportunidadID TEXT PRIMARY KEY,
    ContactoID INTEGER NOT NULL,
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
    FOREIGN KEY (ContactoID) REFERENCES Clientes(ClienteID) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_oportunidad_contacto ON Oportunidades(ContactoID);
CREATE INDEX IF NOT EXISTS idx_oportunidad_etapa ON Oportunidades(Etapa);
CREATE INDEX IF NOT EXISTS idx_oportunidad_owner ON Oportunidades(OwnerUserID);
CREATE INDEX IF NOT EXISTS idx_oportunidad_origen ON Oportunidades(OrigenID);
CREATE INDEX IF NOT EXISTS idx_oportunidad_fecha_proxima ON Oportunidades(FechaProximaAccion);

-- Triggers
CREATE TRIGGER IF NOT EXISTS update_oportunidad_timestamp
AFTER UPDATE ON Oportunidades
FOR EACH ROW
BEGIN
    UPDATE Oportunidades
    SET UpdatedAt = CURRENT_TIMESTAMP
    WHERE OportunidadID = NEW.OportunidadID;
END;

CREATE TRIGGER IF NOT EXISTS after_oportunidad_ganada
AFTER UPDATE OF Etapa ON Oportunidades
WHEN NEW.Etapa = 'CIERRE_GANADO' AND OLD.Etapa != 'CIERRE_GANADO'
BEGIN
    UPDATE Clientes
    SET LifecycleStage = 'CLIENTE'
    WHERE ClienteID = NEW.ContactoID;
    
    INSERT INTO OrdenesRP (
        ClienteID,
        CuentaID,
        NumeroOrden,
        Fecha,
        FechaVencimiento,
        TipoOrden,
        Total,
        Balance,
        Estado,
        Notas,
        Impuestos
    )
    SELECT
        NEW.ContactoID,
        NEW.ContactoID, -- Assuming 1:1 for MVP
        'ORD-' || strftime('%Y%m%d', 'now') || '-' || substr(NEW.OportunidadID, 1, 6),
        DATE('now'),
        DATE('now', '+30 days'),
        'Venta',
        COALESCE(NEW.ValorEstimado, 0),
        COALESCE(NEW.ValorEstimado, 0),
        'Pendiente',
        'Generada automáticamente desde oportunidad ' || NEW.OportunidadID,
        0
    WHERE NEW.ValorEstimado IS NOT NULL AND NEW.ValorEstimado > 0;
END;

CREATE TRIGGER IF NOT EXISTS after_oportunidad_created
AFTER INSERT ON Oportunidades
BEGIN
    UPDATE Clientes
    SET LifecycleStage = 'OPORTUNIDAD'
    WHERE ClienteID = NEW.ContactoID
      AND LifecycleStage = 'LEAD';
END;

-- Vista
CREATE VIEW IF NOT EXISTS Vista_Pipeline_Stats AS
SELECT
    Etapa,
    COUNT(*) AS Total,
    SUM(COALESCE(ValorEstimado, 0)) AS ValorTotal,
    AVG(COALESCE(ValorEstimado, 0)) AS ValorPromedio,
    COUNT(CASE WHEN FechaProximaAccion <= DATE('now') THEN 1 END) AS AccionesVencidas
FROM Oportunidades
WHERE Etapa NOT IN ('CIERRE_GANADO', 'CIERRE_PERDIDO')
GROUP BY Etapa;
