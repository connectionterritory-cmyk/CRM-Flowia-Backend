-- CONTACTOS_ROYAL_PRESTIGE
PRAGMA foreign_keys = OFF;

ALTER TABLE Contactos RENAME TO Contactos_old;

CREATE TABLE Contactos (
    ContactoID INTEGER PRIMARY KEY AUTOINCREMENT,
    -- New CRM fields
    full_name TEXT NOT NULL,
    mobile_phone TEXT NOT NULL,
    address1 TEXT,
    address2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT,
    country TEXT NOT NULL DEFAULT 'USA',
    origin_type TEXT NOT NULL,
    referred_by_type TEXT NOT NULL,
    referred_by_id INTEGER NOT NULL DEFAULT 0,
    relationship_to_referrer TEXT NOT NULL,
    assigned_to_user_id INTEGER NOT NULL,
    marital_status TEXT CHECK (marital_status IN ('SOLTERO', 'CASADO', 'UNION_LIBRE', 'DIVORCIADO', 'VIUDO', 'NO_DICE')),
    home_ownership TEXT CHECK (home_ownership IN ('DUEÑO', 'RENTA', 'NO_DICE')),
    both_work TEXT CHECK (both_work IN ('TRABAJA_1', 'TRABAJAN_2', 'NO_DICE')),
    has_children INTEGER NOT NULL DEFAULT 0 CHECK (has_children IN (0, 1)),
    children_count INTEGER,
    knows_royal_prestige TEXT CHECK (knows_royal_prestige IN ('SI', 'NO', 'HA_ESCUCHADO')),
    contact_status TEXT NOT NULL DEFAULT 'NUEVO' CHECK (contact_status IN (
        'NUEVO',
        'CONTACTADO',
        'CALIFICADO',
        'CITA_AGENDADA',
        'NO_INTERESA',
        'NO_MOLESTAR'
    )),
    contact_allowed INTEGER NOT NULL DEFAULT 1 CHECK (contact_allowed IN (0, 1)),
    notes TEXT,
    -- Legacy fields (kept for compatibility)
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
    FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to_user_id) REFERENCES Usuarios(UsuarioID) ON DELETE RESTRICT
);

INSERT INTO Contactos (
    ContactoID,
    full_name,
    mobile_phone,
    address1,
    address2,
    city,
    state,
    zip_code,
    country,
    origin_type,
    referred_by_type,
    referred_by_id,
    relationship_to_referrer,
    assigned_to_user_id,
    marital_status,
    home_ownership,
    both_work,
    has_children,
    children_count,
    knows_royal_prestige,
    contact_status,
    contact_allowed,
    notes,
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
    COALESCE(NombreCompleto, ''),
    COALESCE(Telefono, ''),
    Direccion,
    'NO_DICE',
    COALESCE(Ciudad, 'NO_DICE'),
    COALESCE(Estado, 'NO_DICE'),
    Zipcode,
    COALESCE(Pais, 'USA'),
    COALESCE(OrigenFuente, 'NO_DICE'),
    CASE WHEN ReferidoPorId IS NOT NULL THEN 'CONTACTO' ELSE 'NO_DICE' END,
    COALESCE(ReferidoPorId, 0),
    'NO_DICE',
    1,
    CASE
        WHEN EstadoCivil IN ('SOLTERO', 'CASADO', 'UNION_LIBRE', 'DIVORCIADO', 'VIUDO', 'NO_DICE') THEN EstadoCivil
        ELSE 'NO_DICE'
    END,
    'NO_DICE',
    'NO_DICE',
    0,
    NULL,
    'NO',
    'NUEVO',
    1,
    NULL,
    NombreCompleto,
    Telefono,
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
FROM Contactos_old;

DROP TABLE Contactos_old;

CREATE INDEX IF NOT EXISTS idx_contactos_full_name ON Contactos(full_name);
CREATE INDEX IF NOT EXISTS idx_contactos_mobile_phone ON Contactos(mobile_phone);
CREATE INDEX IF NOT EXISTS idx_contactos_status ON Contactos(contact_status);
CREATE INDEX IF NOT EXISTS idx_contactos_assigned ON Contactos(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_contactos_convertido ON Contactos(Convertido);

PRAGMA foreign_keys = ON;
