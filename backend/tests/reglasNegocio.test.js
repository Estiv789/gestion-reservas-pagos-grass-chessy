const test = require('node:test');
const assert = require('node:assert/strict');
const {
  rangoHorarioValido,
  calcularSaldo,
  montoFinalValido,
  puedeCancelar
} = require('../src/services/reglasNegocio');

test('rangoHorarioValido acepta una hora final posterior', () => {
  assert.equal(rangoHorarioValido('07:00', '08:00'), true);
  assert.equal(rangoHorarioValido('09:00', '08:00'), false);
});

test('calcularSaldo descuenta adelanto y pago final', () => {
  assert.equal(calcularSaldo(30, 5, 0), 25);
  assert.equal(calcularSaldo(30, 5, 25), 0);
});

test('montoFinalValido exige que el pago cubra exactamente el saldo', () => {
  assert.equal(montoFinalValido(25, 25), true);
  assert.equal(montoFinalValido(20, 25), false);
  assert.equal(montoFinalValido(-5, 25), false);
});

test('puedeCancelar exige una reserva activa y una hora de anticipación', () => {
  const ahora = new Date('2026-07-14T10:00:00');
  assert.equal(puedeCancelar({ estado: 'CONFIRMADA' }, '2026-07-14', '12:00', ahora), true);
  assert.equal(puedeCancelar({ estado: 'CONFIRMADA' }, '2026-07-14', '10:30', ahora), false);
  assert.equal(puedeCancelar({ estado: 'COMPLETADA' }, '2026-07-14', '12:00', ahora), false);
});
