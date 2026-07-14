const db = require('../db/database');

function buscarPorCorreo(correo) {
  return db.prepare('SELECT * FROM usuarios WHERE correo = ?').get(correo);
}

function buscarActivoPorCorreo(correo) {
  return db.prepare('SELECT * FROM usuarios WHERE correo = ? AND estado = 1').get(correo);
}

function buscarPorId(id) {
  return db.prepare('SELECT id, nombres, telefono, correo, rol, estado, creadoEn FROM usuarios WHERE id = ?').get(id);
}

function crearCliente({ nombres, telefono = '', correo, passwordHash }) {
  const result = db.prepare(`
    INSERT INTO usuarios (nombres, telefono, correo, passwordHash, rol)
    VALUES (?, ?, ?, ?, 'CLIENTE')
  `).run(nombres, telefono, correo, passwordHash);
  return buscarPorId(result.lastInsertRowid);
}

module.exports = { buscarPorCorreo, buscarActivoPorCorreo, buscarPorId, crearCliente };
