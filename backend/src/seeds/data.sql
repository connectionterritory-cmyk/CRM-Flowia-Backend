-- Clean existing data
DELETE FROM MensajesCRM;
DELETE FROM NotasRP;
DELETE FROM TransaccionesRP;
DELETE FROM EnviosRP;
DELETE FROM OrdenItemsRP;
DELETE FROM OrdenesRP;
DELETE FROM CuentaRP;
DELETE FROM Clientes;
DELETE FROM Sesiones;
DELETE FROM AuditoriaAcciones;
DELETE FROM Usuarios;
DELETE FROM sqlite_sequence;

-- 1. Clientes (10)
INSERT INTO Clientes (Nombre, Telefono, Email, Direccion, Ciudad, Estado, TipoCliente) VALUES
('Juan Pérez', '+507 6123-4567', 'juan@example.com', 'Calle 50', 'Panamá', 'Activo', 'Residencial'), -- 1: Saldo 0
('Maria González', '+507 6234-5678', 'maria@example.com', 'Vía España', 'Panamá', 'Activo', 'Comercial'), -- 2: Saldo 0
('Carlos Rodriguez', '+507 6345-6789', 'carlos@example.com', 'El Cangrejo', 'Panamá', 'Activo', 'Corporativo'), -- 3: Saldo 0
('Ana López', '+507 6456-7890', 'ana@example.com', 'San Francisco', 'Panamá', 'Activo', 'Residencial'), -- 4: Current ($150)
('Roberto Díaz', '+507 6567-8901', 'roberto@example.com', 'Costa del Este', 'Panamá', 'Activo', 'Comercial'), -- 5: Current ($500)
('Elena Torres', '+507 6678-9012', 'elena@example.com', 'Obarrio', 'Panamá', 'Activo', 'Residencial'), -- 6: Current ($1200)
('Pedro Sanchez', '+507 6789-0123', 'pedro@example.com', 'Bella Vista', 'Panamá', 'Activo', 'Corporativo'), -- 7: Current ($2000)
('Lucia Martinez', '+507 6890-1234', 'lucia@example.com', 'Punta Pacifica', 'Panamá', 'Moroso', 'Comercial'), -- 8: Past due ($3500)
('Miguel Flores', '+507 6901-2345', 'miguel@example.com', 'Clayton', 'Panamá', 'Moroso', 'Residencial'), -- 9: Past due ($4800)
('Sofia Ramirez', '+507 6012-3456', 'sofia@example.com', 'Albrook', 'Panamá', 'Moroso', 'Corporativo'); -- 10: 90+ ($8500)

-- 2. Cuentas (Linked to Clientes)
INSERT INTO CuentaRP (ClienteID, SaldoTotal, SaldoVencido, PagoMinimo, Aging_0_30, Aging_31_60, Aging_61_90, Aging_90Plus) VALUES
(1, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(2, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(3, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(4, 150.00, 0.00, 15.00, 150.00, 0.00, 0.00, 0.00),
(5, 500.00, 0.00, 50.00, 500.00, 0.00, 0.00, 0.00),
(6, 1200.00, 0.00, 120.00, 1200.00, 0.00, 0.00, 0.00),
(7, 2000.00, 2000.00, 200.00, 0.00, 2000.00, 0.00, 0.00), -- 31-60 days
(8, 3500.00, 3500.00, 350.00, 0.00, 0.00, 3500.00, 0.00), -- 61-90 days
(9, 4800.00, 4800.00, 480.00, 1000.00, 0.00, 3800.00, 0.00), -- Mixed
(10, 8500.00, 8500.00, 850.00, 500.00, 0.00, 0.00, 8000.00); -- 90+ days

-- 3. Ordenes (Samples)
-- Client 1 (Paid)
INSERT INTO OrdenesRP (ClienteID, CuentaID, NumeroOrden, Fecha, Estado, Total, Balance) VALUES
(1, 1, 'ORD-001', DATE('now', '-5 days'), 'Completada', 150.00, 0.00); 

-- Client 4 (Active Order)
INSERT INTO OrdenesRP (ClienteID, CuentaID, NumeroOrden, Fecha, Estado, Total, Balance) VALUES
(4, 4, 'ORD-002', DATE('now', '-2 days'), 'Pendiente', 150.00, 150.00);

-- Client 10 (Old Orders)
INSERT INTO OrdenesRP (ClienteID, CuentaID, NumeroOrden, Fecha, Estado, Total, Balance) VALUES
(10, 10, 'ORD-003', DATE('now', '-100 days'), 'Completada', 8000.00, 8000.00),
(10, 10, 'ORD-004', DATE('now', '-5 days'), 'Servicio', 500.00, 500.00);

-- 4. Items (Link to Ordenes)
INSERT INTO OrdenItemsRP (OrdenID, Descripcion, Cantidad, PrecioUnitario, Subtotal) VALUES
(1, 'Mantenimiento AC', 1, 150.00, 150.00),
(2, 'Reparación Fuga', 1, 150.00, 150.00),
(3, 'Instalación Sistema', 1, 8000.00, 8000.00),
(4, 'Mantenimiento Mensual', 1, 500.00, 500.00);

-- 5. Transacciones (Payments/Charges)
-- Client 1 Paid
INSERT INTO TransaccionesRP (cuentaID, ClienteID, OrdenID, Tipo, Monto, Fecha, Descripcion) VALUES
(1, 1, 1, 'Cargo', 150.00, DATE('now', '-5 days'), 'Cargo Orden 001'),
(1, 1, 1, 'Pago', -150.00, DATE('now', '-1 days'), 'Pago Completo');

-- Client 10 Partial
INSERT INTO TransaccionesRP (cuentaID, ClienteID, OrdenID, Tipo, Monto, Fecha, Descripcion) VALUES
(10, 10, 3, 'Cargo', 8000.00, DATE('now', '-100 days'), 'Cargo Orden 003'),
(10, 10, 4, 'Cargo', 500.00, DATE('now', '-5 days'), 'Cargo Orden 004');

-- 6. Notas
INSERT INTO NotasRP (ClienteID, Tipo, Contenido, Leido) VALUES
(4, 'General', 'Cliente prefiere ser contactado por WhatsApp', 1),
(8, 'Cobranza', 'Primer aviso de cobro enviado', 0),
(10, 'Importante', 'CLIENTE EN LEGAL - NO DAR SERVICIO', 0);

-- 7. Mensajes
INSERT INTO MensajesCRM (ClienteID, Tipo, Contenido, Estado, FechaEnvio) VALUES
(1, 'WhatsApp', 'Su servicio ha sido completado', 'Enviado', datetime('now', '-1 day')),
(4, 'WhatsApp', 'Factura pendiente de pago', 'Registrado', NULL);

-- 8. Usuarios (Equipo)
INSERT INTO Usuarios (
    UserUUID,
    Codigo,
    Nombre,
    Email,
    Password,
    Rol,
    Nivel,
    Telefono,
    Address1,
    Address2,
    Ciudad,
    Estado,
    Zipcode,
    Pais,
    FechaInicio,
    FotoUrl,
    Activo
) VALUES
(lower(hex(randomblob(16))), 'DIS-0001', 'Admin Distribuidor', 'admin@crm.local', '$2b$10$o1rkT51nNJ2fHdp0kqTXdOIhGMBxGua4Z..lOYYFbyvhUHHVuTEYW', 'DISTRIBUIDOR', 'DISTRIBUIDOR', '+507 6000-0001', NULL, NULL, 'Panamá', 'Panamá', '00000', 'USA', DATE('now', '-365 day'), NULL, 1),
(lower(hex(randomblob(16))), 'TEL-0001', 'Ana Telemarketing', 'ana@crm.local', '$2b$10$o1rkT51nNJ2fHdp0kqTXdOIhGMBxGua4Z..lOYYFbyvhUHHVuTEYW', 'TELEMARKETING', 'ASESOR', '+507 6000-0002', NULL, NULL, 'Panamá', 'Panamá', '00000', 'USA', DATE('now', '-120 day'), NULL, 1),
(lower(hex(randomblob(16))), 'VEN-0001', 'Maria Vendedor', 'maria@crm.local', '$2b$10$o1rkT51nNJ2fHdp0kqTXdOIhGMBxGua4Z..lOYYFbyvhUHHVuTEYW', 'ASESOR', 'ASESOR', '+507 6000-0003', NULL, NULL, 'Panamá', 'Panamá', '00000', 'USA', DATE('now', '-60 day'), NULL, 1);

-- 9. Origenes (Catalogo)
INSERT OR IGNORE INTO Origenes (Nombre, Tipo) VALUES
('Amigos y Familiares', 'Referido'),
('Referido', 'Referido'),
('Puerta a Puerta', 'Prospeccion'),
('Display', 'Marketing'),
('Redes Sociales', 'Marketing'),
('Evento', 'Evento'),
('20 y Gana', 'Programa'),
('4 en 14', 'Programa');
