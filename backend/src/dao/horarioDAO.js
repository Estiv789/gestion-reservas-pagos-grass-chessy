const db = require('../db/database');

function listarPorFecha(fecha) {
  return db.prepare('SELECT * FROM horarios WHERE fecha = ? ORDER BY horaInicio').all(fecha);
}

function listarTodos() {
  return db.prepare('SELECT * FROM horarios ORDER BY fecha, horaInicio').all();
}

function buscarPorId(id) {
  return db.prepare('SELECT * FROM horarios WHERE id = ?').get(id);
}

function existeBloque({ canchaId = 1, fecha, horaInicio, horaFin, excluirId = null }) {
  const sql = excluirId
    ? 'SELECT id FROM horarios WHERE canchaId = ? AND fecha = ? AND horaInicio = ? AND horaFin = ? AND id <> ?'
    : 'SELECT id FROM horarios WHERE canchaId = ? AND fecha = ? AND horaInicio = ? AND horaFin = ?';
  const params = excluirId
    ? [canchaId, fecha, horaInicio, horaFin, excluirId]
    : [canchaId, fecha, horaInicio, horaFin];
  return Boolean(db.prepare(sql).get(...params));
}

function crear({ fecha, horaInicio, horaFin, turno, estado = 'DISPONIBLE', canchaId = 1 }) {
  const result = db.prepare(`
    INSERT INTO horarios (fecha, horaInicio, horaFin, turno, estado, canchaId)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(fecha, horaInicio, horaFin, turno, estado, canchaId);
  return buscarPorId(result.lastInsertRowid);
}

function actualizar(id, datos) {
  db.prepare(`
    UPDATE horarios
    SET fecha = ?, horaInicio = ?, horaFin = ?, turno = ?, estado = ?
    WHERE id = ?
  `).run(datos.fecha, datos.horaInicio, datos.horaFin, datos.turno, datos.estado, id);
  return buscarPorId(id);
}

function cambiarEstado(id, estado) {
  db.prepare('UPDATE horarios SET estado = ? WHERE id = ?').run(estado, id);
  return buscarPorId(id);
}

function insertarSiNoExiste({ fecha, horaInicio, horaFin, turno, canchaId = 1 }) {
  db.prepare(`
    INSERT OR IGNORE INTO horarios (fecha, horaInicio, horaFin, turno, canchaId)
    VALUES (?, ?, ?, ?, ?)
  `).run(fecha, horaInicio, horaFin, turno, canchaId);
}

module.exports = {
  listarPorFecha,
  listarTodos,
  buscarPorId,
  existeBloque,
  crear,
  actualizar,
  cambiarEstado,
  insertarSiNoExiste
};
