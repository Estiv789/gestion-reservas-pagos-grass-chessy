const db = require('../db/database');

function buscarActiva() {
  return db.prepare('SELECT * FROM canchas WHERE estado = 1 ORDER BY id LIMIT 1').get();
}

module.exports = { buscarActiva };
