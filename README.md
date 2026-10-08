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
- Estado de seguridad (entorno de prácticas, pendiente de endurecer):

  * Las consultas SQL se arman por interpolación de strings en la capa de datos; aún no se parametrizan.
  * El hash de credenciales usa SHA-256 sin salt; todavía no se migra a bcrypt.
  * Las credenciales de la base de datos están escritas directamente en el código (sin variables de entorno).
  * Validación de payloads con Data Transfer Objects (DTO) y class-validator.
  * Habilitación de CORS para integración con clientes móviles (iOS/Xcode) y web.

  > Nota: este repositorio es el entorno base para la fase de auditoría de seguridad
  > del curso. Los puntos anteriores se corregirán como parte de ese ejercicio.

## Requisitos Previos
- Node.js v18 o superior
- Gestor de paquetes npm
- Servidor MySQL activo localmente (puerto 3306)
