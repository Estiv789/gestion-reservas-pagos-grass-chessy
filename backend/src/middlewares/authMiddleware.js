const tokenService = require('../services/tokenService');

function obtenerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

function requireAuth(req, res, next) {
  const token = obtenerToken(req);
  if (!token) return res.status(401).json({ mensaje: 'Token requerido' });
  try {
    req.usuario = tokenService.verificarToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido o vencido' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.usuario || req.usuario.rol !== 'ADMINISTRADOR') {
    return res.status(403).json({ mensaje: 'Acceso exclusivo para el Administrador' });
  }
  return next();
}

module.exports = { requireAuth, requireAdmin };
