# Gestión de Reservas y Pagos del Grass Chessy

Aplicación web académica desarrollada para el curso Diseño de Software IS-387 mediante la metodología ICONIX. Permite consultar disponibilidad, registrar reservas, adjuntar y validar comprobantes, confirmar o rechazar reservas, cancelar reservas, registrar el pago final, gestionar horarios y tarifas, y consultar reportes administrativos.

## Arquitectura y tecnologías

- Frontend: React 18 + Vite 6 + JavaScript + CSS.
- Backend: Node.js + Express.
- Base de datos: SQLite mediante `node:sqlite`.
- Autenticación: JSON Web Token.
- Contraseñas: bcryptjs.
- Archivos: Multer.
- Pruebas: módulo nativo `node:test`.

La estructura separa interfaces, rutas, controladores, clases DAO, servicios y persistencia.

## Requisitos

- Node.js 22 o superior.
- npm.

> Node puede mostrar una advertencia indicando que `node:sqlite` es experimental. La advertencia no impide ejecutar la aplicación.

## Instalación y ejecución

Desde la carpeta raíz:

```bash
npm install
npm run install:all
npm run db:setup
npm run dev
```

Direcciones:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Verificación de API: `http://localhost:4000/api/health`

## Usuarios de demostración

Administrador:

```text
correo: admin@grasschessy.com
clave: admin123
```

Cliente:

```text
correo: cliente@demo.com
clave: cliente123
```

## Casos de uso implementados

- CU-01 Iniciar sesión.
- CU-02 Consultar disponibilidad.
- CU-03 Registrar reserva.
- CU-04 Adjuntar comprobante de pago.
- CU-05 Consultar historial de reservas.
- CU-06 Cancelar reserva.
- CU-07 Consultar reservas.
- CU-08 Validar comprobante de pago.
- CU-09 Confirmar reserva.
- CU-10 Rechazar reserva.
- CU-11 Registrar pago final.
- CU-12 Gestionar horarios.
- CU-13 Gestionar tarifas.
- CU-14 Consultar reportes.

## Reglas de negocio implementadas

- Los horarios base se generan desde las 07:00 hasta las 23:00.
- No puede existir más de una reserva pendiente o confirmada para el mismo horario.
- No se puede reservar un horario pasado o inhabilitado.
- Toda reserva nueva inicia como `PENDIENTE_VALIDACION`.
- El comprobante se adjunta después de registrar la reserva.
- El adelanto mínimo es S/ 5.00.
- El Administrador registra el resultado de la validación como `VALIDO`, `INVALIDO` o `NO_VERIFICABLE`.
- Una reserva solo puede confirmarse cuando su comprobante está validado como `VALIDO`.
- Una reserva rechazada o cancelada libera el horario.
- La cancelación exige al menos una hora de anticipación.
- El pago final debe cubrir exactamente el saldo pendiente.
- Una reserva cambia a `COMPLETADA` después de registrar el pago final.
- Las tarifas anteriores se inhabilitan en lugar de eliminarse físicamente.

## Base de datos

El comando `npm run db:setup` recrea la base de datos y carga:

- una cancha;
- un Administrador;
- un Cliente;
- seis tarifas;
- 16 bloques diarios durante 90 días.

Tablas:

- `usuarios`
- `canchas`
- `horarios`
- `tarifas`
- `reservas`
- `comprobantes`
- `pagos`

## Pruebas

Desde la carpeta `backend`:

```bash
npm test
```

La versión entregada contiene 12 pruebas aprobadas que cubren:

- disponibilidad del backend;
- autenticación válida e inválida;
- generación completa de horarios;
- registro de reserva;
- prevención de cruces;
- carga de comprobante;
- validación y confirmación;
- validación del monto y registro del pago final;
- reglas puras de horarios, saldo y cancelación;
- cifrado y comparación de contraseñas.

## Endpoints principales

```text
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/me

GET    /api/horarios?fecha=YYYY-MM-DD
POST   /api/horarios
PUT    /api/horarios/:id
PATCH  /api/horarios/:id/habilitar
PATCH  /api/horarios/:id/inhabilitar

GET    /api/tarifas
POST   /api/tarifas
PUT    /api/tarifas/:id
PATCH  /api/tarifas/:id/habilitar
PATCH  /api/tarifas/:id/inhabilitar

GET    /api/reservas
GET    /api/reservas/mis-reservas
POST   /api/reservas
POST   /api/reservas/:id/comprobante
PATCH  /api/reservas/:id/validar-comprobante
PATCH  /api/reservas/:id/confirmar
PATCH  /api/reservas/:id/rechazar
PATCH  /api/reservas/:id/cancelar

POST   /api/pagos/final

GET    /api/reportes/resumen
GET    /api/reportes/reservas-por-estado
GET    /api/reportes/ingresos
GET    /api/reportes/ingresos-dia
GET    /api/reportes/ingresos-semana
GET    /api/reportes/ingresos-mes
GET    /api/reportes/horarios-mas-reservados
GET    /api/reportes/clientes-frecuentes
GET    /api/reportes/reservas-canceladas
```

## Estructura principal

```text
gestion-reservas-pagos-grass-chessy-corregido/
├── backend/
│   ├── data/
│   ├── src/
│   │   ├── controllers/
│   │   ├── dao/
│   │   ├── db/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   └── services/
│   ├── tests/
│   └── uploads/
├── frontend/
│   ├── public/
│   └── src/
├── CAMBIOS_REALIZADOS.md
├── GUIA_EVIDENCIAS_INFORME.md
└── README.md
```

## Alcance académico

- No existe integración directa con Yape, Plin o bancos.
- La validación del comprobante es manual.
- Se administra una sola cancha.
- SQLite se utiliza para facilitar la ejecución local.
- La aplicación necesita alojamiento y configuración de producción antes de publicarse en internet.
