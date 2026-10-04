# SMSeguro — API (Backend)

API REST del sistema **SMSeguro**, una plataforma para reportar y revisar
posibles fraudes por SMS y enlaces. Los ciudadanos crean reportes desde la app
de iOS y los analistas los revisan desde el panel web. Hecha con **NestJS** y
**MySQL**.

Proyecto del curso **Seguridad informática** (TC2007B).

## Requisitos

- Node.js 20 o superior
- MySQL 8 corriendo en `localhost:3306`

## Cómo correr

```bash
npm install
mysql -u root -p < database/smseguro_db.sql   # crea la base `smseguro`
npm run start:dev                              # http://localhost:3000
```

La documentación interactiva queda en <http://localhost:3000/docs> (Swagger UI).

## Configuración

La conexión a MySQL se lee de un archivo `.env` en la raíz del proyecto:

| Variable      | Ejemplo     | Descripción                |
|---------------|-------------|----------------------------|
| `DB_HOST`     | `localhost` | Host de MySQL              |
| `DB_PORT`     | `3306`      | Puerto de MySQL            |
| `DB_USER`     | `root`      | Usuario de MySQL           |
| `DB_PASSWORD` | `root`      | Contraseña de MySQL        |
| `DB_NAME`     | `smseguro`  | Nombre de la base de datos |

El token JWT se firma con una llave secreta que está en el módulo `auth`.

## Endpoints principales

Las rutas de `/reportes` piden `Authorization: Bearer <accessToken>`. Las
marcadas con **Analista** además requieren rol de analista o administrador.

| Método | Ruta                               | Auth     | Qué hace                                 |
|--------|------------------------------------|----------|------------------------------------------|
| POST   | `/auth/register`                   | no       | Registra un usuario                      |
| POST   | `/auth/login`                      | no       | Regresa accessToken y refreshToken       |
| POST   | `/auth/refresh`                    | no       | Access token nuevo desde el refresh      |
| GET    | `/categorias`                      | Bearer   | Lista las categorías de fraude           |
| POST   | `/reportes`                        | Bearer   | Crea un reporte                          |
| GET    | `/reportes/mis-reportes`           | Bearer   | Reportes del usuario logueado            |
| POST   | `/reportes/:id/captura`            | Bearer   | Sube la foto de evidencia                |
| GET    | `/reportes/:id/captura`            | Bearer   | Devuelve la foto de evidencia            |
| GET    | `/reportes/pendientes`             | Analista | Bandeja de reportes por revisar          |
| GET    | `/reportes/por-estado/:idEstado`   | Analista | Reportes por estado (2=Aprob, 3=Rechaz)  |
| POST   | `/reportes/:id/dictamen`           | Analista | Aprueba o rechaza un reporte             |
| GET    | `/reportes/estadisticas/dashboard` | Analista | Totales por categoría y estado           |

La lista completa está en `/docs`.

## Estructura

```
src/
├── main.ts         arranque, ValidationPipe, CORS y Swagger en /docs
├── app.module.ts
├── database/       conexión a MySQL (mysql2)
├── auth/           registro, login, refresh y guards (JWT)
├── reportes/       crear, listar, subir foto y detalle de reportes
├── dictamen/       aprobar / rechazar reportes
├── estadisticas/   catálogos de categorías y estados
├── categorias/     catálogo de tipos de fraude
└── indicadores/    exportar indicadores
database/smseguro_db.sql   script de la base de datos
```
