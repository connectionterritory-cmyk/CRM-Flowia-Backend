-- 1. Tabla: Clientes
CREATE TABLE IF NOT EXISTS Clientes (
    ClienteID INTEGER PRIMARY KEY AUTOINCREMENT,
    Nombre TEXT NOT NULL,
    Telefono TEXT,
    Email TEXT,
    Direccion TEXT,
    Ciudad TEXT,
    EstadoProvincia TEXT,
    Zipcode TEXT,
    Pais TEXT DEFAULT 'USA',
    FechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
    Estado TEXT DEFAULT 'Activo',
    TipoCliente TEXT DEFAULT 'Residencial',
    Notas TEXT
);

CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON Clientes(Nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON Clientes(Estado);

-- 2. Tabla: CuentaRP (Cuentas por Cobrar)
CREATE TABLE IF NOT EXISTS CuentaRP (
    CuentaID INTEGER PRIMARY KEY AUTOINCREMENT,
    ClienteID INTEGER NOT NULL,
    SaldoTotal DECIMAL(10,2) DEFAULT 0.00,
    SaldoVencido DECIMAL(10,2) DEFAULT 0.00,
    PagoMinimo DECIMAL(10,2) DEFAULT 0.00,
    UltimoPago DECIMAL(10,2),
    FechaUltimoPago DATE,
    LimiteCredito DECIMAL(10,2) DEFAULT 0.00,
    DiasCredito INTEGER DEFAULT 30,
    Aging_0_30 DECIMAL(10,2) DEFAULT 0.00,
    Aging_31_60 DECIMAL(10,2) DEFAULT 0.00,
    Aging_61_90 DECIMAL(10,2) DEFAULT 0.00,
    Aging_90Plus DECIMAL(10,2) DEFAULT 0.00,
    FechaActualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cuenta_cliente ON CuentaRP(ClienteID);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cuenta_cliente_unique ON CuentaRP(ClienteID);

-- 3. Tabla: OrdenesRP
CREATE TABLE IF NOT EXISTS OrdenesRP (
    OrdenID INTEGER PRIMARY KEY AUTOINCREMENT,
    ClienteID INTEGER NOT NULL,
    CuentaID INTEGER,
    NumeroOrden TEXT UNIQUE NOT NULL,
    Fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    FechaVencimiento DATE,
    TipoOrden TEXT DEFAULT 'Servicio',
    Estado TEXT DEFAULT 'Pendiente',
    Subtotal DECIMAL(10,2) DEFAULT 0.00,
    Impuestos DECIMAL(10,2) DEFAULT 0.00,
    Total DECIMAL(10,2) NOT NULL,
    Balance DECIMAL(10,2) NOT NULL,
    Notas TEXT,
    FechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID) ON DELETE CASCADE,
    FOREIGN KEY (CuentaID) REFERENCES CuentaRP(CuentaID) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_orden_cliente ON OrdenesRP(ClienteID);
CREATE INDEX IF NOT EXISTS idx_orden_fecha ON OrdenesRP(Fecha);
CREATE INDEX IF NOT EXISTS idx_orden_estado ON OrdenesRP(Estado);

-- 4. Tabla: OrdenItemsRP
CREATE TABLE IF NOT EXISTS OrdenItemsRP (
    ItemID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrdenID INTEGER NOT NULL,
    Descripcion TEXT NOT NULL,
    Cantidad DECIMAL(10,2) DEFAULT 1.00,
    PrecioUnitario DECIMAL(10,2) NOT NULL,
    Subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (OrdenID) REFERENCES OrdenesRP(OrdenID) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_item_orden ON OrdenItemsRP(OrdenID);

-- 5. Tabla: EnviosRP
CREATE TABLE IF NOT EXISTS EnviosRP (
    EnvioID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrdenID INTEGER NOT NULL,
    ClienteID INTEGER NOT NULL,
    FechaEnvio DATE,
    FechaEntregaEstimada DATE,
    FechaEntregaReal DATE,
    Estado TEXT DEFAULT 'Pendiente',
    Tracking TEXT,
    Transportadora TEXT,
    DireccionEnvio TEXT,
    Notas TEXT,
    FechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrdenID) REFERENCES OrdenesRP(OrdenID) ON DELETE CASCADE,
    FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_envio_orden ON EnviosRP(OrdenID);
CREATE INDEX IF NOT EXISTS idx_envio_estado ON EnviosRP(Estado);

-- 6. Tabla: TransaccionesRP
CREATE TABLE IF NOT EXISTS TransaccionesRP (
    TransaccionID INTEGER PRIMARY KEY AUTOINCREMENT,
    CuentaID INTEGER NOT NULL,
    ClienteID INTEGER NOT NULL,
    OrdenID INTEGER,
    Tipo TEXT NOT NULL,
    Monto DECIMAL(10,2) NOT NULL,
    Fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    FechaVencimiento DATE,
    MetodoPago TEXT,
    Referencia TEXT,
    Descripcion TEXT,
    Estado TEXT DEFAULT 'Aplicado',
    DiasVencido INTEGER DEFAULT 0,
    FechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CuentaID) REFERENCES CuentaRP(CuentaID) ON DELETE CASCADE,
    FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID) ON DELETE CASCADE,
    FOREIGN KEY (OrdenID) REFERENCES OrdenesRP(OrdenID) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_transaccion_cuenta ON TransaccionesRP(CuentaID);
CREATE INDEX IF NOT EXISTS idx_transaccion_fecha ON TransaccionesRP(Fecha);
CREATE INDEX IF NOT EXISTS idx_transaccion_tipo ON TransaccionesRP(Tipo);

-- 7. Tabla: NotasRP
CREATE TABLE IF NOT EXISTS NotasRP (
    NotaID INTEGER PRIMARY KEY AUTOINCREMENT,
    ClienteID INTEGER NOT NULL,
    Tipo TEXT DEFAULT 'General',
    Contenido TEXT NOT NULL,
    Leido INTEGER DEFAULT 0,
    CreadoPor TEXT,
    FechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FechaLeido DATETIME,
    FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_nota_cliente ON NotasRP(ClienteID);
CREATE INDEX IF NOT EXISTS idx_nota_leido ON NotasRP(Leido);
CREATE INDEX IF NOT EXISTS idx_nota_tipo ON NotasRP(Tipo);

-- 8. Tabla: MensajesCRM
CREATE TABLE IF NOT EXISTS MensajesCRM (
    MensajeID INTEGER PRIMARY KEY AUTOINCREMENT,
    ClienteID INTEGER NOT NULL,
    Tipo TEXT DEFAULT 'WhatsApp',
    Direccion TEXT DEFAULT 'Saliente',
    Asunto TEXT,
    Contenido TEXT NOT NULL,
    Estado TEXT DEFAULT 'Registrado',
    FechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FechaEnvio DATETIME,
    Telefono TEXT,
    Email TEXT,
    Notas TEXT,
    FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mensaje_cliente ON MensajesCRM(ClienteID);
CREATE INDEX IF NOT EXISTS idx_mensaje_tipo ON MensajesCRM(Tipo);
