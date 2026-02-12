DROP VIEW IF EXISTS Vista_Cliente_Resumen;

CREATE VIEW Vista_Cliente_Resumen AS
SELECT 
    c.ClienteID,
    c.Nombre,
    c.Telefono,
    c.Email,
    c.Estado,
    c.TipoCliente,
    c.Direccion,
    c.Ciudad,
    c.EstadoProvincia,
    c.Zipcode,
    c.Pais,
    ct.SaldoTotal,
    ct.SaldoVencido,
    ct.PagoMinimo,
    ct.Aging_0_30,
    ct.Aging_31_60,
    ct.Aging_61_90,
    ct.Aging_90Plus,
    ct.FechaUltimoPago,
    COUNT(DISTINCT o.OrdenID) as TotalOrdenes,
    COUNT(DISTINCT n.NotaID) as TotalNotas,
    SUM(CASE WHEN n.Leido = 0 THEN 1 ELSE 0 END) as NotasNoLeidas,
    COUNT(DISTINCT m.MensajeID) as TotalMensajes
FROM Clientes c
LEFT JOIN CuentaRP ct ON c.ClienteID = ct.ClienteID
LEFT JOIN OrdenesRP o ON c.ClienteID = o.ClienteID
LEFT JOIN NotasRP n ON c.ClienteID = n.ClienteID
LEFT JOIN MensajesCRM m ON c.ClienteID = m.ClienteID
GROUP BY c.ClienteID;
