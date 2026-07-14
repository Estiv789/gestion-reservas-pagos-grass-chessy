const bcrypt = require('bcryptjs');

function cifrar(contrasena) {
  return bcrypt.hashSync(contrasena, 10);
}

function comparar(contrasena, hash) {
  return bcrypt.compareSync(contrasena, hash);
}

module.exports = { cifrar, comparar };
