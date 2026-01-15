const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true },
    request: { type: String, trim: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    roomName: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    basePrice: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['confirmed-without-advance', 'confirmed-with-advance', 'enquiry', 'check-in', 'check-out', 'cancelled'],
      default: 'confirmed-without-advance',
    },
    checkedInDate: Date,
    checkOutDate: Date,
    idName: String,
    idNumber: String,
    guests: { type: Number, required: true, min: 1 },
    extraBed: { type: Number, default: 0, min: 0 },
    food: { type: String, enum: ['veg', 'non-veg', 'jain'], default: 'veg' },
    totalAmount: { type: Number, required: true, min: 0 },
    advancePaid: { type: Number, default: 0, min: 0 },
    paymentNotes: String,
    balance: { type: Number, required: true, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

bookingSchema.index({ email: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ checkedInDate: 1 });
bookingSchema.index({ checkOutDate: 1 });
bookingSchema.index({ roomId: 1 });
bookingSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Booking', bookingSchema);