INSERT INTO Origenes (Nombre)
SELECT 'Toque de Puerta'
WHERE NOT EXISTS (SELECT 1 FROM Origenes WHERE Nombre = 'Toque de Puerta');

INSERT INTO Origenes (Nombre)
SELECT 'Referido'
WHERE NOT EXISTS (SELECT 1 FROM Origenes WHERE Nombre = 'Referido');

INSERT INTO Origenes (Nombre)
SELECT 'Familiares y Amigos'
WHERE NOT EXISTS (SELECT 1 FROM Origenes WHERE Nombre = 'Familiares y Amigos');

INSERT INTO Origenes (Nombre)
SELECT 'Raspa y Gana'
WHERE NOT EXISTS (SELECT 1 FROM Origenes WHERE Nombre = 'Raspa y Gana');

INSERT INTO Origenes (Nombre)
SELECT 'Calendario de la suerte'
WHERE NOT EXISTS (SELECT 1 FROM Origenes WHERE Nombre = 'Calendario de la suerte');

INSERT INTO Origenes (Nombre)
SELECT 'Feria'
WHERE NOT EXISTS (SELECT 1 FROM Origenes WHERE Nombre = 'Feria');

INSERT INTO Origenes (Nombre)
SELECT 'Exhibidor'
WHERE NOT EXISTS (SELECT 1 FROM Origenes WHERE Nombre = 'Exhibidor');

INSERT INTO Origenes (Nombre)
SELECT 'Redes Sociales'
WHERE NOT EXISTS (SELECT 1 FROM Origenes WHERE Nombre = 'Redes Sociales');

INSERT INTO Origenes (Nombre)
SELECT 'Clientes de Otro Distribuidor'
WHERE NOT EXISTS (SELECT 1 FROM Origenes WHERE Nombre = 'Clientes de Otro Distribuidor');

INSERT INTO Origenes (Nombre)
SELECT 'Otros'
WHERE NOT EXISTS (SELECT 1 FROM Origenes WHERE Nombre = 'Otros');
