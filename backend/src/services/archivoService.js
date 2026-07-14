const fs = require('fs');

function validarArchivo(archivo) {
  if (!archivo) return false;
  const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  return permitidos.includes(archivo.mimetype) && archivo.size <= 5 * 1024 * 1024;
}

function eliminarArchivoSiExiste(rutaFisica) {
  if (rutaFisica && fs.existsSync(rutaFisica)) {
    fs.unlinkSync(rutaFisica);
  }
}

module.exports = { validarArchivo, eliminarArchivoSiExiste };
