const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, trim: true },
    role: { type: String, enum: ['staff', 'manager', 'admin'], default: 'staff' },
    isActive: { type: Boolean, default: true },
    otp: {
      code: String,
      expiresAt: Date,
    },
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
  },
  { timestamps: true }
);

// userSchema.index({ email: 1 });
// userSchema.index({ role: 1 });
// userSchema.index({ isActive: 1 });

module.exports = mongoose.model('User', userSchema);