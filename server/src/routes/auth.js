const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const protect = require('../middleware/auth');
const { loginSchema, registerSchema, refreshSchema } = require('../validations/auth.validation');

router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerSchema), authController.register);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.get('/me', protect, authController.me);
router.post('/verify-password', protect, authController.verifyPassword);

module.exports = router;
