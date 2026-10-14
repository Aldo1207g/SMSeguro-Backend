-- SMSeguro - Equipo 6
-- Módulo 2: Datos de prueba para el dashboard de estadísticas
--   GET /estadisticas/categorias  y  GET /estadisticas/estados
--
-- Se ejecuta DESPUÉS de smseguro_db.sql. Es idempotente: los folios son
-- UNIQUE, así que correrlo varias veces no duplica reportes.
--
-- Catálogos usados (definidos en smseguro_db.sql):
--   cat_estado_reporte: 1 = Pendiente, 2 = Aprobado, 3 = Rechazado
--   cat_tipo_fraude:    1 = Banco, 2 = Paqueteria, 3 = Multa, 4 = Otro

USE smseguro;

-- Ciudadano de prueba que "envía" los reportes (rol 1 = Ciudadano)
-- Correo: ciudadano@smseguro.com  |  Contraseña: Ciudadano123!
INSERT INTO usuario (nombre_usuario, correo_electronico, contrasena_hash, id_rol_usuario)
SELECT 'Ciudadano Prueba', 'ciudadano@smseguro.com',
       '$2b$10$SCfLqIJiALmluytJR/73oO3q70uVt.7mp3/1evKV/asiSqyvy01pC', 1
WHERE NOT EXISTS (
    SELECT 1 FROM usuario WHERE correo_electronico = 'ciudadano@smseguro.com'
);

-- 6 reportes en distintos estados y tipos
INSERT IGNORE INTO reporte
    (folio_publico, id_usuario, id_estado_actual, id_tipo_fraude, descripcion, fecha_recepcion)
SELECT d.folio, u.id_usuario, d.estado, d.tipo, d.descripcion, d.fecha
FROM usuario u
CROSS JOIN (
    SELECT 'SMS-EST00001' AS folio, 1 AS estado, 1 AS tipo,
           'BBVA: Detectamos un cargo no reconocido, llama al 55 1234 5678' AS descripcion,
           NOW() - INTERVAL 6 DAY AS fecha
    UNION ALL SELECT 'SMS-EST00002', 2, 1,
           'Santander: Tu tarjeta fue suspendida, actívala en santander-mx.co',
           NOW() - INTERVAL 5 DAY
    UNION ALL SELECT 'SMS-EST00003', 1, 2,
           'DHL: Tu paquete está retenido, paga $35 en dhl-envios.top',
           NOW() - INTERVAL 4 DAY
    UNION ALL SELECT 'SMS-EST00004', 3, 2,
           'Estafeta: No pudimos entregar tu pedido, confirma tu dirección aquí',
           NOW() - INTERVAL 3 DAY
    UNION ALL SELECT 'SMS-EST00005', 2, 3,
           'SAT: Tienes una multa pendiente, evita el embargo en sat-pagos.info',
           NOW() - INTERVAL 2 DAY
    UNION ALL SELECT 'SMS-EST00006', 1, 4,
           'Ganaste un iPhone 16, reclámalo antes de 24 h en premios-mx.club',
           NOW() - INTERVAL 1 DAY
) AS d
WHERE u.correo_electronico = 'ciudadano@smseguro.com';

-- Verificación rápida (debe coincidir con lo que devuelven los endpoints):
-- SELECT e.nombre_estado, COUNT(r.id_reporte) FROM cat_estado_reporte e
--   LEFT JOIN reporte r ON r.id_estado_actual = e.id_estado_reporte AND r.activo = TRUE
--   GROUP BY e.id_estado_reporte, e.nombre_estado;
