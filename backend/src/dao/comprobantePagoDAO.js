const db = require('../db/database');

function buscarPorReserva(reservaId) {
  return db.prepare('SELECT * FROM comprobantes WHERE reservaId = ?').get(reservaId);
}

function crear(datos) {
  const result = db.prepare(`
    INSERT INTO comprobantes (
      reservaId, nombreArchivo, rutaArchivo, numeroOperacion,
      medioPago, montoDeclarado
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    datos.reservaId,
    datos.nombreArchivo,
    datos.rutaArchivo,
    datos.numeroOperacion || null,
    datos.medioPago,
    datos.montoDeclarado
  );
  return db.prepare('SELECT * FROM comprobantes WHERE id = ?').get(result.lastInsertRowid);
}


function reemplazar(reservaId, datos) {
  db.prepare(`
    UPDATE comprobantes
    SET nombreArchivo = ?, rutaArchivo = ?, numeroOperacion = ?, medioPago = ?,
        montoDeclarado = ?, estadoValidacion = 'PENDIENTE', observacion = NULL,
        fechaCarga = CURRENT_TIMESTAMP, fechaValidacion = NULL, administradorId = NULL
    WHERE reservaId = ?
  `).run(
    datos.nombreArchivo,
    datos.rutaArchivo,
    datos.numeroOperacion || null,
    datos.medioPago,
    datos.montoDeclarado,
    reservaId
  );
  return buscarPorReserva(reservaId);
}

function actualizarValidacion(reservaId, datos) {
  db.prepare(`
    UPDATE comprobantes
    SET estadoValidacion = ?, observacion = ?, administradorId = ?,
        fechaValidacion = CURRENT_TIMESTAMP
    WHERE reservaId = ?
  `).run(datos.estadoValidacion, datos.observacion || '', datos.administradorId, reservaId);
  return buscarPorReserva(reservaId);
}

module.exports = { buscarPorReserva, crear, reemplazar, actualizarValidacion };
