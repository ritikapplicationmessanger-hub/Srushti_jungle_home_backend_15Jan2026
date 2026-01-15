const mongoose = require('mongoose');

const otpTokenSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0, max: 3 },
    isUsed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    expires: '5m', // Auto-delete after 5 minutes
  }
);

otpTokenSchema.index({ email: 1 });
otpTokenSchema.index({ otp: 1 });
otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTPToken', otpTokenSchema);