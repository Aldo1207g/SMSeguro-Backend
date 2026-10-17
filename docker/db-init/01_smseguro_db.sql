-- SMSeguro - Equipo 6

DROP DATABASE IF EXISTS smseguro;
CREATE DATABASE smseguro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smseguro;

-- 1. TABLAS CATÁLOGO

CREATE TABLE cat_rol_usuario (
    id_rol_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE cat_estado_reporte (
    id_estado_reporte INT AUTO_INCREMENT PRIMARY KEY,
    nombre_estado VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE cat_tipo_fraude (
    id_tipo_fraude INT AUTO_INCREMENT PRIMARY KEY,
    nombre_tipo VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE cat_tipo_dato (
    id_tipo_dato INT AUTO_INCREMENT PRIMARY KEY,
    nombre_tipo VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE cat_rol_indicador (
    id_rol_indicador INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE cat_resolucion (
    id_resolucion INT AUTO_INCREMENT PRIMARY KEY,
    nombre_resolucion VARCHAR(50) NOT NULL UNIQUE
);

-- 2. DATOS INICIALES

INSERT INTO cat_rol_usuario (nombre_rol) VALUES ('Ciudadano'), ('Analista'), ('Administrador');
INSERT INTO cat_estado_reporte (nombre_estado) VALUES ('Pendiente'), ('Aprobado'), ('Rechazado');
INSERT INTO cat_tipo_fraude (nombre_tipo) VALUES ('Banco'), ('Paqueteria'), ('Multa'), ('Otro');
INSERT INTO cat_tipo_dato (nombre_tipo) VALUES ('Telefono'), ('URL');
INSERT INTO cat_rol_indicador (nombre_rol) VALUES ('Remitente'), ('Enlace'), ('Otro');
INSERT INTO cat_resolucion (nombre_resolucion) VALUES ('Aprobado'), ('Rechazado');

-- 3. TABLAS PRINCIPALES

CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_usuario VARCHAR(100) NOT NULL,
    correo_electronico VARCHAR(150) NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    id_rol_usuario INT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_rol_usuario) REFERENCES cat_rol_usuario(id_rol_usuario)
);

CREATE TABLE indicador (
    id_indicador INT AUTO_INCREMENT PRIMARY KEY,
    id_tipo_dato INT NOT NULL,
    valor_dato VARCHAR(255) NOT NULL UNIQUE,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_tipo_dato) REFERENCES cat_tipo_dato(id_tipo_dato)
);

CREATE TABLE reporte (
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

CREATE TABLE captura (
    id_captura INT AUTO_INCREMENT PRIMARY KEY,
    id_reporte INT NOT NULL,
    ruta_archivo VARCHAR(255) NOT NULL,
    tamano_bytes INT NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    hash_archivo CHAR(64) NOT NULL UNIQUE,
    es_publica BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    CHECK (tamano_bytes > 0 AND tamano_bytes <= 5242880),
    FOREIGN KEY (id_reporte) REFERENCES reporte(id_reporte)
);

-- 4. RELACIÓN N:M Y DICTAMEN

CREATE TABLE detalle_reporte (
    id_reporte INT NOT NULL,
    id_indicador INT NOT NULL,
    id_rol_indicador INT NOT NULL,
    PRIMARY KEY (id_reporte, id_indicador),
    FOREIGN KEY (id_reporte) REFERENCES reporte(id_reporte),
    FOREIGN KEY (id_indicador) REFERENCES indicador(id_indicador),
    FOREIGN KEY (id_rol_indicador) REFERENCES cat_rol_indicador(id_rol_indicador)
);

CREATE TABLE dictamen (
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
-- 5. CONSEJOS / GUÍAS (los publica el analista/admin, los ve el ciudadano en la app)
CREATE TABLE consejo (
    id_consejo INT AUTO_INCREMENT PRIMARY KEY,
    id_analista INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    contenido TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_analista) REFERENCES usuario(id_usuario)
);
