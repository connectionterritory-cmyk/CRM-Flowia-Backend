PRAGMA foreign_keys = OFF;

CREATE TABLE Usuarios_new (
    UsuarioID INTEGER PRIMARY KEY AUTOINCREMENT,
    UserUUID TEXT UNIQUE,
    Codigo TEXT UNIQUE NOT NULL,
    Nombre TEXT NOT NULL,
    Email TEXT UNIQUE,
    Password TEXT NOT NULL,
    Rol TEXT NOT NULL,
    Nivel TEXT,
    Telefono TEXT,
    Address1 TEXT,
    Address2 TEXT,
    Ciudad TEXT,
    Estado TEXT,
    Zipcode TEXT,
    Pais TEXT DEFAULT 'USA',
    FechaInicio DATE,
    FotoUrl TEXT,
    Activo INTEGER DEFAULT 1,
    MetaMensual DECIMAL(10,2),
    UltimoAcceso DATETIME,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Usuarios_new (
    UsuarioID,
    UserUUID,
    Codigo,
    Nombre,
    Email,
    Password,
    Rol,
    Nivel,
    Telefono,
    Activo,
    MetaMensual,
    UltimoAcceso,
    CreatedAt,
    UpdatedAt
)
SELECT
    UsuarioID,
    lower(hex(randomblob(16))),
    Codigo,
    Nombre,
    Email,
    Password,
    Rol,
    CASE
        WHEN Rol = 'DISTRIBUIDOR' THEN 'DISTRIBUIDOR'
        WHEN Rol = 'GERENTE' THEN 'GERENTE'
        ELSE 'ASESOR'
    END,
    Telefono,
    COALESCE(Activo, 1),
    MetaMensual,
    UltimoAcceso,
    CreatedAt,
    UpdatedAt
FROM Usuarios;

DROP TABLE Usuarios;
ALTER TABLE Usuarios_new RENAME TO Usuarios;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_uuid ON Usuarios(UserUUID);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_codigo ON Usuarios(Codigo);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_email ON Usuarios(Email);
CREATE INDEX IF NOT EXISTS idx_usuario_rol ON Usuarios(Rol);
CREATE INDEX IF NOT EXISTS idx_usuario_activo ON Usuarios(Activo);

PRAGMA foreign_keys = ON;
