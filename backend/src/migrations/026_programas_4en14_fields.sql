ALTER TABLE ProgramasCRM ADD COLUMN RegaloElegido TEXT;
ALTER TABLE ProgramasCRM ADD COLUMN RegaloElegidoOtro TEXT;

ALTER TABLE ProgramasReferidosCRM ADD COLUMN NombrePareja TEXT;
ALTER TABLE ProgramasReferidosCRM ADD COLUMN Direccion TEXT;
ALTER TABLE ProgramasReferidosCRM ADD COLUMN Ciudad TEXT;
ALTER TABLE ProgramasReferidosCRM ADD COLUMN EstadoLugar TEXT;
ALTER TABLE ProgramasReferidosCRM ADD COLUMN Zipcode TEXT;
ALTER TABLE ProgramasReferidosCRM ADD COLUMN Relacion TEXT;
ALTER TABLE ProgramasReferidosCRM ADD COLUMN TrabajaActualmente TEXT;
ALTER TABLE ProgramasReferidosCRM ADD COLUMN MejorHoraContacto TEXT;
ALTER TABLE ProgramasReferidosCRM ADD COLUMN PropietarioCasa TEXT;
ALTER TABLE ProgramasReferidosCRM ADD COLUMN ConoceRoyalPrestige TEXT;
ALTER TABLE ProgramasReferidosCRM ADD COLUMN Prioridad INTEGER DEFAULT 0;
ALTER TABLE ProgramasReferidosCRM ADD COLUMN PrioridadNota TEXT;
ALTER TABLE ProgramasReferidosCRM ADD COLUMN Notas TEXT;
