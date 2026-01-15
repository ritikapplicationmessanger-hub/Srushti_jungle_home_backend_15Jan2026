const mongoose = require('mongoose');

const supplySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['toiletries', 'linens', 'cleaning-supplies', 'kitchen-supplies', 'electronics', 'furniture', 'other'],
      default: 'other',
    },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    minQuantity: { type: Number, required: true, min: 0 },
    costPerUnit: { type: Number, required: true, min: 0 },
    supplier: { type: String, trim: true },
    notes: String,
  },
  { timestamps: true }
);

supplySchema.index({ category: 1 });
supplySchema.index({ quantity: 1 });
supplySchema.index({ minQuantity: 1 });

module.exports = mongoose.model('Supply', supplySchema);