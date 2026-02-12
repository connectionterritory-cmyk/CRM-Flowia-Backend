-- Referidos simples y Programas de visita
CREATE TABLE IF NOT EXISTS Referidos (
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

CREATE INDEX IF NOT EXISTS idx_referidos_owner_contacto ON Referidos(OwnerContactoID);
CREATE INDEX IF NOT EXISTS idx_referidos_owner_cliente ON Referidos(OwnerClienteID);
CREATE INDEX IF NOT EXISTS idx_referidos_tipo ON Referidos(Tipo);
CREATE INDEX IF NOT EXISTS idx_referidos_oportunidad ON Referidos(OportunidadID);

CREATE TABLE IF NOT EXISTS ProgramasVisita (
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

CREATE INDEX IF NOT EXISTS idx_programas_visita_oportunidad ON ProgramasVisita(OportunidadID);
CREATE INDEX IF NOT EXISTS idx_programas_visita_tipo ON ProgramasVisita(TipoPrograma);

ALTER TABLE Oportunidades ADD COLUMN RomperHielo INTEGER DEFAULT 0;
ALTER TABLE Oportunidades ADD COLUMN RegaloVisitaEntregado INTEGER DEFAULT 0;
ALTER TABLE Oportunidades ADD COLUMN DemoCompletada INTEGER DEFAULT 0;
ALTER TABLE Oportunidades ADD COLUMN ProgramaVisitaID INTEGER;

INSERT OR IGNORE INTO Origenes (Nombre, Tipo) VALUES
('Amigos y Familiares', 'Referido'),
('Referido', 'Referido'),
('Puerta a Puerta', 'Prospeccion'),
('Display', 'Marketing'),
('Redes Sociales', 'Marketing'),
('Evento', 'Evento'),
('20 y Gana', 'Programa'),
('4 en 14', 'Programa');

INSERT OR IGNORE INTO Usuarios (Codigo, Nombre, Email, Password, Rol, Activo) VALUES
('VEND002', 'Moisés', 'moises@crm.local', '$2b$10$o1rkT51nNJ2fHdp0kqTXdOIhGMBxGua4Z..lOYYFbyvhUHHVuTEYW', 'VENDEDOR', 1),
('VEND003', 'Patricia', 'patricia@crm.local', '$2b$10$o1rkT51nNJ2fHdp0kqTXdOIhGMBxGua4Z..lOYYFbyvhUHHVuTEYW', 'VENDEDOR', 1);
