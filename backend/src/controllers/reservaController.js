const crypto = require('crypto');
const db = require('../db/database');
const reservaDAO = require('../dao/reservaDAO');
const horarioDAO = require('../dao/horarioDAO');
const tarifaDAO = require('../dao/tarifaDAO');
const comprobantePagoDAO = require('../dao/comprobantePagoDAO');
const pagoDAO = require('../dao/pagoDAO');
const archivoService = require('../services/archivoService');
const usuarioDAO = require('../dao/usuarioDAO');
const passwordService = require('../services/passwordService');
const {
  horarioPasado,
  calcularSaldo,
  puedeCancelar
} = require('../services/reglasNegocio');

function codigoReserva() {
  return `RES-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function esPropietarioOAdmin(req, reserva) {
  return req.usuario.rol === 'ADMINISTRADOR' || Number(reserva.usuarioId) === Number(req.usuario.id);
}

function obtenerUsuarioReserva(req) {
  if (req.usuario.rol !== 'ADMINISTRADOR') return req.usuario.id;

  const clienteId = Number(req.body.clienteId || 0);
  if (clienteId) {
    const cliente = usuarioDAO.buscarPorId(clienteId);
    if (!cliente || cliente.rol !== 'CLIENTE') {
      throw new Error('El cliente seleccionado no es válido');
    }
    return cliente.id;
  }

  const correo = String(req.body.clienteCorreo || '').trim().toLowerCase();
  const nombres = String(req.body.clienteNombres || '').trim();
  const telefono = String(req.body.clienteTelefono || '').trim();
  if (!correo || !nombres || !telefono) {
    throw new Error('Para registrar en nombre de un cliente debe indicar nombre, teléfono y correo');
  }

  const existente = usuarioDAO.buscarPorCorreo(correo);
  if (existente) return existente.id;

  const claveTemporal = `Chessy-${crypto.randomBytes(4).toString('hex')}`;
  const nuevo = usuarioDAO.crearCliente({
    nombres,
    telefono,
    correo,
    passwordHash: passwordService.cifrar(claveTemporal)
  });
  return nuevo.id;
}

exports.listar = (req, res) => {
  return res.json(reservaDAO.listar(req.query));
};

exports.misReservas = (req, res) => {
  return res.json({ reservas: reservaDAO.listarPorCliente(req.usuario.id) });
};

exports.crear = (req, res) => {
  const horarioId = Number(req.body.horarioId);
  const deporte = String(req.body.deporte || '').toUpperCase();

  if (!horarioId || !deporte) {
    return res.status(400).json({ mensaje: 'Horario y deporte son obligatorios' });
  }
  if (!['FUTBOL', 'FULBITO', 'VOLEY'].includes(deporte)) {
    return res.status(400).json({ mensaje: 'Deporte no válido' });
  }

  const horario = horarioDAO.buscarPorId(horarioId);
  if (!horario) return res.status(404).json({ mensaje: 'Horario no encontrado' });
  if (horario.estado === 'INHABILITADO') {
    return res.status(409).json({ mensaje: 'El horario se encuentra inhabilitado' });
  }
  if (horarioPasado(horario.fecha, horario.horaFin)) {
    return res.status(409).json({ mensaje: 'No se puede reservar un horario pasado' });
  }
  if (reservaDAO.existeActivaPorHorario(horarioId)) {
    return res.status(409).json({ mensaje: 'El horario ya no está disponible' });
  }

  const tarifa = tarifaDAO.buscarActiva(deporte, horario.turno);
  if (!tarifa) {
    return res.status(404).json({ mensaje: 'No existe una tarifa activa para el deporte y turno seleccionados' });
  }

  try {
    const usuarioId = obtenerUsuarioReserva(req);
    const reserva = reservaDAO.crear({
      codigoReserva: codigoReserva(),
      usuarioId,
      administradorId: req.usuario.rol === 'ADMINISTRADOR' ? req.usuario.id : null,
      horarioId,
      tarifaId: tarifa.id,
      deporte,
      turno: horario.turno,
      montoTotal: Number(tarifa.precio)
    });
    return res.status(201).json({
      mensaje: 'Reserva registrada. Adjunte el comprobante de adelanto para continuar con la validación.',
      reserva
    });
  } catch (error) {
    if (String(error.message).includes('uq_reserva_activa_horario')) {
      return res.status(409).json({ mensaje: 'El horario fue reservado por otra persona' });
    }
    return res.status(400).json({ mensaje: error.message });
  }
};

exports.adjuntarComprobante = (req, res) => {
  const reserva = reservaDAO.buscarPorId(req.params.id);
  if (!reserva) {
    archivoService.eliminarArchivoSiExiste(req.file?.path);
    return res.status(404).json({ mensaje: 'Reserva no encontrada' });
  }
  if (!esPropietarioOAdmin(req, reserva)) {
    archivoService.eliminarArchivoSiExiste(req.file?.path);
    return res.status(403).json({ mensaje: 'No puede adjuntar comprobantes a esta reserva' });
  }
  if (reserva.estado !== 'PENDIENTE_VALIDACION') {
    archivoService.eliminarArchivoSiExiste(req.file?.path);
    return res.status(409).json({ mensaje: 'Solo se adjuntan comprobantes a reservas pendientes de validación' });
  }
  if (!archivoService.validarArchivo(req.file)) {
    archivoService.eliminarArchivoSiExiste(req.file?.path);
    return res.status(400).json({ mensaje: 'Debe seleccionar una imagen o PDF de máximo 5 MB' });
  }

  const montoDeclarado = Number(req.body.montoAdelanto);
  const medioPago = String(req.body.medioPago || '').toUpperCase();
  const numeroOperacion = String(req.body.numeroOperacion || '').trim();

  if (!Number.isFinite(montoDeclarado) || montoDeclarado < 5 || montoDeclarado > Number(reserva.montoTotal)) {
    archivoService.eliminarArchivoSiExiste(req.file?.path);
    return res.status(400).json({ mensaje: 'El adelanto debe ser como mínimo S/ 5.00 y no superar el monto total' });
  }
  if (!['YAPE', 'PLIN', 'TRANSFERENCIA', 'EFECTIVO'].includes(medioPago)) {
    archivoService.eliminarArchivoSiExiste(req.file?.path);
    return res.status(400).json({ mensaje: 'Medio de pago no válido' });
  }

  const datos = {
    reservaId: reserva.id,
    nombreArchivo: req.file.originalname,
    rutaArchivo: `/uploads/${req.file.filename}`,
    numeroOperacion,
    medioPago,
    montoDeclarado
  };

  const anterior = comprobantePagoDAO.buscarPorReserva(reserva.id);
  let comprobante;
  if (anterior) {
    if (!['INVALIDO', 'NO_VERIFICABLE'].includes(anterior.estadoValidacion)) {
      archivoService.eliminarArchivoSiExiste(req.file?.path);
      return res.status(409).json({ mensaje: 'La reserva ya posee un comprobante pendiente o válido' });
    }
    comprobante = comprobantePagoDAO.reemplazar(reserva.id, datos);
  } else {
    comprobante = comprobantePagoDAO.crear(datos);
  }

  return res.status(201).json({ mensaje: 'Comprobante adjuntado correctamente', comprobante });
};

exports.validarComprobante = (req, res) => {
  const reserva = reservaDAO.buscarPorId(req.params.id);
  if (!reserva) return res.status(404).json({ mensaje: 'Reserva no encontrada' });
  if (reserva.estado !== 'PENDIENTE_VALIDACION') {
    return res.status(409).json({ mensaje: 'Solo se validan comprobantes de reservas pendientes' });
  }

  const comprobante = comprobantePagoDAO.buscarPorReserva(reserva.id);
  if (!comprobante) return res.status(409).json({ mensaje: 'La reserva no tiene un comprobante adjunto' });

  const resultado = String(req.body.resultado || '').toUpperCase();
  const permitidos = ['VALIDO', 'INVALIDO', 'NO_VERIFICABLE'];
  if (!permitidos.includes(resultado)) {
    return res.status(400).json({ mensaje: 'Resultado de validación no válido' });
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    const actualizado = comprobantePagoDAO.actualizarValidacion(reserva.id, {
      estadoValidacion: resultado,
      observacion: req.body.observacion || '',
      administradorId: req.usuario.id
    });

    if (resultado === 'VALIDO') {
      if (!pagoDAO.buscarAdelanto(reserva.id)) {
        pagoDAO.crear({
          reservaId: reserva.id,
          tipoPago: 'ADELANTO',
          monto: Number(comprobante.montoDeclarado),
          medioPago: comprobante.medioPago,
          estado: 'VALIDADO',
          observacion: 'Adelanto registrado después de validar el comprobante'
        });
      }
      reservaDAO.actualizarPagos(
        reserva.id,
        Number(comprobante.montoDeclarado),
        Number(reserva.pagoFinal),
        calcularSaldo(reserva.montoTotal, comprobante.montoDeclarado, reserva.pagoFinal)
      );
    }

    db.exec('COMMIT');
    return res.json({ mensaje: `Comprobante registrado como ${resultado}`, comprobante: actualizado });
  } catch (error) {
    db.exec('ROLLBACK');
    return res.status(400).json({ mensaje: error.message });
  }
};

exports.confirmar = (req, res) => {
  const reserva = reservaDAO.buscarPorId(req.params.id);
  if (!reserva) return res.status(404).json({ mensaje: 'Reserva no encontrada' });
  if (reserva.estado !== 'PENDIENTE_VALIDACION') {
    return res.status(409).json({ mensaje: 'Solo se confirman reservas pendientes de validación' });
  }
  const comprobante = comprobantePagoDAO.buscarPorReserva(reserva.id);
  if (!comprobante || comprobante.estadoValidacion !== 'VALIDO') {
    return res.status(409).json({ mensaje: 'El comprobante debe estar validado como válido antes de confirmar' });
  }
  if (reservaDAO.buscarActivaPorHorario(reserva.horarioId)?.id !== reserva.id) {
    return res.status(409).json({ mensaje: 'El horario ya no corresponde a esta reserva' });
  }
  const confirmada = reservaDAO.actualizarEstado(reserva.id, 'CONFIRMADA', {
    administradorId: req.usuario.id
  });
  return res.json({ mensaje: 'Reserva confirmada correctamente', reserva: confirmada });
};

exports.rechazar = (req, res) => {
  const reserva = reservaDAO.buscarPorId(req.params.id);
  if (!reserva) return res.status(404).json({ mensaje: 'Reserva no encontrada' });
  if (reserva.estado !== 'PENDIENTE_VALIDACION') {
    return res.status(409).json({ mensaje: 'Solo se rechazan reservas pendientes de validación' });
  }
  const motivo = String(req.body.motivo || req.body.observacion || '').trim();
  if (!motivo) return res.status(400).json({ mensaje: 'Debe registrar el motivo del rechazo' });

  const comprobante = comprobantePagoDAO.buscarPorReserva(reserva.id);
  if (comprobante && comprobante.estadoValidacion === 'VALIDO') {
    return res.status(409).json({ mensaje: 'No se puede rechazar una reserva con comprobante válido' });
  }

  const rechazada = reservaDAO.actualizarEstado(reserva.id, 'RECHAZADA', {
    administradorId: req.usuario.id,
    motivoRechazo: motivo
  });
  return res.json({ mensaje: 'Reserva rechazada y horario liberado', reserva: rechazada });
};

exports.cancelar = (req, res) => {
  const reserva = reservaDAO.buscarPorId(req.params.id);
  if (!reserva) return res.status(404).json({ mensaje: 'Reserva no encontrada' });
  if (!esPropietarioOAdmin(req, reserva)) {
    return res.status(403).json({ mensaje: 'No puede cancelar una reserva que no le pertenece' });
  }
  if (!puedeCancelar(reserva, reserva.fecha, reserva.horaInicio)) {
    return res.status(409).json({ mensaje: 'La reserva solo puede cancelarse con al menos una hora de anticipación' });
  }

  const motivo = String(req.body.motivo || '').trim() || 'Cancelación solicitada por el cliente';
  const cancelada = reservaDAO.actualizarEstado(reserva.id, 'CANCELADA', {
    motivoCancelacion: motivo,
    administradorId: req.usuario.rol === 'ADMINISTRADOR' ? req.usuario.id : null
  });
  return res.json({
    mensaje: reserva.pagoAdelanto > 0
      ? 'Reserva cancelada. El adelanto validado no es reembolsable.'
      : 'Reserva cancelada correctamente.',
    reserva: cancelada
  });
};
