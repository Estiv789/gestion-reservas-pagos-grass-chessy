const router = require('express').Router();
const controller = require('../controllers/tarifaController');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');

router.get('/', controller.listar);
router.post('/', requireAuth, requireAdmin, controller.crear);
router.put('/:id', requireAuth, requireAdmin, controller.actualizar);
router.patch('/:id/habilitar', requireAuth, requireAdmin, controller.habilitar);
router.patch('/:id/inhabilitar', requireAuth, requireAdmin, controller.inhabilitar);
router.delete('/:id', requireAuth, requireAdmin, controller.eliminar);

module.exports = router;
