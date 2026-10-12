-- SMSeguro - Equipo 6
-- Fase 1: Catálogo de categorías para GET /categorias
--
-- Agrega al catálogo cat_tipo_fraude las categorías que usa la app de iOS.
-- Solo INSERTA (no borra ni renombra): Banco, Paqueteria, Multa y Otro se
-- conservan porque los reportes de prueba de estadisticas.sql los usan.
-- Es idempotente: nombre_tipo es UNIQUE, así que no se duplican.

USE smseguro;

INSERT IGNORE INTO cat_tipo_fraude (nombre_tipo) VALUES
    ('Hoteles y viajes'),
    ('Electrónicos'),
    ('Empleos'),
    ('Vehículos'),
    ('Boletos para eventos');

-- Verificación:
-- SELECT id_tipo_fraude, nombre_tipo FROM cat_tipo_fraude ORDER BY id_tipo_fraude;
