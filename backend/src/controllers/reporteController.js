const reservaDAO = require('../dao/reservaDAO');
const pagoDAO = require('../dao/pagoDAO');

function fechaISOValida(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha || '');
}

function rango(req, res) {
  const { fechaInicio, fechaFin } = req.query;
  if (!fechaISOValida(fechaInicio) || !fechaISOValida(fechaFin) || fechaFin < fechaInicio) {
    res.status(400).json({ mensaje: 'Debe proporcionar un rango de fechas válido' });
    return null;
  }
  return { fechaInicio, fechaFin };
}

exports.resumen = (req, res) => {
  return res.json({
    ...reservaDAO.contarResumen(),
    ingresos: pagoDAO.totalIngresos()
  });
};

exports.porEstado = (req, res) => {
  return res.json(reservaDAO.agruparPorEstado(req.query.fechaInicio, req.query.fechaFin));
};

exports.ingresos = (req, res) => {
  return res.json(pagoDAO.ingresosPorTipo(req.query.fechaInicio, req.query.fechaFin));
};

exports.ingresosPorDia = (req, res) => {
  const fecha = req.query.fecha;
  if (!fechaISOValida(fecha)) return res.status(400).json({ mensaje: 'Fecha no válida' });
  return res.json(pagoDAO.ingresosPorPeriodo(fecha, fecha));
};

exports.ingresosPorSemana = (req, res) => {
  const fechas = rango(req, res);
  if (!fechas) return undefined;
  return res.json(pagoDAO.ingresosPorPeriodo(fechas.fechaInicio, fechas.fechaFin));
};

exports.ingresosPorMes = (req, res) => {
  const mes = Number(req.query.mes);
  const anio = Number(req.query.anio);
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(anio)) {
    return res.status(400).json({ mensaje: 'Mes o año no válido' });
  }
  const inicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const finDate = new Date(anio, mes, 0);
  const fin = `${anio}-${String(mes).padStart(2, '0')}-${String(finDate.getDate()).padStart(2, '0')}`;
  return res.json(pagoDAO.ingresosPorPeriodo(inicio, fin));
};

exports.horariosMasReservados = (req, res) => {
  const fechas = rango(req, res);
  if (!fechas) return undefined;
  return res.json(reservaDAO.horariosMasReservados(fechas.fechaInicio, fechas.fechaFin));
};

exports.clientesFrecuentes = (req, res) => {
  const fechas = rango(req, res);
  if (!fechas) return undefined;
  return res.json(reservaDAO.clientesFrecuentes(fechas.fechaInicio, fechas.fechaFin));
};

exports.reservasCanceladas = (req, res) => {
  const fechas = rango(req, res);
  if (!fechas) return undefined;
  return res.json(reservaDAO.canceladasPorPeriodo(fechas.fechaInicio, fechas.fechaFin));
};
