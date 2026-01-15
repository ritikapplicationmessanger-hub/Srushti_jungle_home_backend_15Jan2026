const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomType: { type: String, required: true, enum: ['double', 'luxury_suite', 'dormitory'] },
    roomName: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    basePrice: { type: Number, required: true, min: 0 },
    baseCapacity: { type: Number, required: true, min: 1 },
    extraBeds: { type: Number, default: 0, min: 0 },
    description: { type: String, required: true },
    amenities: [{ type: String, trim: true }],
    features: [{ type: String, trim: true }],
    roomImage: { type: String, trim: true },
    status: { type: String, enum: ['available', 'occupied', 'maintenance'], default: 'available' },
  },
  { timestamps: true }
);

roomSchema.index({ roomType: 1 });
roomSchema.index({ status: 1 });
roomSchema.index({ baseCapacity: 1 });

module.exports = mongoose.model('Room', roomSchema);