const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const horarioRoutes = require('./routes/horarios.routes');
const tarifaRoutes = require('./routes/tarifas.routes');
const reservaRoutes = require('./routes/reservas.routes');
const pagoRoutes = require('./routes/pagos.routes');
const reporteRoutes = require('./routes/reportes.routes');

const app = express();
const allowedOrigins = [
  'http://localhost:5173',
  'https://gestion-reservas-pagos-grass-chessy.vercel.app',
  process.env.FRONTEND_URL
]
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ''));

app.use(
  cors({
    origin(origin, callback) {
      // Permite solicitudes sin origen, como Postman o pruebas del servidor.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, '');

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`Origen no permitido por CORS: ${origin}`)
      );
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, mensaje: 'Backend funcionando correctamente' });
});

app.use('/api/auth', authRoutes);
app.use('/api/horarios', horarioRoutes);
app.use('/api/tarifas', tarifaRoutes);
app.use('/api/reservas', reservaRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/reportes', reporteRoutes);

app.use((req, res) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ mensaje: 'El archivo supera el máximo de 5 MB' });
  }
  if (String(err.message).includes('Solo se permiten')) {
    return res.status(400).json({ mensaje: err.message });
  }
  return res.status(500).json({ mensaje: 'Error interno del servidor', detalle: err.message });
});

module.exports = app;
