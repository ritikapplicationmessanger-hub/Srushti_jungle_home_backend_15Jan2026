const express = require('express');
const router = express.Router();
const {
  sendOTP,
  verifyOTP,
  refreshToken,
  logout,
} = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/send-otp', authLimiter, sendOTP);
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/refresh', refreshToken);
router.post('/logout', logout); // Optional: can be client-side only

module.exports = router;