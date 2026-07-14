require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./database');

function toISODateLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function generarHorariosBase() {
  const horarios = [];
  for (let hora = 7; hora < 23; hora += 1) {
    horarios.push({
      horaInicio: `${String(hora).padStart(2, '0')}:00`,
      horaFin: `${String(hora + 1).padStart(2, '0')}:00`,
      turno: hora < 18 ? 'DIA' : 'NOCHE'
    });
  }
  return horarios;
}

function crearEstructura() {
  db.exec(`
    DROP TABLE IF EXISTS pagos;
    DROP TABLE IF EXISTS comprobantes;
    DROP TABLE IF EXISTS cupones;
    DROP TABLE IF EXISTS reservas;
    DROP TABLE IF EXISTS horarios;
    DROP TABLE IF EXISTS tarifas;
    DROP TABLE IF EXISTS canchas;
    DROP TABLE IF EXISTS usuarios;

    CREATE TABLE usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombres TEXT NOT NULL,
      telefono TEXT NOT NULL DEFAULT '',
      correo TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      rol TEXT NOT NULL CHECK (rol IN ('CLIENTE','ADMINISTRADOR')),
      estado INTEGER NOT NULL DEFAULT 1 CHECK (estado IN (0,1)),
      creadoEn TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE canchas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      ubicacion TEXT NOT NULL DEFAULT '',
      descripcion TEXT NOT NULL DEFAULT '',
      estado INTEGER NOT NULL DEFAULT 1 CHECK (estado IN (0,1))
    );

    CREATE TABLE horarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      horaInicio TEXT NOT NULL,
      horaFin TEXT NOT NULL,
      turno TEXT NOT NULL CHECK (turno IN ('DIA','NOCHE')),
      estado TEXT NOT NULL DEFAULT 'DISPONIBLE' CHECK (estado IN ('DISPONIBLE','INHABILITADO')),
      canchaId INTEGER NOT NULL,
      FOREIGN KEY (canchaId) REFERENCES canchas(id),
      UNIQUE (canchaId, fecha, horaInicio, horaFin)
    );

    CREATE TABLE tarifas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deporte TEXT NOT NULL CHECK (deporte IN ('FUTBOL','FULBITO','VOLEY')),
      turno TEXT NOT NULL CHECK (turno IN ('DIA','NOCHE')),
      precio REAL NOT NULL CHECK (precio > 0),
      estado INTEGER NOT NULL DEFAULT 1 CHECK (estado IN (0,1)),
      creadoEn TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX uq_tarifa_activa
      ON tarifas(deporte, turno)
      WHERE estado = 1;

    CREATE TABLE reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigoReserva TEXT NOT NULL UNIQUE,
      usuarioId INTEGER NOT NULL,
      administradorId INTEGER,
      horarioId INTEGER NOT NULL,
      tarifaId INTEGER NOT NULL,
      deporte TEXT NOT NULL CHECK (deporte IN ('FUTBOL','FULBITO','VOLEY')),
      turno TEXT NOT NULL CHECK (turno IN ('DIA','NOCHE')),
      montoTotal REAL NOT NULL CHECK (montoTotal > 0),
      pagoAdelanto REAL NOT NULL DEFAULT 0 CHECK (pagoAdelanto >= 0),
      pagoFinal REAL NOT NULL DEFAULT 0 CHECK (pagoFinal >= 0),
      saldoPendiente REAL NOT NULL CHECK (saldoPendiente >= 0),
      estado TEXT NOT NULL DEFAULT 'PENDIENTE_VALIDACION'
        CHECK (estado IN ('PENDIENTE_VALIDACION','CONFIRMADA','RECHAZADA','CANCELADA','COMPLETADA')),
      motivoCancelacion TEXT,
      motivoRechazo TEXT,
      fechaRegistro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      fechaActualizacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuarioId) REFERENCES usuarios(id),
      FOREIGN KEY (administradorId) REFERENCES usuarios(id),
      FOREIGN KEY (horarioId) REFERENCES horarios(id),
      FOREIGN KEY (tarifaId) REFERENCES tarifas(id)
    );

    CREATE UNIQUE INDEX uq_reserva_activa_horario
      ON reservas(horarioId)
      WHERE estado IN ('PENDIENTE_VALIDACION','CONFIRMADA');

    CREATE TABLE comprobantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservaId INTEGER NOT NULL UNIQUE,
      nombreArchivo TEXT NOT NULL,
      rutaArchivo TEXT NOT NULL,
      numeroOperacion TEXT,
      medioPago TEXT NOT NULL CHECK (medioPago IN ('YAPE','PLIN','TRANSFERENCIA','EFECTIVO')),
      montoDeclarado REAL NOT NULL CHECK (montoDeclarado >= 5),
      estadoValidacion TEXT NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estadoValidacion IN ('PENDIENTE','VALIDO','INVALIDO','NO_VERIFICABLE')),
      observacion TEXT,
      fechaCarga TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      fechaValidacion TEXT,
      administradorId INTEGER,
      FOREIGN KEY (reservaId) REFERENCES reservas(id),
      FOREIGN KEY (administradorId) REFERENCES usuarios(id)
    );

    CREATE TABLE pagos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservaId INTEGER NOT NULL,
      tipoPago TEXT NOT NULL CHECK (tipoPago IN ('ADELANTO','PAGO_FINAL')),
      monto REAL NOT NULL CHECK (monto > 0),
      medioPago TEXT NOT NULL CHECK (medioPago IN ('YAPE','PLIN','TRANSFERENCIA','EFECTIVO')),
      estado TEXT NOT NULL DEFAULT 'VALIDADO' CHECK (estado IN ('PENDIENTE','VALIDADO','RECHAZADO')),
      observacion TEXT,
      fechaPago TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reservaId) REFERENCES reservas(id)
    );
  `);
}

function cargarDatosDemo() {
  const hashAdmin = bcrypt.hashSync('admin123', 10);
  const hashCliente = bcrypt.hashSync('cliente123', 10);

  db.prepare(`
    INSERT INTO usuarios (nombres, telefono, correo, passwordHash, rol)
    VALUES (?, ?, ?, ?, ?)
  `).run('Administrador Grass Chessy', '999999999', 'admin@grasschessy.com', hashAdmin, 'ADMINISTRADOR');

  db.prepare(`
    INSERT INTO usuarios (nombres, telefono, correo, passwordHash, rol)
    VALUES (?, ?, ?, ?, ?)
  `).run('Cliente Demo', '988888888', 'cliente@demo.com', hashCliente, 'CLIENTE');

  db.prepare(`
    INSERT INTO canchas (nombre, ubicacion, descripcion)
    VALUES (?, ?, ?)
  `).run(
    'Grass Chessy',
    'Jr. Cañete 665, San Juan Bautista, Huamanga - Ayacucho',
    'Cancha deportiva para fútbol, fulbito, vóley y actividades autorizadas.'
  );

  const insertarTarifa = db.prepare(`
    INSERT INTO tarifas (deporte, turno, precio) VALUES (?, ?, ?)
  `);

  [
    ['FUTBOL', 'DIA', 20],
    ['FUTBOL', 'NOCHE', 30],
    ['FULBITO', 'DIA', 20],
    ['FULBITO', 'NOCHE', 30],
    ['VOLEY', 'DIA', 15],
    ['VOLEY', 'NOCHE', 25]
  ].forEach((tarifa) => insertarTarifa.run(...tarifa));

  const insertarHorario = db.prepare(`
    INSERT OR IGNORE INTO horarios (fecha, horaInicio, horaFin, turno, canchaId)
    VALUES (?, ?, ?, ?, 1)
  `);

  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const horarios = generarHorariosBase();

  for (let i = 0; i < 90; i += 1) {
    const fecha = new Date(inicio);
    fecha.setDate(inicio.getDate() + i);
    const fechaISO = toISODateLocal(fecha);
    horarios.forEach(({ horaInicio, horaFin, turno }) => {
      insertarHorario.run(fechaISO, horaInicio, horaFin, turno);
    });
  }
}

function run() {
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('BEGIN IMMEDIATE');
  try {
    crearEstructura();
    cargarDatosDemo();
    db.exec('COMMIT');
    db.exec('PRAGMA foreign_keys = ON');
    console.log('Base de datos creada y datos demo cargados correctamente.');
  } catch (error) {
    db.exec('ROLLBACK');
    db.exec('PRAGMA foreign_keys = ON');
    console.error('No se pudo preparar la base de datos:', error.message);
    throw error;
  }
}

if (require.main === module) {
  run();
}

module.exports = { run, generarHorariosBase, toISODateLocal };
