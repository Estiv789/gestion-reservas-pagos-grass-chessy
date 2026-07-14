const router = require('express').Router();
const controller = require('../controllers/reservaController');
const upload = require('../middlewares/uploadMiddleware');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');

router.get('/', requireAuth, requireAdmin, controller.listar);
router.get('/mis-reservas', requireAuth, controller.misReservas);
router.post('/', requireAuth, controller.crear);
router.post('/:id/comprobante', requireAuth, upload.single('comprobante'), controller.adjuntarComprobante);
router.patch('/:id/validar-comprobante', requireAuth, requireAdmin, controller.validarComprobante);
router.patch('/:id/confirmar', requireAuth, requireAdmin, controller.confirmar);
router.patch('/:id/rechazar', requireAuth, requireAdmin, controller.rechazar);
router.patch('/:id/cancelar', requireAuth, controller.cancelar);

module.exports = router;
