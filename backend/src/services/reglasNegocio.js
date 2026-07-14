const ESTADOS_ACTIVOS = ['PENDIENTE_VALIDACION', 'CONFIRMADA'];

function fechaHora(fecha, hora) {
  return new Date(`${fecha}T${hora}:00`);
}

function horarioPasado(fecha, horaFin, ahora = new Date()) {
  return fechaHora(fecha, horaFin).getTime() <= ahora.getTime();
}

function rangoHorarioValido(horaInicio, horaFin) {
  return /^\d{2}:\d{2}$/.test(horaInicio || '')
    && /^\d{2}:\d{2}$/.test(horaFin || '')
    && horaFin > horaInicio;
}

function calcularSaldo(montoTotal, pagoAdelanto = 0, pagoFinal = 0) {
  const saldo = Number(montoTotal) - Number(pagoAdelanto) - Number(pagoFinal);
  return Math.max(0, Number(saldo.toFixed(2)));
}

function montoFinalValido(monto, saldoPendiente) {
  const pago = Number(monto);
  const saldo = Number(saldoPendiente);
  return Number.isFinite(pago) && pago > 0 && Math.abs(pago - saldo) < 0.001;
}

function puedeCancelar(reserva, fecha, horaInicio, ahora = new Date()) {
  if (!reserva || !ESTADOS_ACTIVOS.includes(reserva.estado)) return false;
  const inicio = fechaHora(fecha, horaInicio);
  return inicio.getTime() - ahora.getTime() >= 60 * 60 * 1000;
}

module.exports = {
  ESTADOS_ACTIVOS,
  horarioPasado,
  rangoHorarioValido,
  calcularSaldo,
  montoFinalValido,
  puedeCancelar
};
