const db = require('../db/database');

const SELECT_DETALLE = `
  SELECT r.*, u.nombres AS cliente, u.telefono, u.correo,
         h.fecha, h.horaInicio, h.horaFin, h.estado AS estadoHorario,
         c.id AS comprobanteId, c.nombreArchivo, c.rutaArchivo,
         c.numeroOperacion, c.medioPago AS medioPagoComprobante,
         c.montoDeclarado, c.estadoValidacion AS estadoComprobante,
         c.observacion AS observacionComprobante
  FROM reservas r
  JOIN usuarios u ON u.id = r.usuarioId
  JOIN horarios h ON h.id = r.horarioId
  LEFT JOIN comprobantes c ON c.reservaId = r.id
`;

function listar(filtros = {}) {
  const condiciones = [];
  const params = [];
  if (filtros.fecha) { condiciones.push('h.fecha = ?'); params.push(filtros.fecha); }
  if (filtros.estado) { condiciones.push('r.estado = ?'); params.push(filtros.estado); }
  if (filtros.cliente) { condiciones.push('u.nombres LIKE ?'); params.push(`%${filtros.cliente}%`); }
  if (filtros.deporte) { condiciones.push('r.deporte = ?'); params.push(filtros.deporte); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  return db.prepare(`${SELECT_DETALLE} ${where} ORDER BY r.id DESC`).all(...params);
}

function listarPorCliente(usuarioId) {
  return db.prepare(`${SELECT_DETALLE} WHERE r.usuarioId = ? ORDER BY r.id DESC`).all(usuarioId);
}

function buscarPorId(id) {
  return db.prepare(`${SELECT_DETALLE} WHERE r.id = ?`).get(id);
}

function buscarActivaPorHorario(horarioId) {
  return db.prepare(`
    SELECT id, estado FROM reservas
    WHERE horarioId = ? AND estado IN ('PENDIENTE_VALIDACION','CONFIRMADA')
    ORDER BY id DESC LIMIT 1
  `).get(horarioId);
}

function existeActivaPorHorario(horarioId) {
  return Boolean(buscarActivaPorHorario(horarioId));
}

function crear(datos) {
  const result = db.prepare(`
    INSERT INTO reservas (
      codigoReserva, usuarioId, administradorId, horarioId, tarifaId,
      deporte, turno, montoTotal, saldoPendiente, estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE_VALIDACION')
  `).run(
    datos.codigoReserva,
    datos.usuarioId,
    datos.administradorId || null,
    datos.horarioId,
    datos.tarifaId,
    datos.deporte,
    datos.turno,
    datos.montoTotal,
    datos.montoTotal
  );
  return buscarPorId(result.lastInsertRowid);
}

function actualizarEstado(id, estado, extras = {}) {
  db.prepare(`
    UPDATE reservas
    SET estado = ?,
        administradorId = COALESCE(?, administradorId),
        motivoCancelacion = COALESCE(?, motivoCancelacion),
        motivoRechazo = COALESCE(?, motivoRechazo),
        fechaActualizacion = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    estado,
    extras.administradorId || null,
    extras.motivoCancelacion || null,
    extras.motivoRechazo || null,
    id
  );
  return buscarPorId(id);
}

function actualizarPagos(id, pagoAdelanto, pagoFinal, saldoPendiente) {
  db.prepare(`
    UPDATE reservas
    SET pagoAdelanto = ?, pagoFinal = ?, saldoPendiente = ?, fechaActualizacion = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(pagoAdelanto, pagoFinal, saldoPendiente, id);
  return buscarPorId(id);
}


function contarResumen() {
  return {
    totalReservas: db.prepare('SELECT COUNT(*) AS total FROM reservas').get().total,
    pendientes: db.prepare("SELECT COUNT(*) AS total FROM reservas WHERE estado = 'PENDIENTE_VALIDACION'").get().total,
    confirmadas: db.prepare("SELECT COUNT(*) AS total FROM reservas WHERE estado = 'CONFIRMADA'").get().total,
    completadas: db.prepare("SELECT COUNT(*) AS total FROM reservas WHERE estado = 'COMPLETADA'").get().total,
    canceladas: db.prepare("SELECT COUNT(*) AS total FROM reservas WHERE estado = 'CANCELADA'").get().total
  };
}

function agruparPorEstado(fechaInicio, fechaFin) {
  return db.prepare(`
    SELECT estado, COUNT(*) AS total
    FROM reservas r
    JOIN horarios h ON h.id = r.horarioId
    WHERE (? IS NULL OR h.fecha >= ?) AND (? IS NULL OR h.fecha <= ?)
    GROUP BY estado ORDER BY estado
  `).all(fechaInicio || null, fechaInicio || null, fechaFin || null, fechaFin || null);
}

function horariosMasReservados(fechaInicio, fechaFin) {
  return db.prepare(`
    SELECT h.horaInicio, h.horaFin, COUNT(*) AS total
    FROM reservas r
    JOIN horarios h ON h.id = r.horarioId
    WHERE r.estado IN ('CONFIRMADA','COMPLETADA')
      AND h.fecha BETWEEN ? AND ?
    GROUP BY h.horaInicio, h.horaFin
    ORDER BY total DESC, h.horaInicio
    LIMIT 10
  `).all(fechaInicio, fechaFin);
}

function clientesFrecuentes(fechaInicio, fechaFin) {
  return db.prepare(`
    SELECT u.id, u.nombres, u.correo, COUNT(*) AS totalReservas
    FROM reservas r
    JOIN usuarios u ON u.id = r.usuarioId
    JOIN horarios h ON h.id = r.horarioId
    WHERE r.estado IN ('CONFIRMADA','COMPLETADA')
      AND h.fecha BETWEEN ? AND ?
    GROUP BY u.id, u.nombres, u.correo
    ORDER BY totalReservas DESC, u.nombres
    LIMIT 10
  `).all(fechaInicio, fechaFin);
}

function canceladasPorPeriodo(fechaInicio, fechaFin) {
  return db.prepare(`
    SELECT r.id, r.codigoReserva, u.nombres AS cliente, h.fecha,
           h.horaInicio, h.horaFin, r.motivoCancelacion
    FROM reservas r
    JOIN usuarios u ON u.id = r.usuarioId
    JOIN horarios h ON h.id = r.horarioId
    WHERE r.estado = 'CANCELADA' AND h.fecha BETWEEN ? AND ?
    ORDER BY h.fecha, h.horaInicio
  `).all(fechaInicio, fechaFin);
}

module.exports = {
  listar,
  listarPorCliente,
  buscarPorId,
  buscarActivaPorHorario,
  existeActivaPorHorario,
  crear,
  actualizarEstado,
  actualizarPagos,
  contarResumen,
  agruparPorEstado,
  horariosMasReservados,
  clientesFrecuentes,
  canceladasPorPeriodo
};
