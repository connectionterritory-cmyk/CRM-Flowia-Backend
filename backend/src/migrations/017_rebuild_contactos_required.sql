ALTER TABLE Contactos RENAME TO Contactos_old;

CREATE TABLE Contactos (
    ContactoID INTEGER PRIMARY KEY AUTOINCREMENT,
    NombreCompleto TEXT NOT NULL,
    Telefono TEXT NOT NULL,
    Email TEXT,
    Direccion TEXT,
    Ciudad TEXT,
    Estado TEXT,
    Zipcode TEXT,
    Pais TEXT NOT NULL DEFAULT 'Estados Unidos',
    OrigenFuente TEXT,
    ReferidoPorId INTEGER,
    EstadoCivil TEXT,
    NombrePareja TEXT,
    TrabajaActualmente TEXT,
    MejorHoraContacto TEXT,
    Convertido INTEGER NOT NULL DEFAULT 0,
    ClienteID INTEGER,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ReferidoPorId) REFERENCES Contactos(ContactoID) ON DELETE SET NULL,
    FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID) ON DELETE SET NULL
);

INSERT INTO Contactos (
    ContactoID,
    NombreCompleto,
    Telefono,
    Email,
    Direccion,
    Ciudad,
    Estado,
    Zipcode,
    Pais,
    OrigenFuente,
    ReferidoPorId,
    EstadoCivil,
    NombrePareja,
    TrabajaActualmente,
    MejorHoraContacto,
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
    OrigenFuente,
    ReferidoPorId,
    NULL,
    NULL,
    NULL,
    NULL,
    COALESCE(Convertido, 0),
    ClienteID,
    CreatedAt,
    UpdatedAt
FROM Contactos_old;

DROP TABLE Contactos_old;

CREATE INDEX IF NOT EXISTS idx_contactos_nombre ON Contactos(NombreCompleto);
CREATE INDEX IF NOT EXISTS idx_contactos_convertido ON Contactos(Convertido);
