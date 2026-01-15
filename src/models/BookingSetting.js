const mongoose = require('mongoose');

const bookingSettingSchema = new mongoose.Schema(
  {
    checkInTime: { type: String, required: true, default: '14:00' },
    checkOutTime: { type: String, required: true, default: '11:00' },
    minimumStay: { type: Number, required: true, min: 1, default: 1 },
    maximumStay: { type: Number, required: true, min: 1, default: 30 },
    sendEmailConfirmation: { type: Boolean, required: true, default: true },
    advancePayment: { type: Boolean, required: true, default: true },
    checkinCheckoutEmail: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BookingSetting', bookingSettingSchema);