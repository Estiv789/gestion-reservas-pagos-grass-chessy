const horarioDAO = require('../dao/horarioDAO');
const reservaDAO = require('../dao/reservaDAO');
const { generarHorariosBase } = require('../db/setup');
const { horarioPasado, rangoHorarioValido } = require('../services/reglasNegocio');

function asegurarHorariosBase(fecha) {
  if (!fecha) return;
  generarHorariosBase().forEach((horario) => {
    horarioDAO.insertarSiNoExiste({ fecha, ...horario, canchaId: 1 });
  });
}

function estadoVisible(horario) {
  if (horario.estado === 'INHABILITADO') return 'INHABILITADO';
  if (horarioPasado(horario.fecha, horario.horaFin)) return 'PASADO';
  const activa = reservaDAO.buscarActivaPorHorario(horario.id);
  if (!activa) return 'DISPONIBLE';
  return activa.estado === 'PENDIENTE_VALIDACION'
    ? 'PENDIENTE_VALIDACION'
    : 'RESERVADO';
}

exports.listar = (req, res) => {
  const { fecha } = req.query;
  if (fecha) asegurarHorariosBase(fecha);
  const horarios = fecha ? horarioDAO.listarPorFecha(fecha) : horarioDAO.listarTodos();
  return res.json(horarios.map((horario) => ({
    ...horario,
    estadoVista: estadoVisible(horario)
  })));
};

exports.crear = (req, res) => {
  const { fecha, horaInicio, horaFin, turno } = req.body;
  if (!fecha || !horaInicio || !horaFin || !turno) {
    return res.status(400).json({ mensaje: 'Datos de horario incompletos' });
  }
  if (!['DIA', 'NOCHE'].includes(turno)) {
    return res.status(400).json({ mensaje: 'Turno no válido' });
  }
  if (!rangoHorarioValido(horaInicio, horaFin)) {
    return res.status(400).json({ mensaje: 'La hora final debe ser posterior a la hora inicial' });
  }
  if (horarioDAO.existeBloque({ fecha, horaInicio, horaFin })) {
    return res.status(409).json({ mensaje: 'El bloque horario ya existe' });
  }
  return res.status(201).json(horarioDAO.crear({ fecha, horaInicio, horaFin, turno }));
};

exports.actualizar = (req, res) => {
  const actual = horarioDAO.buscarPorId(req.params.id);
  if (!actual) return res.status(404).json({ mensaje: 'Horario no encontrado' });

  const datos = {
    fecha: req.body.fecha || actual.fecha,
    horaInicio: req.body.horaInicio || actual.horaInicio,
    horaFin: req.body.horaFin || actual.horaFin,
    turno: req.body.turno || actual.turno,
    estado: req.body.estado || actual.estado
  };

  if (!rangoHorarioValido(datos.horaInicio, datos.horaFin)) {
    return res.status(400).json({ mensaje: 'La hora final debe ser posterior a la hora inicial' });
  }
  if (!['DIA', 'NOCHE'].includes(datos.turno)) {
    return res.status(400).json({ mensaje: 'Turno no válido' });
  }
  if (!['DISPONIBLE', 'INHABILITADO'].includes(datos.estado)) {
    return res.status(400).json({ mensaje: 'Estado de horario no válido' });
  }
  if (horarioDAO.existeBloque({
    fecha: datos.fecha,
    horaInicio: datos.horaInicio,
    horaFin: datos.horaFin,
    excluirId: Number(req.params.id)
  })) {
    return res.status(409).json({ mensaje: 'Ya existe otro horario con el mismo bloque' });
  }

  return res.json(horarioDAO.actualizar(req.params.id, datos));
};

exports.habilitar = (req, res) => {
  const horario = horarioDAO.buscarPorId(req.params.id);
  if (!horario) return res.status(404).json({ mensaje: 'Horario no encontrado' });
  return res.json(horarioDAO.cambiarEstado(req.params.id, 'DISPONIBLE'));
};

exports.inhabilitar = (req, res) => {
  const horario = horarioDAO.buscarPorId(req.params.id);
  if (!horario) return res.status(404).json({ mensaje: 'Horario no encontrado' });
  if (reservaDAO.existeActivaPorHorario(req.params.id)) {
    return res.status(409).json({ mensaje: 'No se puede inhabilitar un horario con una reserva activa' });
  }
  return res.json(horarioDAO.cambiarEstado(req.params.id, 'INHABILITADO'));
};

exports.eliminar = exports.inhabilitar;
