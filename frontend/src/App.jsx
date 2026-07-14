import React, { Fragment, useEffect, useMemo, useState } from 'react';

const BACKEND =
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const API = `${BACKEND}/api`;

function token() {
  return localStorage.getItem('token') || '';
}

async function api(path, options = {}) {
  const headers = options.body instanceof FormData
    ? {}
    : { 'Content-Type': 'application/json' };
  if (token()) headers.Authorization = `Bearer ${token()}`;

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.mensaje || 'Error en la operación');
  return data;
}

function fechaLocal(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function lunesDe(date) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day));
  result.setHours(0, 0, 0, 0);
  return result;
}

function Estado({ estado }) {
  const value = estado || 'SIN_DATOS';
  return <span className={`estado ${value.toLowerCase()}`}>{value.replaceAll('_', ' ')}</span>;
}

function Mensaje({ texto, error = false }) {
  if (!texto) return null;
  return <div className={`alert ${error ? 'error' : ''}`}>{texto}</div>;
}

function Navbar({ usuario, setPage, logout }) {
  return (
    <nav className="navbar">
      <div className="brand" onClick={() => setPage('home')}>⚽ Grass Chessy</div>
      <button onClick={() => setPage('home')}>Inicio</button>
      <button onClick={() => setPage('disponibilidad')}>Disponibilidad</button>
      {!usuario && <button onClick={() => setPage('login')}>Iniciar sesión</button>}
      {usuario?.rol === 'CLIENTE' && <button onClick={() => setPage('cliente')}>Panel cliente</button>}
      {usuario?.rol === 'ADMINISTRADOR' && <button onClick={() => setPage('admin')}>Administrador</button>}
      {usuario && <button className="secondary" onClick={logout}>Salir</button>}
    </nav>
  );
}

function Home({ setPage, usuario }) {
  return (
    <section className="hero">
      <div>
        <p className="badge">Aplicación web académica basada en ICONIX</p>
        <h1>Gestión de Reservas y Pagos del Grass Chessy</h1>
        <p>
          Consulta horarios, registra reservas, adjunta comprobantes y permite al
          Administrador validar pagos, gestionar tarifas y consultar reportes.
        </p>
        <div className="ubicacion-card">
          <h3>📍 Ubicación del Grass Chessy</h3>
          <p>Jr. Cañete 665, San Juan Bautista, Huamanga - Ayacucho</p>
          <a
            className="btn-maps"
            href="https://www.google.com/maps/place/Grass+Chessy/@-13.1774606,-74.1993896,17z"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver ubicación en Google Maps
          </a>
          <iframe
            className="mapa-grass"
            title="Ubicación del Grass Chessy"
            src="https://www.google.com/maps?q=-13.1774606,-74.1968147&z=16&output=embed"
            loading="lazy"
            allowFullScreen
          />
          <img className="foto-cancha" src="/img/grass-chessy.png" alt="Cancha Grass Chessy" />
        </div>
        <div className="actions">
          <button onClick={() => setPage('disponibilidad')}>Consultar disponibilidad</button>
          {!usuario && <button className="secondary" onClick={() => setPage('login')}>Iniciar sesión</button>}
        </div>
      </div>
      <div className="card checklist">
        <h3>Flujo principal</h3>
        <p>1. Iniciar sesión</p>
        <p>2. Consultar disponibilidad</p>
        <p>3. Registrar reserva</p>
        <p>4. Adjuntar comprobante</p>
        <p>5. Validar y confirmar</p>
        <p>6. Registrar pago final</p>
      </div>
    </section>
  );
}

function Login({ setUsuario, setPage }) {
  const [modo, setModo] = useState('login');
  const [form, setForm] = useState({
    nombres: '', telefono: '', correo: 'admin@grasschessy.com', clave: 'admin123'
  });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);

  async function submit(e) {
    e.preventDefault();
    try {
      const endpoint = modo === 'login' ? '/auth/login' : '/auth/register';
      const data = await api(endpoint, { method: 'POST', body: JSON.stringify(form) });
      localStorage.setItem('token', data.token);
      setUsuario(data.usuario);
      setPage(data.usuario.rol === 'ADMINISTRADOR' ? 'admin' : 'cliente');
    } catch (e) {
      setError(true);
      setMsg(e.message);
    }
  }

  return (
    <div className="grid2">
      <form className="card" onSubmit={submit}>
        <h2>{modo === 'login' ? 'Iniciar sesión' : 'Registrar cliente'}</h2>
        <Mensaje texto={msg} error={error} />
        {modo === 'registro' && (
          <>
            <label>Nombres</label>
            <input value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} />
            <label>Teléfono</label>
            <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </>
        )}
        <label>Correo</label>
        <input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
        <label>Clave</label>
        <input type="password" value={form.clave} onChange={(e) => setForm({ ...form, clave: e.target.value })} />
        <button>{modo === 'login' ? 'Ingresar' : 'Crear cuenta'}</button>
      </form>
      <div className="card">
        <h3>Acceso de demostración</h3>
        <p><b>Administrador:</b> admin@grasschessy.com / admin123</p>
        <p><b>Cliente:</b> cliente@demo.com / cliente123</p>
        <div className="actions">
          <button className="secondary" onClick={() => {
            setModo('login');
            setForm({ ...form, correo: 'cliente@demo.com', clave: 'cliente123' });
          }}>Usar cliente demo</button>
          <button onClick={() => {
            setModo(modo === 'login' ? 'registro' : 'login');
            setMsg('');
          }}>{modo === 'login' ? 'Crear cuenta' : 'Volver al login'}</button>
        </div>
      </div>
    </div>
  );
}

function Disponibilidad({ setSelected, setPage }) {
  const [inicioSemana, setInicioSemana] = useState(lunesDe(new Date()));
  const [datosSemana, setDatosSemana] = useState({});
  const [seleccionado, setSeleccionado] = useState(null);
  const [msg, setMsg] = useState('');

  const dias = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const dia = new Date(inicioSemana);
    dia.setDate(inicioSemana.getDate() + index);
    return {
      fecha: fechaLocal(dia),
      nombre: dia.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: '2-digit' })
    };
  }), [inicioSemana]);

  const horasBase = useMemo(() => Array.from({ length: 16 }, (_, index) => {
    const hora = 7 + index;
    return `${String(hora).padStart(2, '0')}:00 - ${String(hora + 1).padStart(2, '0')}:00`;
  }), []);

  async function cargarSemana() {
    try {
      const respuestas = await Promise.all(dias.map((dia) => api(`/horarios?fecha=${dia.fecha}`)));
      const resultado = {};
      dias.forEach((dia, index) => { resultado[dia.fecha] = respuestas[index]; });
      setDatosSemana(resultado);
      setSeleccionado(null);
      setMsg('');
    } catch (e) {
      setMsg(e.message);
    }
  }

  useEffect(() => { cargarSemana(); }, [inicioSemana]);

  function buscar(fecha, bloque) {
    return (datosSemana[fecha] || []).find((h) => `${h.horaInicio} - ${h.horaFin}` === bloque);
  }

  function seleccionar(fecha, horario) {
    if (!horario || horario.estadoVista !== 'DISPONIBLE') return;
    setSeleccionado({ ...horario, fecha });
  }

  function cambiarSemana(semanas) {
    const nueva = new Date(inicioSemana);
    nueva.setDate(nueva.getDate() + semanas * 7);
    setInicioSemana(nueva);
  }

  return (
    <div className="horario-page">
      <div className="horario-titulo"><p>Gestión semanal de reservas</p><h2>HORARIO</h2></div>
      <div className="horario-controles">
        <button onClick={() => cambiarSemana(-1)}>← Semana anterior</button>
        <button onClick={() => setInicioSemana(lunesDe(new Date()))}>Semana actual</button>
        <button onClick={() => cambiarSemana(1)}>Semana siguiente →</button>
      </div>
      <Mensaje texto={msg} error />
      <div className="tabla-horario-wrapper">
        <div className="tabla-horario">
          <div className="celda encabezado hora-columna">HORA</div>
          {dias.map((dia) => <div key={dia.fecha} className="celda encabezado"><strong>{dia.nombre}</strong><small>{dia.fecha}</small></div>)}
          {horasBase.map((bloque) => (
            <Fragment key={bloque}>
              <div className="celda hora-columna hora-fila">{bloque}</div>
              {dias.map((dia) => {
                const horario = buscar(dia.fecha, bloque);
                const estado = horario?.estadoVista || 'SIN_HORARIO';
                const clase = estado.toLowerCase().replaceAll('_', '-');
                const activo = seleccionado?.id === horario?.id;
                return (
                  <div
                    key={`${dia.fecha}-${bloque}`}
                    className={`celda horario-box ${clase} ${activo ? 'seleccionado' : ''}`}
                    onClick={() => seleccionar(dia.fecha, horario)}
                  >
                    <span>{estado.replaceAll('_', ' ')}</span>
                    {horario && <small>{horario.turno}</small>}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
      {seleccionado && (
        <div className="resumen-horario">
          <h3>Horario seleccionado</h3>
          <p>{seleccionado.fecha} | {seleccionado.horaInicio} - {seleccionado.horaFin} | {seleccionado.turno}</p>
          <button onClick={() => { setSelected(seleccionado); setPage('reservar'); }}>Registrar reserva</button>
        </div>
      )}
    </div>
  );
}

function RegistrarReserva({ selected, usuario, setPage }) {
  const [tarifas, setTarifas] = useState([]);
  const [deporte, setDeporte] = useState('FUTBOL');
  const [cliente, setCliente] = useState({ clienteNombres: '', clienteTelefono: '', clienteCorreo: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => { api('/tarifas?activas=1').then(setTarifas).catch((e) => setMsg(e.message)); }, []);
  const tarifa = tarifas.find((t) => t.deporte === deporte && t.turno === selected?.turno);

  async function submit(e) {
    e.preventDefault();
    if (!usuario) {
      setError(true);
      setMsg('Debe iniciar sesión antes de registrar una reserva.');
      return;
    }
    if (!selected) {
      setError(true);
      setMsg('Seleccione un horario disponible.');
      return;
    }
    try {
      const body = { horarioId: selected.id, deporte };
      if (usuario.rol === 'ADMINISTRADOR') Object.assign(body, cliente);
      const data = await api('/reservas', { method: 'POST', body: JSON.stringify(body) });
      setError(false);
      setMsg(data.mensaje);
      setTimeout(() => setPage(usuario.rol === 'ADMINISTRADOR' ? 'admin' : 'cliente'), 900);
    } catch (e) {
      setError(true);
      setMsg(e.message);
    }
  }

  if (!usuario) {
    return <div className="card"><h2>Registrar reserva</h2><Mensaje texto="Debe iniciar sesión para continuar." error /><button onClick={() => setPage('login')}>Ir a iniciar sesión</button></div>;
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Registrar reserva</h2>
      <Mensaje texto={msg} error={error} />
      {selected && <div className="alert">{selected.fecha} | {selected.horaInicio} - {selected.horaFin} | {selected.turno}</div>}
      {usuario.rol === 'ADMINISTRADOR' && (
        <div className="grid2">
          <div><label>Nombre del cliente</label><input value={cliente.clienteNombres} onChange={(e) => setCliente({ ...cliente, clienteNombres: e.target.value })} /></div>
          <div><label>Teléfono</label><input value={cliente.clienteTelefono} onChange={(e) => setCliente({ ...cliente, clienteTelefono: e.target.value })} /></div>
          <div><label>Correo</label><input type="email" value={cliente.clienteCorreo} onChange={(e) => setCliente({ ...cliente, clienteCorreo: e.target.value })} /></div>
        </div>
      )}
      <label>Deporte o tipo de uso</label>
      <select value={deporte} onChange={(e) => setDeporte(e.target.value)}>
        <option>FUTBOL</option><option>FULBITO</option><option>VOLEY</option>
      </select>
      <h3>Tarifa: S/ {tarifa?.precio ?? '---'}</h3>
      <p>La reserva quedará pendiente de validación hasta adjuntar y validar el comprobante.</p>
      <button>Registrar reserva</button>
    </form>
  );
}

function FormComprobante({ reserva, onDone }) {
  const [archivo, setArchivo] = useState(null);
  const [form, setForm] = useState({ montoAdelanto: 5, medioPago: 'YAPE', numeroOperacion: '' });
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!archivo) return setMsg('Seleccione un archivo.');
    const fd = new FormData();
    fd.append('comprobante', archivo);
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    try {
      const data = await api(`/reservas/${reserva.id}/comprobante`, { method: 'POST', body: fd });
      setMsg(data.mensaje);
      onDone();
    } catch (e) { setMsg(e.message); }
  }

  return (
    <form className="subform" onSubmit={submit}>
      <h4>Adjuntar comprobante</h4>
      <input type="file" onChange={(e) => setArchivo(e.target.files[0])} />
      <input type="number" min="5" max={reserva.montoTotal} value={form.montoAdelanto} onChange={(e) => setForm({ ...form, montoAdelanto: e.target.value })} placeholder="Adelanto" />
      <select value={form.medioPago} onChange={(e) => setForm({ ...form, medioPago: e.target.value })}>
        <option>YAPE</option><option>PLIN</option><option>TRANSFERENCIA</option><option>EFECTIVO</option>
      </select>
      <input value={form.numeroOperacion} onChange={(e) => setForm({ ...form, numeroOperacion: e.target.value })} placeholder="Número de operación" />
      <button>Enviar comprobante</button>
      <small>{msg}</small>
    </form>
  );
}

function TablaReservas({ reservas, acciones }) {
  return (
    <div className="tablewrap">
      <table>
        <thead><tr><th>Código</th><th>Cliente</th><th>Fecha</th><th>Horario</th><th>Deporte</th><th>Total</th><th>Saldo</th><th>Estado</th><th>Comprobante</th>{acciones && <th>Acciones</th>}</tr></thead>
        <tbody>{reservas.map((r) => (
          <tr key={r.id}>
            <td>{r.codigoReserva}</td><td>{r.cliente || '-'}</td><td>{r.fecha}</td><td>{r.horaInicio}-{r.horaFin}</td>
            <td>{r.deporte}</td><td>S/ {r.montoTotal}</td><td>S/ {r.saldoPendiente}</td><td><Estado estado={r.estado} /></td>
            <td><Estado estado={r.estadoComprobante || 'SIN_COMPROBANTE'} /></td>
            {acciones && <td>{acciones(r)}</td>}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function PanelCliente() {
  const [reservas, setReservas] = useState([]);
  const [msg, setMsg] = useState('');
  async function load() {
    try { setReservas((await api('/reservas/mis-reservas')).reservas); }
    catch (e) { setMsg(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function cancelar(id) {
    const motivo = window.prompt('Motivo de cancelación:', 'Cancelación solicitada por el cliente');
    if (motivo === null) return;
    try { setMsg((await api(`/reservas/${id}/cancelar`, { method: 'PATCH', body: JSON.stringify({ motivo }) })).mensaje); load(); }
    catch (e) { setMsg(e.message); }
  }

  return (
    <div>
      <h2>Panel del Cliente</h2>
      <Mensaje texto={msg} />
      <div className="card"><h3>Historial de reservas</h3><TablaReservas reservas={reservas} /></div>
      {reservas.filter((r) => r.estado === 'PENDIENTE_VALIDACION' && (!r.estadoComprobante || ['INVALIDO', 'NO_VERIFICABLE'].includes(r.estadoComprobante))).map((r) => (
        <div className="card" key={r.id}><h3>{r.codigoReserva}</h3><FormComprobante reserva={r} onDone={load} /></div>
      ))}
      <div className="card">
        <h3>Cancelar reserva</h3>
        {reservas.filter((r) => ['PENDIENTE_VALIDACION', 'CONFIRMADA'].includes(r.estado)).map((r) => (
          <button className="danger" key={r.id} onClick={() => cancelar(r.id)}>Cancelar {r.codigoReserva}</button>
        ))}
      </div>
    </div>
  );
}

function AdminDashboard({ setPage }) {
  const [reservas, setReservas] = useState([]);
  const [resumen, setResumen] = useState({});
  const [obs, setObs] = useState({});
  const [pagos, setPagos] = useState({});
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const [r, s] = await Promise.all([api('/reservas'), api('/reportes/resumen')]);
      setReservas(r); setResumen(s);
    } catch (e) { setMsg(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function validar(id, resultado) {
    try {
      const data = await api(`/reservas/${id}/validar-comprobante`, {
        method: 'PATCH', body: JSON.stringify({ resultado, observacion: obs[id] || '' })
      });
      setMsg(data.mensaje); load();
    } catch (e) { setMsg(e.message); }
  }

  async function cambiarReserva(id, operacion) {
    try {
      const body = operacion === 'rechazar'
        ? { motivo: obs[id] || 'Comprobante inválido o no verificable' }
        : {};
      setMsg((await api(`/reservas/${id}/${operacion}`, { method: 'PATCH', body: JSON.stringify(body) })).mensaje);
      load();
    } catch (e) { setMsg(e.message); }
  }

  async function pagoFinal(id) {
    const datos = pagos[id] || {};
    try {
      setMsg((await api('/pagos/final', {
        method: 'POST', body: JSON.stringify({
          reservaId: id,
          monto: datos.monto,
          medioPago: datos.medioPago || 'EFECTIVO',
          observacion: datos.observacion || ''
        })
      })).mensaje);
      load();
    } catch (e) { setMsg(e.message); }
  }

  return (
    <div>
      <h2>Panel del Administrador</h2>
      <Mensaje texto={msg} />
      <div className="stats">
        <div className="card"><b>Reservas</b><span>{resumen.totalReservas || 0}</span></div>
        <div className="card"><b>Pendientes</b><span>{resumen.pendientes || 0}</span></div>
        <div className="card"><b>Confirmadas</b><span>{resumen.confirmadas || 0}</span></div>
        <div className="card"><b>Ingresos</b><span>S/ {resumen.ingresos || 0}</span></div>
      </div>
      <div className="actions"><button onClick={() => setPage('disponibilidad')}>Registrar reserva</button><button onClick={() => setPage('gestion')}>Gestionar horarios y tarifas</button><button onClick={() => setPage('reportes')}>Consultar reportes</button></div>
      <div className="card">
        <h3>Validación de comprobantes</h3>
        {reservas.filter((r) => r.estado === 'PENDIENTE_VALIDACION').map((r) => (
          <div className="admin-item" key={r.id}>
            <div><b>{r.codigoReserva} — {r.cliente}</b><p>{r.fecha} {r.horaInicio}-{r.horaFin} / {r.deporte}</p><Estado estado={r.estadoComprobante || 'SIN_COMPROBANTE'} /></div>
            {r.rutaArchivo && <a target="_blank" rel="noreferrer" href={`${BACKEND}${r.rutaArchivo}`}>Ver comprobante</a>}
            <input placeholder="Observación o motivo" value={obs[r.id] || ''} onChange={(e) => setObs({ ...obs, [r.id]: e.target.value })} />
            <div className="actions">
              {r.estadoComprobante === 'PENDIENTE' && <><button onClick={() => validar(r.id, 'VALIDO')}>Marcar válido</button><button className="danger" onClick={() => validar(r.id, 'INVALIDO')}>Inválido</button><button className="secondary" onClick={() => validar(r.id, 'NO_VERIFICABLE')}>No verificable</button></>}
              {r.estadoComprobante === 'VALIDO' && <button onClick={() => cambiarReserva(r.id, 'confirmar')}>Confirmar reserva</button>}
              {['INVALIDO', 'NO_VERIFICABLE'].includes(r.estadoComprobante) && <button className="danger" onClick={() => cambiarReserva(r.id, 'rechazar')}>Rechazar reserva</button>}
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Registrar pago final</h3>
        {reservas.filter((r) => r.estado === 'CONFIRMADA').map((r) => (
          <div className="admin-item" key={r.id}>
            <div><b>{r.codigoReserva} — {r.cliente}</b><p>Saldo pendiente: S/ {r.saldoPendiente}</p></div>
            <input type="number" value={pagos[r.id]?.monto ?? r.saldoPendiente} onChange={(e) => setPagos({ ...pagos, [r.id]: { ...pagos[r.id], monto: e.target.value } })} />
            <select value={pagos[r.id]?.medioPago || 'EFECTIVO'} onChange={(e) => setPagos({ ...pagos, [r.id]: { ...pagos[r.id], medioPago: e.target.value } })}><option>EFECTIVO</option><option>YAPE</option><option>PLIN</option><option>TRANSFERENCIA</option></select>
            <button onClick={() => pagoFinal(r.id)}>Registrar pago final</button>
          </div>
        ))}
      </div>
      <div className="card"><h3>Todas las reservas</h3><TablaReservas reservas={reservas} /></div>
    </div>
  );
}

function GestionHorariosTarifas() {
  const [fecha, setFecha] = useState(fechaLocal());
  const [horarios, setHorarios] = useState([]);
  const [tarifas, setTarifas] = useState([]);
  const [nuevoHorario, setNuevoHorario] = useState({ horaInicio: '07:00', horaFin: '08:00', turno: 'DIA' });
  const [nuevaTarifa, setNuevaTarifa] = useState({ deporte: 'FUTBOL', turno: 'DIA', precio: 20 });
  const [precios, setPrecios] = useState({});
  const [msg, setMsg] = useState('');

  async function load() {
    const [h, t] = await Promise.all([api(`/horarios?fecha=${fecha}`), api('/tarifas')]);
    setHorarios(h); setTarifas(t);
  }
  useEffect(() => { load().catch((e) => setMsg(e.message)); }, [fecha]);

  async function crearHorario(e) {
    e.preventDefault();
    try { await api('/horarios', { method: 'POST', body: JSON.stringify({ fecha, ...nuevoHorario }) }); setMsg('Horario creado'); load(); }
    catch (e) { setMsg(e.message); }
  }
  async function estadoHorario(id, estado) {
    try { await api(`/horarios/${id}/${estado}`, { method: 'PATCH' }); load(); }
    catch (e) { setMsg(e.message); }
  }
  async function editarHorario(horario) {
    const horaInicio = window.prompt('Nueva hora de inicio (HH:MM):', horario.horaInicio);
    if (horaInicio === null) return;
    const horaFin = window.prompt('Nueva hora de fin (HH:MM):', horario.horaFin);
    if (horaFin === null) return;
    try {
      await api(`/horarios/${horario.id}`, {
        method: 'PUT',
        body: JSON.stringify({ fecha: horario.fecha, horaInicio, horaFin, turno: horario.turno, estado: horario.estado })
      });
      setMsg('Horario actualizado');
      load();
    } catch (e) { setMsg(e.message); }
  }
  async function crearTarifa(e) {
    e.preventDefault();
    try { await api('/tarifas', { method: 'POST', body: JSON.stringify(nuevaTarifa) }); setMsg('Tarifa creada'); load(); }
    catch (e) { setMsg(e.message); }
  }
  async function actualizarTarifa(tarifa) {
    try { await api(`/tarifas/${tarifa.id}`, { method: 'PUT', body: JSON.stringify({ precio: precios[tarifa.id] ?? tarifa.precio }) }); setMsg('Tarifa actualizada'); load(); }
    catch (e) { setMsg(e.message); }
  }
  async function estadoTarifa(id, accion) {
    try { await api(`/tarifas/${id}/${accion}`, { method: 'PATCH' }); load(); }
    catch (e) { setMsg(e.message); }
  }

  return (
    <div>
      <h2>Gestionar horarios y tarifas</h2><Mensaje texto={msg} />
      <div className="grid2">
        <form className="card" onSubmit={crearHorario}>
          <h3>Nuevo horario</h3><label>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <label>Inicio</label><input value={nuevoHorario.horaInicio} onChange={(e) => setNuevoHorario({ ...nuevoHorario, horaInicio: e.target.value })} />
          <label>Fin</label><input value={nuevoHorario.horaFin} onChange={(e) => setNuevoHorario({ ...nuevoHorario, horaFin: e.target.value })} />
          <label>Turno</label><select value={nuevoHorario.turno} onChange={(e) => setNuevoHorario({ ...nuevoHorario, turno: e.target.value })}><option>DIA</option><option>NOCHE</option></select>
          <button>Crear horario</button>
        </form>
        <form className="card" onSubmit={crearTarifa}>
          <h3>Nueva tarifa</h3><label>Deporte</label><select value={nuevaTarifa.deporte} onChange={(e) => setNuevaTarifa({ ...nuevaTarifa, deporte: e.target.value })}><option>FUTBOL</option><option>FULBITO</option><option>VOLEY</option></select>
          <label>Turno</label><select value={nuevaTarifa.turno} onChange={(e) => setNuevaTarifa({ ...nuevaTarifa, turno: e.target.value })}><option>DIA</option><option>NOCHE</option></select>
          <label>Precio</label><input type="number" min="1" value={nuevaTarifa.precio} onChange={(e) => setNuevaTarifa({ ...nuevaTarifa, precio: e.target.value })} />
          <button>Crear tarifa</button>
        </form>
      </div>
      <div className="grid2">
        <div className="card"><h3>Horarios del {fecha}</h3>{horarios.map((h) => <div className="list-row" key={h.id}><span>{h.horaInicio}-{h.horaFin} {h.turno}</span><Estado estado={h.estadoVista} /><button onClick={() => editarHorario(h)}>Editar</button><button className={h.estado === 'INHABILITADO' ? '' : 'danger'} onClick={() => estadoHorario(h.id, h.estado === 'INHABILITADO' ? 'habilitar' : 'inhabilitar')}>{h.estado === 'INHABILITADO' ? 'Habilitar' : 'Inhabilitar'}</button></div>)}</div>
        <div className="card"><h3>Tarifas</h3>{tarifas.map((t) => <div className="list-row" key={t.id}><span>{t.deporte} {t.turno}</span><input type="number" value={precios[t.id] ?? t.precio} onChange={(e) => setPrecios({ ...precios, [t.id]: e.target.value })} /><Estado estado={t.estado ? 'ACTIVA' : 'INHABILITADA'} /><button onClick={() => actualizarTarifa(t)}>Actualizar</button><button className={t.estado ? 'danger' : ''} onClick={() => estadoTarifa(t.id, t.estado ? 'inhabilitar' : 'habilitar')}>{t.estado ? 'Inhabilitar' : 'Habilitar'}</button></div>)}</div>
      </div>
    </div>
  );
}

function Reportes() {
  const [inicio, setInicio] = useState(fechaLocal(new Date(new Date().setDate(new Date().getDate() - 30))));
  const [fin, setFin] = useState(fechaLocal());
  const [datos, setDatos] = useState({ resumen: {}, estados: [], ingresos: [], horarios: [], clientes: [], canceladas: [] });
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const query = `fechaInicio=${inicio}&fechaFin=${fin}`;
      const [resumen, estados, ingresos, horarios, clientes, canceladas] = await Promise.all([
        api('/reportes/resumen'), api(`/reportes/reservas-por-estado?${query}`), api(`/reportes/ingresos?${query}`),
        api(`/reportes/horarios-mas-reservados?${query}`), api(`/reportes/clientes-frecuentes?${query}`), api(`/reportes/reservas-canceladas?${query}`)
      ]);
      setDatos({ resumen, estados, ingresos, horarios, clientes, canceladas });
    } catch (e) { setMsg(e.message); }
  }
  useEffect(() => { load(); }, []);

  return (
    <div>
      <h2>Consultar reportes</h2><Mensaje texto={msg} error />
      <div className="card actions"><input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /><input type="date" value={fin} onChange={(e) => setFin(e.target.value)} /><button onClick={load}>Generar reportes</button></div>
      <div className="stats"><div className="card"><b>Reservas</b><span>{datos.resumen.totalReservas || 0}</span></div><div className="card"><b>Completadas</b><span>{datos.resumen.completadas || 0}</span></div><div className="card"><b>Canceladas</b><span>{datos.resumen.canceladas || 0}</span></div><div className="card"><b>Ingresos</b><span>S/ {datos.resumen.ingresos || 0}</span></div></div>
      <div className="grid2">
        <div className="card"><h3>Reservas por estado</h3>{datos.estados.map((x) => <p key={x.estado}>{x.estado}: {x.total}</p>)}</div>
        <div className="card"><h3>Ingresos por tipo</h3>{datos.ingresos.map((x) => <p key={x.tipoPago}>{x.tipoPago}: S/ {x.total}</p>)}</div>
        <div className="card"><h3>Horarios más reservados</h3>{datos.horarios.map((x) => <p key={`${x.horaInicio}-${x.horaFin}`}>{x.horaInicio}-{x.horaFin}: {x.total}</p>)}</div>
        <div className="card"><h3>Clientes frecuentes</h3>{datos.clientes.map((x) => <p key={x.id}>{x.nombres}: {x.totalReservas} reservas</p>)}</div>
        <div className="card"><h3>Reservas canceladas</h3>{datos.canceladas.map((x) => <p key={x.id}>{x.codigoReserva} — {x.cliente} — {x.fecha}</p>)}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('home');
  const [usuario, setUsuario] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (token()) api('/auth/me').then(setUsuario).catch(() => localStorage.removeItem('token'));
  }, []);

  function logout() {
    localStorage.removeItem('token');
    setUsuario(null);
    setPage('home');
  }

  return (
    <div className="app">
      <Navbar usuario={usuario} setPage={setPage} logout={logout} />
      <main className="container">
        {page === 'home' && <Home setPage={setPage} usuario={usuario} />}
        {page === 'login' && <Login setUsuario={setUsuario} setPage={setPage} />}
        {page === 'disponibilidad' && <Disponibilidad setSelected={setSelected} setPage={setPage} />}
        {page === 'reservar' && <RegistrarReserva selected={selected} usuario={usuario} setPage={setPage} />}
        {page === 'cliente' && <PanelCliente />}
        {page === 'admin' && <AdminDashboard setPage={setPage} />}
        {page === 'gestion' && <GestionHorariosTarifas />}
        {page === 'reportes' && <Reportes />}
      </main>
    </div>
  );
}
