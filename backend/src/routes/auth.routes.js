const router = require('express').Router();
const controller = require('../controllers/authController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.post('/login', controller.login);
router.post('/register', controller.register);
router.get('/me', requireAuth, controller.me);

module.exports = router;
