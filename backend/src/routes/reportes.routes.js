const router = require('express').Router();
const controller = require('../controllers/reporteController');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');

router.use(requireAuth, requireAdmin);
router.get('/resumen', controller.resumen);
router.get('/reservas-por-estado', controller.porEstado);
router.get('/ingresos', controller.ingresos);
router.get('/ingresos-dia', controller.ingresosPorDia);
router.get('/ingresos-semana', controller.ingresosPorSemana);
router.get('/ingresos-mes', controller.ingresosPorMes);
router.get('/horarios-mas-reservados', controller.horariosMasReservados);
router.get('/clientes-frecuentes', controller.clientesFrecuentes);
router.get('/reservas-canceladas', controller.reservasCanceladas);

module.exports = router;
