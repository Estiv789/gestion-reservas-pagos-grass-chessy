const router = require('express').Router();
const controller = require('../controllers/pagoController');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');

router.get('/', requireAuth, requireAdmin, controller.listar);
router.post('/final', requireAuth, requireAdmin, controller.registrarPagoFinal);

module.exports = router;
