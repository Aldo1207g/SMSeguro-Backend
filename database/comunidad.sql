USE smseguro;

-- Un usuario solo puede marcar una vez el mismo reporte.
CREATE TABLE IF NOT EXISTS reporte_mismo_caso (
    id_reporte INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id_reporte, id_usuario),

    FOREIGN KEY (id_reporte) REFERENCES reporte(id_reporte),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
) ENGINE = InnoDB;

-- Comentarios de los usuarios asociados a cada reporte.
CREATE TABLE IF NOT EXISTS comentario_reporte (
    id_comentario INT AUTO_INCREMENT PRIMARY KEY,
    id_reporte INT NOT NULL,
    id_usuario INT NOT NULL,
    contenido VARCHAR(1000) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_comentario_reporte (id_reporte, id_comentario),

    FOREIGN KEY (id_reporte) REFERENCES reporte(id_reporte),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4;