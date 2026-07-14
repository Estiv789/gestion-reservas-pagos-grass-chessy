require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API de Gestión de Reservas y Pagos del Grass Chessy ejecutándose en http://localhost:${PORT}`);
});
