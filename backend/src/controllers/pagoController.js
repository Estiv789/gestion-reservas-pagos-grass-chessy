const db = require('../db/database');
const pagoDAO = require('../dao/pagoDAO');
const reservaDAO = require('../dao/reservaDAO');
const { montoFinalValido } = require('../services/reglasNegocio');

exports.listar = (req, res) => {
  return res.json(pagoDAO.listar());
};

exports.registrarPagoFinal = (req, res) => {
  const reservaId = Number(req.body.reservaId);
  const monto = Number(req.body.monto);
  const medioPago = String(req.body.medioPago || '').toUpperCase();
  const observacion = String(req.body.observacion || '').trim();

  if (!reservaId || !Number.isFinite(monto)) {
    return res.status(400).json({ mensaje: 'Reserva y monto son obligatorios' });
  }
  if (!['YAPE', 'PLIN', 'TRANSFERENCIA', 'EFECTIVO'].includes(medioPago)) {
    return res.status(400).json({ mensaje: 'Medio de pago no válido' });
  }

  const reserva = reservaDAO.buscarPorId(reservaId);
  if (!reserva) return res.status(404).json({ mensaje: 'Reserva no encontrada' });
  if (reserva.estado !== 'CONFIRMADA') {
    return res.status(409).json({ mensaje: 'El pago final solo se registra sobre reservas confirmadas' });
  }
  if (!montoFinalValido(monto, reserva.saldoPendiente)) {
    return res.status(400).json({
      mensaje: `El pago final debe ser exactamente S/ ${Number(reserva.saldoPendiente).toFixed(2)}`
    });
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    const pago = pagoDAO.crear({
      reservaId,
      tipoPago: 'PAGO_FINAL',
      monto,
      medioPago,
      estado: 'VALIDADO',
      observacion
    });
    reservaDAO.actualizarPagos(reservaId, reserva.pagoAdelanto, monto, 0);
    const completada = reservaDAO.actualizarEstado(reservaId, 'COMPLETADA', {
      administradorId: req.usuario.id
    });
    db.exec('COMMIT');
    return res.status(201).json({
      mensaje: 'Pago final registrado y reserva completada',
      pago,
      reserva: completada
    });
  } catch (error) {
    db.exec('ROLLBACK');
    return res.status(400).json({ mensaje: error.message });
  }
};
