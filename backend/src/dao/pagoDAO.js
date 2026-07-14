const db = require('../db/database');

function crear(datos) {
  const result = db.prepare(`
    INSERT INTO pagos (reservaId, tipoPago, monto, medioPago, estado, observacion)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    datos.reservaId,
    datos.tipoPago,
    datos.monto,
    datos.medioPago,
    datos.estado || 'VALIDADO',
    datos.observacion || ''
  );
  return db.prepare('SELECT * FROM pagos WHERE id = ?').get(result.lastInsertRowid);
}

function listar() {
  return db.prepare('SELECT * FROM pagos ORDER BY id DESC').all();
}

function listarPorReserva(reservaId) {
  return db.prepare('SELECT * FROM pagos WHERE reservaId = ? ORDER BY id').all(reservaId);
}

function buscarAdelanto(reservaId) {
  return db.prepare(`
    SELECT * FROM pagos WHERE reservaId = ? AND tipoPago = 'ADELANTO'
    ORDER BY id DESC LIMIT 1
  `).get(reservaId);
}


function totalIngresos() {
  return db.prepare("SELECT COALESCE(SUM(monto), 0) AS total FROM pagos WHERE estado = 'VALIDADO'").get().total;
}

function ingresosPorTipo(fechaInicio = null, fechaFin = null) {
  return db.prepare(`
    SELECT tipoPago, COALESCE(SUM(monto), 0) AS total
    FROM pagos
    WHERE estado = 'VALIDADO'
      AND (? IS NULL OR date(fechaPago) >= ?)
      AND (? IS NULL OR date(fechaPago) <= ?)
    GROUP BY tipoPago ORDER BY tipoPago
  `).all(fechaInicio, fechaInicio, fechaFin, fechaFin);
}

function ingresosPorPeriodo(fechaInicio, fechaFin) {
  return db.prepare(`
    SELECT date(fechaPago) AS fecha, COALESCE(SUM(monto), 0) AS total
    FROM pagos
    WHERE estado = 'VALIDADO' AND date(fechaPago) BETWEEN ? AND ?
    GROUP BY date(fechaPago)
    ORDER BY fecha
  `).all(fechaInicio, fechaFin);
}

module.exports = { crear, listar, listarPorReserva, buscarAdelanto, totalIngresos, ingresosPorTipo, ingresosPorPeriodo };
