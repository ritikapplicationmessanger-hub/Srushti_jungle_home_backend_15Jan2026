const OTPToken = require('../models/OTPToken');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('./emailService');
const AuditLog = require('../models/AuditLog');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

const sendOTP = async (email) => {
  email = email.toLowerCase().trim();

  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User with this email does not exist');
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Remove old OTPs
  await OTPToken.deleteMany({ email });

  // Create new OTP
  await OTPToken.create({ email, otp, expiresAt });

  // Send email
  // await sendEmail({
  //   to: email,
  //   subject: 'Your Login OTP - The Core Pench',
  //   html: `
  //     <h2>Your One-Time Password (OTP)</h2>
  //     <p>Use this OTP to log in:</p>
  //     <h1 style="font-size: 32px; letter-spacing: 8px;"><strong>${otp}</strong></h1>
  //     <p>This OTP is valid for 5 minutes.</p>
  //     <p>If you didn't request this, please ignore this email.</p>
  //   `,
  // });

  await sendEmail({
  to: email,
  subject: 'Your Login OTP – Srushti Jungle Homes',
  html: `
  <div style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.08);">

            <!-- Header / Logo -->
            <tr>
              <td align="center" style="padding:24px; background:#0f172a;">
                <img
                  src="https://instagram.fnag4-2.fna.fbcdn.net/v/t51.2885-19/59881846_1003794769824861_6363815629023084544_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=instagram.fnag4-2.fna.fbcdn.net&_nc_cat=109&_nc_oc=Q6cZ2QGrdyen2oKhazsj7yD6aBRyxPottZ6WrcYjbb9nSmyzSokue_3niCO9k5FMW7mIqmPKON225bNJ5CzIiFukLnXE&_nc_ohc=NlIdozjXMKUQ7kNvwEKUvAn&_nc_gid=fuzDgvgIn7PUX7UlpIxZnA&edm=AOQ1c0wBAAAA&ccb=7-5&oh=00_Afpezkn7s60iDCU6TeY5tzK6fQHya06mWP3hI7lW2iS-PQ&oe=696D36E5&_nc_sid=8b3546"
                  alt="Srushti Jungle Homes Logo"
                  width="60"
                  height="60"
                  style="display:block; margin-bottom:12px;"
                />
                <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:600;">
                  Srushti Jungle Homes
                </h1>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding:32px 28px; color:#111827;">
                <h2 style="margin:0 0 12px; font-size:22px;">
                  Your One-Time Password
                </h2>

                <p style="margin:0 0 20px; font-size:15px; color:#4b5563; line-height:1.6;">
                  Use the OTP below to securely log in to your account.
                </p>

                <!-- OTP Box -->
                <div style="
                  text-align:center;
                  margin:24px 0;
                  padding:18px;
                  border-radius:10px;
                  background:#f1f5f9;
                  letter-spacing:8px;
                  font-size:32px;
                  font-weight:700;
                  color:#0f172a;
                ">
                  ${otp}
                </div>

                <p style="margin:0 0 12px; font-size:14px; color:#374151;">
                   This OTP is valid for <strong>5 minutes</strong>.
                </p>

                <p style="margin:0; font-size:14px; color:#6b7280;">
                  If you didn’t request this login, you can safely ignore this email.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding:20px; background:#f8fafc; font-size:12px; color:#6b7280;">
                © ${new Date().getFullYear()} Srushti Jungle Homes. All rights reserved.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </div>
  `,
});


  await AuditLog.create({
    userId: null,
    userName: email,
    activity: 'OTP sent for login',
    time: new Date().toISOString(),
    additionalData: { email }
  });
};

const verifyOTPAndLogin = async (email, otp) => {
  email = email.toLowerCase().trim();

  const otpToken = await OTPToken.findOne({
    email,
    otp,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otpToken) {
    throw new Error('Invalid or expired OTP');
  }

  const user = await User.findOne({ email });
  if (!user || !user.isActive) {
    throw new Error('Invalid credentials or account deactivated');
  }

  // Mark OTP as used
  otpToken.isUsed = true;
  await otpToken.save();

  // Update last login
  user.lastLogin = new Date();
  user.loginAttempts = 0;
  await user.save();

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await AuditLog.create({
    userId: user._id,
    userName: user.name,
    activity: 'User logged in successfully',
    time: new Date().toISOString(),
  });

  return {
    user,
    accessToken,
    refreshToken,
  };
};

module.exports = {
  sendOTP,
  verifyOTPAndLogin,
  generateAccessToken,
  generateRefreshToken,
};