-- Quick DB initialization for development
-- This creates minimal schema for testing

-- Create Usuarios if not exists
CREATE TABLE IF NOT EXISTS Usuarios (
    UsuarioID INTEGER PRIMARY KEY AUTOINCREMENT,
    Codigo TEXT UNIQUE NOT NULL,
    Nombre TEXT NOT NULL,
    Email TEXT UNIQUE NOT NULL,
    Password TEXT NOT NULL,
    Rol TEXT NOT NULL CHECK (Rol IN ('DISTRIBUIDOR', 'VENDEDOR', 'TELEMARKETING', 'GERENTE', 'ASESOR')),
    Activo INTEGER DEFAULT 1,
    Telefono TEXT,
    MetaMensual DECIMAL(10,2),
    UltimoAcceso DATETIME,
    ResetToken TEXT,
    ResetTokenExpiry DATETIME,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO Usuarios (Codigo, Nombre, Email, Password, Rol)
VALUES ('ADMIN', 'Administrador', 'admin@crm.com', '$2b$10$YourHashedPasswordHere', 'DISTRIBUIDOR');

-- Create Contactos if not exists
CREATE TABLE IF NOT EXISTS Contactos (
    ContactoID INTEGER PRIMARY KEY AUTOINCREMENT,
    NombreCompleto TEXT NOT NULL,
    Telefono TEXT,
    Email TEXT,
    Direccion TEXT,
    Ciudad TEXT,
    Estado TEXT,
    Zipcode TEXT,
    Pais TEXT DEFAULT 'Estados Unidos',
    OrigenFuente TEXT,
    ReferidoPorId INTEGER,
    Convertido INTEGER DEFAULT 0,
    ClienteID INTEGER,
    source TEXT,
    source_name TEXT,
    Status TEXT DEFAULT 'NUEVO',
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ReferidoPorId) REFERENCES Contactos(ContactoID) ON DELETE SET NULL
);

-- Create Origenes if not exists
CREATE TABLE IF NOT EXISTS Origenes (
    OrigenID INTEGER PRIMARY KEY AUTOINCREMENT,
    Nombre TEXT NOT NULL UNIQUE,
    Tipo TEXT,
    Activo INTEGER DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO Origenes (Nombre, Tipo) VALUES
    ('Referido', 'Referido'),
    ('20 y Gana', 'Campana'),
    ('4 en 14', 'Campana'),
    ('Web', 'Web'),
    ('Redes sociales', 'Redes_Sociales');

-- Create Oportunidades if not exists
CREATE TABLE IF NOT EXISTS Oportunidades (
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
    ProgramaTipo TEXT,
    FOREIGN KEY (ContactoID) REFERENCES Contactos(ContactoID) ON DELETE SET NULL,
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_oportunidad_contacto ON Oportunidades(ContactoID);
CREATE INDEX IF NOT EXISTS idx_oportunidad_etapa ON Oportunidades(Etapa);
CREATE INDEX IF NOT EXISTS idx_oportunidad_owner ON Oportunidades(OwnerUserID);
CREATE INDEX IF NOT EXISTS idx_oportunidades_etapa_owner ON Oportunidades(Etapa, OwnerUserID);
CREATE INDEX IF NOT EXISTS idx_oportunidades_estado_cierre ON Oportunidades(EstadoCierre);
CREATE INDEX IF NOT EXISTS idx_oportunidades_fecha_proxima ON Oportunidades(FechaProximaAccion);
