const express = require('express');
const router = express.Router();
const {
  signup,
  verifyOtp,
  resendOtp,
  login,
  refreshToken,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  me,
  updateProfile,
  getDepartments
} = require('../controllers/authController');
const { signupValidator, loginValidator, forgotValidator, resetValidator } = require('../validators/authValidators');
const { authenticate } = require('../middleware/authMiddleware');

const upload = require('../middleware/upload');

router.get('/departments', getDepartments);
router.post('/signup', signupValidator, signup);
router.post('/register', signupValidator, signup);
router.post('/verify-otp', verifyOtp);
router.post('/verify-email-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', loginValidator, login);
router.post('/signin', loginValidator, login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/verify', verifyEmail);
router.post('/verify', verifyEmail);
router.get('/verify-email', verifyEmail);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.get('/me', authenticate, me);
router.put('/profile', authenticate, upload.single('avatar'), updateProfile);
router.post('/forgot', forgotValidator, forgotPassword);
router.post('/reset', resetValidator, resetPassword);

module.exports = router;
