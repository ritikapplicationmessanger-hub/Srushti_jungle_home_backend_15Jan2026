const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, trim: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    paymentAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    advancePaid: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['cash', 'card', 'bank', 'upi'], required: true },
    notes: String,
    transactionId: String,
    status: { type: String, enum: ['pending', 'paid', 'unpaid'], default: 'pending' },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentMethod: 1 });
paymentSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Payment', paymentSchema);