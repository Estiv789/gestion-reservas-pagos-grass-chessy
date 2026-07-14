const usuarioDAO = require('../dao/usuarioDAO');
const passwordService = require('../services/passwordService');
const tokenService = require('../services/tokenService');

exports.login = (req, res) => {
  const correo = String(req.body.correo || '').trim().toLowerCase();
  const clave = String(req.body.clave || '');

  if (!correo || !clave) {
    return res.status(400).json({ mensaje: 'Correo y clave son obligatorios' });
  }

  const usuario = usuarioDAO.buscarPorCorreo(correo);
  if (!usuario) {
    return res.status(404).json({ mensaje: 'Cuenta no encontrada' });
  }
  if (!usuario.estado) {
    return res.status(403).json({ mensaje: 'Cuenta inhabilitada' });
  }
  if (!passwordService.comparar(clave, usuario.passwordHash)) {
    return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
  }

  return res.json({
    token: tokenService.generarToken(usuario),
    usuario: {
      id: usuario.id,
      nombres: usuario.nombres,
      correo: usuario.correo,
      telefono: usuario.telefono,
      rol: usuario.rol
    }
  });
};

exports.register = (req, res) => {
  const nombres = String(req.body.nombres || '').trim();
  const telefono = String(req.body.telefono || '').trim();
  const correo = String(req.body.correo || '').trim().toLowerCase();
  const clave = String(req.body.clave || '');

  if (!nombres || !correo || !clave) {
    return res.status(400).json({ mensaje: 'Nombres, correo y clave son obligatorios' });
  }
  if (clave.length < 6) {
    return res.status(400).json({ mensaje: 'La clave debe tener al menos 6 caracteres' });
  }
  if (usuarioDAO.buscarPorCorreo(correo)) {
    return res.status(409).json({ mensaje: 'El correo ya está registrado' });
  }

  const usuario = usuarioDAO.crearCliente({
    nombres,
    telefono,
    correo,
    passwordHash: passwordService.cifrar(clave)
  });

  return res.status(201).json({
    token: tokenService.generarToken(usuario),
    usuario
  });
};

exports.me = (req, res) => {
  const usuario = usuarioDAO.buscarPorId(req.usuario.id);
  if (!usuario || !usuario.estado) {
    return res.status(404).json({ mensaje: 'Usuario no encontrado o inhabilitado' });
  }
  return res.json(usuario);
};
