# SMSeguro — API (Backend)

API REST del sistema **SMSeguro**, una plataforma para reportar y revisar
posibles fraudes por SMS y enlaces. Los ciudadanos crean reportes desde la app
de iOS y los analistas los revisan desde el panel web. Hecha con **NestJS** y
**MySQL**.

Proyecto del curso **Seguridad informática** (TC2007B).

## Requisitos

- Node.js 20 o superior.
- MySQL 8 corriendo en `localhost:3306`.
- Gestor de paquetes npm.

## Cómo correr

Instalar las dependencias:

```bash
npm install
```

Crear la base `smseguro` importando `database/smseguro_db.sql` desde MySQL
Workbench o utilizando este comando desde Bash o CMD:

```bash
mysql -u root -p < database/smseguro_db.sql
```

En PowerShell, importar el script desde MySQL Workbench, ya que la
redirección `<` del comando anterior no funciona igual que en Bash o CMD.

Comprobar la compilación:

```bash
npm run build
```

Iniciar el servidor en modo desarrollo:

```bash
npm run start:dev
```

La API queda disponible en http://localhost:3000.

La documentación interactiva queda en http://localhost:3000/docs
(Swagger UI).

## Configuración

### Conexión a MySQL

La rama de integración utilizaba originalmente variables de entorno.
Al combinarla con `main`, se conservó la configuración de conexión escrita
directamente en `src/database/database.service.ts`:

| Parámetro | Valor actual | Descripción |
|-----------|--------------|-------------|
| Host | `localhost` | Host de MySQL |
| Puerto | `3306` | Puerto de MySQL |
| Usuario | `root` | Usuario de MySQL |
| Contraseña | `root` | Contraseña de MySQL |
| Base de datos | `smseguro` | Nombre de la base de datos |

Estas eran las variables utilizadas por la configuración anterior.
Se conservan documentadas como referencia, pero la versión integrada del
servicio de base de datos no las utiliza actualmente:

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | Host de MySQL |
| `DB_PORT` | `3306` | Puerto de MySQL |
| `DB_USER` | `root` | Usuario de MySQL |
| `DB_PASSWORD` | `root` | Contraseña de MySQL |
| `DB_NAME` | `smseguro` | Nombre de la base de datos |

El servicio de base de datos conserva el pool de conexiones y la creación
de la tabla `consejo` si todavía no existe.

### Autenticación

La firma y verificación de tokens JWT se implementan en
`src/auth/jwt.ts`, dentro del módulo `auth`.

El inicio de sesión devuelve:

- `accessToken`: token de acceso con duración de 15 minutos.
- `refreshToken`: token de renovación con duración de 7 días.

El endpoint de renovación recibe el refresh token y genera un nuevo
access token.

El registro y restablecimiento de contraseñas utilizan bcrypt con un
factor de costo de 10. El inicio de sesión compara la contraseña ingresada
con el hash bcrypt almacenado.

Esta integración no convierte automáticamente las contraseñas que
pudieran estar almacenadas previamente como hashes SHA-256.

## Endpoints principales

Las rutas de `/reportes` piden `Authorization: Bearer <accessToken>`.
Las marcadas con **Analista** además requieren rol de analista o administrador.

| Método | Ruta | Auth | Qué hace |
|--------|------|------|----------|
| POST | `/auth/register` | No | Registra un usuario |
| POST | `/auth/login` | No | Regresa accessToken y refreshToken |
| POST | `/auth/refresh` | Refresh token en el cuerpo | Access token nuevo desde el refresh |
| GET | `/categorias` | Bearer | Lista las categorías de fraude |
| POST | `/reportes` | Bearer | Crea un reporte |
| GET | `/reportes/mis-reportes` | Bearer | Reportes del usuario logueado |
| POST | `/reportes/:id/captura` | Bearer | Sube la foto de evidencia |
| GET | `/reportes/:id/captura` | Bearer | Devuelve la foto de evidencia |
| GET | `/reportes/pendientes` | Analista | Bandeja de reportes por revisar |
| GET | `/reportes/por-estado/:idEstado` | Analista | Reportes por estado (2=Aprobado, 3=Rechazado) |
| POST | `/reportes/:id/dictamen` | Analista | Aprueba o rechaza un reporte |
| GET | `/reportes/estadisticas/dashboard` | Analista | Totales por categoría y estado |
| GET | `/guias` | No | Devuelve las guías preventivas incorporadas desde main |
| GET | `/indicadores/buscar?valor=...` | No | Busca si una URL o número ya fue reportado |
| GET | `/indicadores/lista-negra` | No | Devuelve los indicadores asociados a reportes aprobados |
| GET | `/indicadores/exportar` | No | Descarga el CSV de la implementación original de main |
| GET | `/indicadores/exportar-lista-negra` | Bearer y RolesGuard | Descarga el CSV de la rama de integración |

La lista completa está en `/docs`.

### Guías preventivas

El módulo `guias`, incorporado desde `main`, conserva dos ejemplos
definidos directamente en el controlador:

- Prevención de smishing bancario.
- Estafas de paquetería.

Cada guía incluye identificador, título, contenido educativo y ejemplo
visual del mensaje fraudulento.

El módulo `consejos` de la rama de integración también se conserva.
Las guías originales no sustituyen la funcionalidad de consejos.

### Búsqueda y lista negra

Se conservan las dos funcionalidades:

- `/indicadores/buscar?valor=...` permite consultar un número o URL.
  Devuelve el valor consultado, si fue encontrado, el total de reportes y
  las cantidades de aprobados y rechazados.
- `/indicadores/lista-negra` conserva la consulta de `main`, que devuelve
  indicadores relacionados con reportes cuyo estado actual es
  `2` (Aprobado), ordenados por fecha de registro descendente.

### Exportaciones CSV

Las dos ramas implementaban una exportación en `/indicadores/exportar`.
Para conservar ambas implementaciones sin registrar dos controladores
para el mismo método y ruta, quedaron separadas:

#### Exportación original de main

Ruta: `/indicadores/exportar`.

- Conserva el acceso sin autenticación del controlador original.
- Utiliza los métodos `obtenerListaNegra()` y `exportarCsv()`.
- Descarga el archivo `indicadores_compromiso.csv`.
- Incluye las columnas:
  - `id_indicador`
  - `valor_dato`
  - `tipo_dato`
  - `folio_publico`
  - `fecha_registro`

#### Exportación de la rama de integración

Ruta: `/indicadores/exportar-lista-negra`.

- Conserva `AuthGuard` y `RolesGuard`.
- Utiliza el método `exportarListaNegraCsv()` y el repositorio de indicadores.
- Descarga el archivo `lista_negra.csv`.
- Incluye BOM UTF-8 para facilitar la lectura de acentos en Excel.
- Conserva el tratamiento de comas y comillas de su implementación.
- Incluye las columnas:
  - `tipo_dato`
  - `valor_dato`
  - `reportes_aprobados`
  - `ultima_confirmacion`

Los clientes que utilizaban la exportación protegida de la rama de
integración deberán cambiar su URL de `/indicadores/exportar` a
`/indicadores/exportar-lista-negra`.

## Estructura

| Archivo o carpeta | Función |
|-------------------|---------|
| `src/main.ts` | Arranque, ValidationPipe, CORS y Swagger en `/docs` |
| `src/app.module.ts` | Registro e integración de los módulos |
| `src/database/` | Conexión a MySQL mediante mysql2 |
| `src/auth/` | Registro, login, refresh y guards JWT |
| `src/reportes/` | Crear, listar, subir foto y consultar detalle de reportes |
| `src/dictamen/` | Aprobar y rechazar reportes |
| `src/estadisticas/` | Consultas de estadísticas |
| `src/categorias/` | Catálogo de tipos de fraude |
| `src/consejos/` | Gestión de consejos preventivos |
| `src/guias/` | Guías preventivas originales de main |
| `src/indicadores/` | Buscar amenazas, consultar lista negra y exportar indicadores |
| `database/smseguro_db.sql` | Script de la base de datos |

## Stack Tecnológico

- Framework: NestJS (Node.js con TypeScript).
- Base de datos: MySQL 8, con modelo relacional diseñado con normalización
  a Tercera Forma Normal (3FN).
- Conector de base de datos: mysql2/promise mediante pool de conexiones.
- Documentación de API: Swagger UI.
- Autenticación: JWT con access token y refresh token.
- Hash de contraseñas: bcrypt.

### Estado de seguridad: entorno de prácticas, pendiente de auditoría

- En `auth.service.ts` se conservan consultas SQL armadas por interpolación
  de strings, procedentes de `main`. No se parametrizaron durante esta
  integración. Otras partes del backend sí utilizan consultas con parámetros.
- La versión original de `main` utilizaba SHA-256 sin salt para las
  contraseñas. En la integración se utiliza bcrypt, conforme al acuerdo
  del proyecto.
- Las credenciales de la base de datos permanecen escritas directamente
  en el código, sin utilizar variables de entorno en el servicio integrado.
- Se conserva la validación de payloads mediante DTO y class-validator.
- Se conserva CORS para integración con los clientes móviles y web.
- Se conservan los controles JWT y de roles de la rama de integración.
- La exportación original de `main` mantiene su acceso sin autenticación,
  mientras que la otra exportación conserva sus controles de acceso.

> Este repositorio es el entorno de trabajo para la fase de auditoría de
> seguridad del curso. La integración combina funcionalidades de las ramas
> y conserva comportamientos para su revisión. Encontrar, documentar y
> corregir las vulnerabilidades corresponde al ejercicio de auditoría.
> La compilación no demuestra que el sistema esté libre de vulnerabilidades.

## Requisitos Previos

- Node.js 20 o superior para el backend NestJS 11.
- Gestor de paquetes npm.
- Servidor MySQL activo localmente en el puerto 3306.
- Base de datos `smseguro` importada.
- Credenciales locales compatibles con la configuración de
  `src/database/database.service.ts`.