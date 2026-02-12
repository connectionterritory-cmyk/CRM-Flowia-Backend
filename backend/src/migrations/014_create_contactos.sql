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
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ReferidoPorId) REFERENCES Contactos(ContactoID) ON DELETE SET NULL,
    FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_contactos_nombre ON Contactos(NombreCompleto);
CREATE INDEX IF NOT EXISTS idx_contactos_convertido ON Contactos(Convertido);
