const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'flujo-principal.db');
for (const suffix of ['', '-wal', '-shm']) {
  if (fs.existsSync(`${dbPath}${suffix}`)) fs.unlinkSync(`${dbPath}${suffix}`);
}
process.env.DB_PATH = dbPath;
process.env.JWT_SECRET = 'secret_pruebas';

const { run } = require('../src/db/setup');
run();
const app = require('../src/app');
const db = require('../src/db/database');

let server;
let baseUrl;
let tokenCliente;
let tokenAdmin;
let horarioId;
let reservaId;
let montoTotal;

async function request(endpoint, options = {}) {
  const response = await fetch(`${baseUrl}${endpoint}`, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

function auth(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function mananaISO() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
  for (const suffix of ['', '-wal', '-shm']) {
    if (fs.existsSync(`${dbPath}${suffix}`)) fs.unlinkSync(`${dbPath}${suffix}`);
  }
});

test('PA-01: el backend responde correctamente', async () => {
  const { response, data } = await request('/api/health');
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
});

test('PU-01 y PU-03: inicio de sesión válido e inválido', async () => {
  let result = await request('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: 'cliente@demo.com', clave: 'cliente123' })
  });
  assert.equal(result.response.status, 200);
  tokenCliente = result.data.token;

  result = await request('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: 'cliente@demo.com', clave: 'incorrecta' })
  });
  assert.equal(result.response.status, 401);

  result = await request('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: 'admin@grasschessy.com', clave: 'admin123' })
  });
  tokenAdmin = result.data.token;
});

test('PU-05: consultar disponibilidad devuelve horarios base completos', async () => {
  const { response, data } = await request(`/api/horarios?fecha=${mananaISO()}`);
  assert.equal(response.status, 200);
  assert.equal(data.length, 16);
  horarioId = data.find((h) => h.estadoVista === 'DISPONIBLE').id;
});

test('PU-08 y PU-09: registra reserva y evita el cruce de horarios', async () => {
  let result = await request('/api/reservas', {
    method: 'POST', headers: auth(tokenCliente),
    body: JSON.stringify({ horarioId, deporte: 'FUTBOL' })
  });
  assert.equal(result.response.status, 201);
  assert.equal(result.data.reserva.estado, 'PENDIENTE_VALIDACION');
  reservaId = result.data.reserva.id;
  montoTotal = Number(result.data.reserva.montoTotal);

  result = await request('/api/reservas', {
    method: 'POST', headers: auth(tokenCliente),
    body: JSON.stringify({ horarioId, deporte: 'FUTBOL' })
  });
  assert.equal(result.response.status, 409);
});

test('PU-10: adjunta comprobante a una reserva pendiente', async () => {
  const fd = new FormData();
  fd.append('comprobante', new Blob(['comprobante de prueba'], { type: 'image/png' }), 'prueba.png');
  fd.append('montoAdelanto', '5');
  fd.append('medioPago', 'YAPE');
  fd.append('numeroOperacion', 'OP-TEST-001');

  const { response, data } = await request(`/api/reservas/${reservaId}/comprobante`, {
    method: 'POST', headers: { Authorization: `Bearer ${tokenCliente}` }, body: fd
  });
  assert.equal(response.status, 201);
  assert.equal(data.comprobante.estadoValidacion, 'PENDIENTE');
});

test('PU-12 y PU-13: valida el comprobante y confirma la reserva', async () => {
  let result = await request(`/api/reservas/${reservaId}/validar-comprobante`, {
    method: 'PATCH', headers: auth(tokenAdmin),
    body: JSON.stringify({ resultado: 'VALIDO', observacion: 'Operación verificada' })
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.data.comprobante.estadoValidacion, 'VALIDO');

  result = await request(`/api/reservas/${reservaId}/confirmar`, {
    method: 'PATCH', headers: auth(tokenAdmin), body: '{}'
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.data.reserva.estado, 'CONFIRMADA');
});

test('PU-16 y PU-17: valida el monto y registra el pago final', async () => {
  const saldo = montoTotal - 5;
  let result = await request('/api/pagos/final', {
    method: 'POST', headers: auth(tokenAdmin),
    body: JSON.stringify({ reservaId, monto: saldo - 1, medioPago: 'EFECTIVO' })
  });
  assert.equal(result.response.status, 400);

  result = await request('/api/pagos/final', {
    method: 'POST', headers: auth(tokenAdmin),
    body: JSON.stringify({ reservaId, monto: saldo, medioPago: 'EFECTIVO', observacion: 'Pago completo' })
  });
  assert.equal(result.response.status, 201);
  assert.equal(result.data.reserva.estado, 'COMPLETADA');
});
