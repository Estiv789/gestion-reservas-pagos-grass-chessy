const jwt = require('jsonwebtoken');

function secreto() {
  return process.env.JWT_SECRET || 'grass_chessy_secret_demo';
}

function generarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
      nombres: usuario.nombres
    },
    secreto(),
    { expiresIn: '8h' }
  );
}

function verificarToken(token) {
  return jwt.verify(token, secreto());
}

module.exports = { generarToken, verificarToken };
