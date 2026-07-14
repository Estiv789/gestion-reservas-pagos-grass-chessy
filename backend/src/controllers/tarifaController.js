const db = require('../db/database');
const tarifaDAO = require('../dao/tarifaDAO');

function datosValidos({ deporte, turno, precio }) {
  return ['FUTBOL', 'FULBITO', 'VOLEY'].includes(deporte)
    && ['DIA', 'NOCHE'].includes(turno)
    && Number.isFinite(Number(precio))
    && Number(precio) > 0;
}

exports.listar = (req, res) => {
  const soloActivas = req.query.activas === '1';
  return res.json(soloActivas ? tarifaDAO.listarActivas() : tarifaDAO.listar());
};

exports.crear = (req, res) => {
  const datos = {
    deporte: String(req.body.deporte || '').toUpperCase(),
    turno: String(req.body.turno || '').toUpperCase(),
    precio: Number(req.body.precio)
  };
  if (!datosValidos(datos)) {
    return res.status(400).json({ mensaje: 'Datos de tarifa no válidos' });
  }
  if (tarifaDAO.buscarActiva(datos.deporte, datos.turno)) {
    return res.status(409).json({ mensaje: 'Ya existe una tarifa activa para ese deporte y turno' });
  }
  return res.status(201).json(tarifaDAO.crear(datos));
};

exports.actualizar = (req, res) => {
  const anterior = tarifaDAO.buscarPorId(req.params.id);
  if (!anterior) return res.status(404).json({ mensaje: 'Tarifa no encontrada' });

  const datos = {
    deporte: String(req.body.deporte || anterior.deporte).toUpperCase(),
    turno: String(req.body.turno || anterior.turno).toUpperCase(),
    precio: Number(req.body.precio ?? anterior.precio)
  };
  if (!datosValidos(datos)) {
    return res.status(400).json({ mensaje: 'Datos de tarifa no válidos' });
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    tarifaDAO.inhabilitar(anterior.id);
    const nueva = tarifaDAO.crear(datos);
    db.exec('COMMIT');
    return res.json({ mensaje: 'Tarifa actualizada conservando el historial', tarifa: nueva });
  } catch (error) {
    db.exec('ROLLBACK');
    return res.status(409).json({ mensaje: 'No se pudo actualizar la tarifa', detalle: error.message });
  }
};

exports.habilitar = (req, res) => {
  const tarifa = tarifaDAO.habilitar(req.params.id);
  if (!tarifa) return res.status(404).json({ mensaje: 'Tarifa no encontrada' });
  return res.json({ mensaje: 'Tarifa habilitada', tarifa });
};

exports.inhabilitar = (req, res) => {
  const tarifa = tarifaDAO.buscarPorId(req.params.id);
  if (!tarifa) return res.status(404).json({ mensaje: 'Tarifa no encontrada' });
  return res.json({ mensaje: 'Tarifa inhabilitada', tarifa: tarifaDAO.inhabilitar(req.params.id) });
};

exports.eliminar = exports.inhabilitar;
