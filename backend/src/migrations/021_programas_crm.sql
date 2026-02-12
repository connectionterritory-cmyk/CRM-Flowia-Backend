-- Programas CRM (20 y Gana / 4 en 14 / Referido simple)
CREATE TABLE IF NOT EXISTS ProgramasCRM (
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
    FOREIGN KEY (OportunidadID) REFERENCES Oportunidades(OportunidadID) ON DELETE SET NULL,
    FOREIGN KEY (AsesorID) REFERENCES Usuarios(UsuarioID) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_programas_crm_owner ON ProgramasCRM(OwnerType, OwnerID);
CREATE INDEX IF NOT EXISTS idx_programas_crm_tipo ON ProgramasCRM(Tipo);
CREATE INDEX IF NOT EXISTS idx_programas_crm_estado ON ProgramasCRM(Estado);
CREATE INDEX IF NOT EXISTS idx_programas_crm_oportunidad ON ProgramasCRM(OportunidadID);

CREATE TABLE IF NOT EXISTS ProgramasReferidosCRM (
    ReferidoID TEXT PRIMARY KEY,
    ProgramaID TEXT NOT NULL,
    NombreCompleto TEXT NOT NULL,
    Telefono TEXT,
    Estado TEXT NOT NULL DEFAULT 'NUEVO' CHECK (Estado IN ('NUEVO', 'CONTACTADO', 'CITA', 'DEMO', 'VENTA', 'NO_INTERESA')),
    CreatedLeadID TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ProgramaID) REFERENCES ProgramasCRM(ProgramaID) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_programas_ref_programa ON ProgramasReferidosCRM(ProgramaID);
CREATE INDEX IF NOT EXISTS idx_programas_ref_estado ON ProgramasReferidosCRM(Estado);

CREATE TABLE IF NOT EXISTS ProgramasEventosCRM (
    EventoID TEXT PRIMARY KEY,
    ProgramaID TEXT NOT NULL,
    TipoEvento TEXT NOT NULL,
    PayloadJSON TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ProgramaID) REFERENCES ProgramasCRM(ProgramaID) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_programas_eventos_programa ON ProgramasEventosCRM(ProgramaID);

INSERT OR IGNORE INTO Origenes (Nombre, Tipo) VALUES
('Amigos y Familiares', 'Referido'),
('Telemarketing', 'Telemarketing'),
('Referido', 'Referido'),
('Display', 'Display'),
('Toque de Puerta', 'Prospeccion'),
('Evento', 'Evento'),
('Redes Sociales', 'Marketing'),
('Cliente Existente', 'Cliente'),
('Otro', 'Otro');

-- Migrar programas existentes (ProgramasVisita -> ProgramasCRM)
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
    UpdatedAt
)
SELECT
    lower(hex(randomblob(16))) AS ProgramaID,
    CASE WHEN TipoPrograma = '20_y_gana' THEN '20_Y_GANA' ELSE '4_EN_14' END,
    CASE WHEN OwnerContactoID IS NOT NULL THEN 'contacto' ELSE 'cliente' END,
    COALESCE(CAST(OwnerContactoID AS TEXT), CAST(OwnerClienteID AS TEXT)),
    OportunidadID,
    (SELECT OwnerUserID FROM Oportunidades WHERE OportunidadID = ProgramasVisita.OportunidadID),
    CASE WHEN RewardStatus = 'entregado' THEN 'COMPLETADO' ELSE 'ACTIVO' END,
    FechaInicio,
    FechaFin,
    CASE WHEN WhatsappStatus = 'enviado' THEN 1 ELSE 0 END,
    NULL,
    CASE WHEN ReferidosCount >= MinimoRequerido THEN 1 ELSE 0 END,
    CASE WHEN RewardStatus = 'entregado' THEN 1 ELSE 0 END,
    NULL,
    Notas,
    CreatedAt,
    UpdatedAt
FROM ProgramasVisita
WHERE ProgramasVisita.ProgramaVisitaID IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM ProgramasCRM WHERE OportunidadID = ProgramasVisita.OportunidadID);

-- Migrar referidos existentes (Referidos -> ProgramasReferidosCRM)
INSERT INTO ProgramasReferidosCRM (
    ReferidoID,
    ProgramaID,
    NombreCompleto,
    Telefono,
    Estado,
    CreatedLeadID,
    CreatedAt,
    UpdatedAt
)
SELECT
    lower(hex(randomblob(16))) AS ReferidoID,
    (SELECT ProgramaID FROM ProgramasCRM
        WHERE ProgramasCRM.OportunidadID = Referidos.OportunidadID
          AND ProgramasCRM.Tipo = CASE WHEN Referidos.Tipo = '20_y_gana' THEN '20_Y_GANA' ELSE '4_EN_14' END
        LIMIT 1) AS ProgramaID,
    Referidos.Nombre,
    Referidos.Telefono,
    'NUEVO',
    CASE WHEN Referidos.ContactoReferidoID IS NOT NULL THEN CAST(Referidos.ContactoReferidoID AS TEXT) ELSE NULL END,
    Referidos.CreatedAt,
    Referidos.CreatedAt
FROM Referidos
WHERE Referidos.Tipo IN ('20_y_gana', '4_en_14')
  AND Referidos.OportunidadID IS NOT NULL
  AND NOT EXISTS (
        SELECT 1 FROM ProgramasReferidosCRM r
        WHERE r.CreatedLeadID = CAST(Referidos.ContactoReferidoID AS TEXT)
  );
