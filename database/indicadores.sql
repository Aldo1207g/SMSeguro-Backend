-- SMSeguro - Equipo 6
-- Módulo 3: Datos de prueba para GET /indicadores/exportar (lista negra CSV)
--
-- Orden: smseguro_db.sql -> estadisticas.sql -> indicadores.sql
-- Usa los reportes SMS-EST0000X de estadisticas.sql. Es idempotente.
--
-- Catálogos (smseguro_db.sql):
--   cat_tipo_dato:     1 = Telefono, 2 = URL
--   cat_rol_indicador: 1 = Remitente, 2 = Enlace, 3 = Otro
--   cat_resolucion:    1 = Aprobado, 2 = Rechazado

USE smseguro;

-- 1. Analista que firma los dictámenes (mismo usuario que dictamen.sql)
--    Correo: analista@smseguro.com  |  Contraseña: Analista123!
INSERT INTO usuario (nombre_usuario, correo_electronico, contrasena_hash, id_rol_usuario)
SELECT 'Analista Prueba', 'analista@smseguro.com',
       '$2b$10$cf2IgfYhEd6rLMU3XMs6kes4gfLc1gxHKfZKkuqLhbSL22WJl7cVS', 2
WHERE NOT EXISTS (
    SELECT 1 FROM usuario WHERE correo_electronico = 'analista@smseguro.com'
);

-- 2. Dictámenes congruentes con el estado de cada reporte
--    EST00002 y EST00005 -> Aprobado | EST00004 -> Rechazado
INSERT IGNORE INTO dictamen (id_reporte, id_analista, id_resolucion, motivo_rechazo)
SELECT r.id_reporte, a.id_usuario, x.resolucion, x.motivo
FROM (
    SELECT 'SMS-EST00002' AS folio, 1 AS resolucion, NULL AS motivo
    UNION ALL SELECT 'SMS-EST00005', 1, NULL
    UNION ALL SELECT 'SMS-EST00004', 2, 'Es una notificación legítima de Estafeta'
) AS x
INNER JOIN reporte r ON r.folio_publico = x.folio
CROSS JOIN (
    SELECT id_usuario FROM usuario WHERE correo_electronico = 'analista@smseguro.com' LIMIT 1
) AS a;

-- 3. Indicadores (valor_dato es UNIQUE)
INSERT IGNORE INTO indicador (id_tipo_dato, valor_dato) VALUES
    (1, '+52 55 1234 5678'),                       -- reporte Pendiente
    (1, '+52 55 8765 4321'),                       -- 2 reportes Aprobados
    (2, 'santander-mx.co'),                        -- Aprobado
    (2, 'https://sat-pagos.info/pago?ref=A1,B2'),  -- Aprobado (lleva coma: prueba el escapado CSV)
    (2, 'estafeta-entregas.top');                  -- Rechazado

-- 4. Relación reporte <-> indicador (detalle_reporte)
INSERT IGNORE INTO detalle_reporte (id_reporte, id_indicador, id_rol_indicador)
SELECT r.id_reporte, i.id_indicador, x.rol
FROM (
    SELECT 'SMS-EST00001' AS folio, '+52 55 1234 5678' AS valor, 1 AS rol
    UNION ALL SELECT 'SMS-EST00002', '+52 55 8765 4321', 1
    UNION ALL SELECT 'SMS-EST00002', 'santander-mx.co', 2
    UNION ALL SELECT 'SMS-EST00005', '+52 55 8765 4321', 1
    UNION ALL SELECT 'SMS-EST00005', 'https://sat-pagos.info/pago?ref=A1,B2', 2
    UNION ALL SELECT 'SMS-EST00004', 'estafeta-entregas.top', 2
) AS x
INNER JOIN reporte r   ON r.folio_publico = x.folio
INNER JOIN indicador i ON i.valor_dato = x.valor;

-- Resultado esperado en lista_negra.csv: 3 indicadores
--   Telefono, +52 55 8765 4321 (2 reportes) | URL, santander-mx.co | URL, https://sat-pagos.info/...
-- NO deben salir: +52 55 1234 5678 (Pendiente) ni estafeta-entregas.top (Rechazado)
