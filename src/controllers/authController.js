const User = require('../models/User');
const OTPToken = require('../models/OTPToken');
const AuditLog = require('../models/AuditLog');
const { sendOTP, verifyOTPAndLogin } = require('../services/authService');
const { sendEmail } = require('../services/emailService');

exports.sendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    await sendOTP(email);

    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    next(error);
  }
};

exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const { user, accessToken, refreshToken } = await verifyOTPAndLogin(email, otp);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    // Implement refresh token logic here (using JWT verify with refresh secret)
    res.status(501).json({ success: false, message: 'Refresh token not implemented yet' });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    // Invalidate token on client side only (stateless JWT)
    // Optionally log logout
    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      activity: 'User logged out',
      time: new Date().toISOString(),
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};