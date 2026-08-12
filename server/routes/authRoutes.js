const express = require('express');
const router = express.Router();
const { signup, login, refreshToken, logout, verifyEmail, forgotPassword, resetPassword, me, updateProfile } = require('../controllers/authController');
const { signupValidator, loginValidator, forgotValidator, resetValidator } = require('../validators/authValidators');
const { authenticate } = require('../middleware/authMiddleware');

const upload = require('../middleware/upload');

router.post('/signup', signupValidator, signup);
router.post('/register', signupValidator, signup);
router.post('/login', loginValidator, login);
router.post('/signin', loginValidator, login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/verify', verifyEmail);
router.get('/me', authenticate, me);
router.put('/profile', authenticate, upload.single('avatar'), updateProfile);
router.post('/forgot', forgotValidator, forgotPassword);
router.post('/reset', resetValidator, resetPassword);

module.exports = router;
