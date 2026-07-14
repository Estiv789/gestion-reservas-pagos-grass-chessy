const db = require('../db/database');

function listar() {
  return db.prepare('SELECT * FROM tarifas ORDER BY deporte, turno, id DESC').all();
}

function listarActivas() {
  return db.prepare('SELECT * FROM tarifas WHERE estado = 1 ORDER BY deporte, turno').all();
}

function buscarPorId(id) {
  return db.prepare('SELECT * FROM tarifas WHERE id = ?').get(id);
}

function buscarActiva(deporte, turno) {
  return db.prepare(`
    SELECT * FROM tarifas
    WHERE deporte = ? AND turno = ? AND estado = 1
    ORDER BY id DESC LIMIT 1
  `).get(deporte, turno);
}

function crear({ deporte, turno, precio, estado = 1 }) {
  const result = db.prepare(`
    INSERT INTO tarifas (deporte, turno, precio, estado)
    VALUES (?, ?, ?, ?)
  `).run(deporte, turno, precio, estado);
  return buscarPorId(result.lastInsertRowid);
}

function inhabilitar(id) {
  db.prepare('UPDATE tarifas SET estado = 0 WHERE id = ?').run(id);
  return buscarPorId(id);
}

function habilitar(id) {
  const tarifa = buscarPorId(id);
  if (!tarifa) return null;
  db.prepare('UPDATE tarifas SET estado = 0 WHERE deporte = ? AND turno = ? AND id <> ?')
    .run(tarifa.deporte, tarifa.turno, id);
  db.prepare('UPDATE tarifas SET estado = 1 WHERE id = ?').run(id);
  return buscarPorId(id);
}

module.exports = { listar, listarActivas, buscarPorId, buscarActiva, crear, inhabilitar, habilitar };
