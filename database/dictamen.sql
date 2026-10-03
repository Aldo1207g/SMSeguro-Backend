-- SMSeguro - Equipo 6
-- Módulo 1: Dictamen (POST /reportes/:id/dictamen)
--
-- Se ejecuta DESPUÉS de smseguro_db.sql. Usa los mismos nombres de tabla del
-- esquema del equipo (cat_resolucion, reporte, dictamen) y es idempotente:
-- puede correrse varias veces sin duplicar datos.

USE smseguro;

-- 1. CATÁLOGO DE RESOLUCIONES (1 = Aprobado, 2 = Rechazado)

CREATE TABLE IF NOT EXISTS cat_resolucion (
    id_resolucion INT AUTO_INCREMENT PRIMARY KEY,
    nombre_resolucion VARCHAR(50) NOT NULL UNIQUE
);

INSERT IGNORE INTO cat_resolucion (id_resolucion, nombre_resolucion)
VALUES (1, 'Aprobado'), (2, 'Rechazado');

-- 2. REPORTE (solo se crea si aún no existe)

CREATE TABLE IF NOT EXISTS reporte (
    id_reporte INT AUTO_INCREMENT PRIMARY KEY,
    folio_publico CHAR(12) NOT NULL UNIQUE,
    id_usuario INT NOT NULL,
    id_estado_actual INT NOT NULL DEFAULT 1,
    id_tipo_fraude INT NULL,
    descripcion TEXT NOT NULL,
    fecha_recepcion DATETIME NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_estado_actual) REFERENCES cat_estado_reporte(id_estado_reporte),
    FOREIGN KEY (id_tipo_fraude) REFERENCES cat_tipo_fraude(id_tipo_fraude)
);

-- 3. DICTAMEN (un reporte solo puede tener un dictamen)

CREATE TABLE IF NOT EXISTS dictamen (
    id_dictamen INT AUTO_INCREMENT PRIMARY KEY,
    id_reporte INT NOT NULL UNIQUE,
    id_analista INT NOT NULL,
    id_resolucion INT NOT NULL,
    motivo_rechazo VARCHAR(200) NULL,
    fecha_evaluacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_reporte) REFERENCES reporte(id_reporte),
    FOREIGN KEY (id_analista) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_resolucion) REFERENCES cat_resolucion(id_resolucion),
    CHECK (id_resolucion <> 2 OR motivo_rechazo IS NOT NULL)
);

-- 4. DATOS DE PRUEBA

-- Analista de prueba (rol 2 = Analista)
-- Correo: analista@smseguro.com  |  Contraseña: Analista123!
INSERT INTO usuario (nombre_usuario, correo_electronico, contrasena_hash, id_rol_usuario)
SELECT 'Analista Prueba', 'analista@smseguro.com',
       '$2b$10$cf2IgfYhEd6rLMU3XMs6kes4gfLc1gxHKfZKkuqLhbSL22WJl7cVS', 2
WHERE NOT EXISTS (
    SELECT 1 FROM usuario WHERE correo_electronico = 'analista@smseguro.com'
);

-- Reporte de prueba (estado 1 = Pendiente, tipo 1 = Banco)
INSERT IGNORE INTO reporte (folio_publico, id_usuario, id_estado_actual, id_tipo_fraude, descripcion, fecha_recepcion)
SELECT 'SMS-PRUEBA01', u.id_usuario, 1, 1,
       'SMS de prueba: "Tu cuenta BBVA fue bloqueada, ingresa a bit.ly/xxxx para reactivarla"',
       NOW()
FROM usuario u
WHERE u.correo_electronico = 'analista@smseguro.com';

-- Para ver el id del reporte de prueba:
-- SELECT id_reporte, folio_publico FROM reporte WHERE folio_publico = 'SMS-PRUEBA01';
