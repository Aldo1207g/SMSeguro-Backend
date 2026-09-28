## SMSeguro - API Backend

Servicio backend REST desarrollado con NestJS y MySQL para la plataforma de reporte, validación comunitaria y mitigación de mensajes SMS fraudulentos (smishing)

## Integrantes - Equipo 6

* Aldo Gabriel Bejar Ortiz - A01669506
* Eduardo Arteaga Camacho - A01669207
* Denzel Zlathan López Cabrera - A01669190
* Irving Ariel Rosas Godinez - A01803057

## Materia: Integración de seguridad informática en redes y sistemas de software (TC2007B.452)

## Stack Tecnológico
- Framework: NestJS (Node.js con TypeScript)
- Base de datos: MySQL 8 (modelo relacional normalizado a Tercera Forma Normal - 3FN)[cite: 17]
- Conector de base de datos: mysql2/promise mediante pool de conexiones
- Seguridad:

  * Consultas preparadas parametrizadas en capa de datos para prevención de SQL Injection.
  * Hashing de credenciales mediante bcrypt (salting a 10 rondas).
  * Validación y sanitización estricta de payloads con Data Transfer Objects (DTO) y class-validator.
  * Habilitación de CORS para integración con clientes móviles (iOS/Xcode) y web.

## Estructura del Proyecto

smseguro-backend/
├── database/
│   └── smseguro_db.sql        # Script DDL/DML de la base de datos
├── src/
│   ├── auth/                  # Módulo de autenticación y usuarios
│   │   ├── dto/               # Validaciones de entrada (Register, Login, Reset)
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   ├── database/              # Módulo global de conexión MySQL
│   │   ├── database.module.ts
│   │   └── database.service.ts
│   ├── app.module.ts          # Módulo principal de la aplicación
│   └── main.ts                # Bootstrap, CORS y ValidationPipe global
├── .env.ejemplo               # Plantilla de variables de entorno
├── .gitignore
├── package.json
└── README.md

## Requisitos Previos
- Node.js v18 o superior
- Gestor de paquetes npm
- Servidor MySQL activo localmente (puerto 3306)
