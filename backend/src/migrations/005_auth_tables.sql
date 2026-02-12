-- 9. Tabla: Usuarios
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

CREATE INDEX IF NOT EXISTS idx_usuario_codigo ON Usuarios(Codigo);
CREATE INDEX IF NOT EXISTS idx_usuario_rol ON Usuarios(Rol);

-- 10. Tabla: Sesiones
CREATE TABLE IF NOT EXISTS Sesiones (
    SesionID INTEGER PRIMARY KEY AUTOINCREMENT,
    UsuarioID INTEGER NOT NULL,
    Token TEXT NOT NULL,
    IP TEXT,
    UserAgent TEXT,
    ExpiresAt DATETIME NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UsuarioID) REFERENCES Usuarios(UsuarioID) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sesion_token ON Sesiones(Token);

-- 11. Tabla: AuditoriaAcciones
CREATE TABLE IF NOT EXISTS AuditoriaAcciones (
    AuditoriaID INTEGER PRIMARY KEY AUTOINCREMENT,
    UsuarioID INTEGER,
    Accion TEXT NOT NULL,
    Entidad TEXT,
    EntidadID TEXT,
    DetallesJSON TEXT,
    IP TEXT,
    FechaHora DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UsuarioID) REFERENCES Usuarios(UsuarioID) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON AuditoriaAcciones(UsuarioID);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON AuditoriaAcciones(FechaHora);
