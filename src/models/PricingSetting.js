const mongoose = require('mongoose');

const pricingSettingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    startDate: { type: String, required: true }, // MM-DD
    endDate: { type: String, required: true }, // MM-DD
    seasonPricePercent: { type: Number, required: true },
    active: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

pricingSettingSchema.index({ startDate: 1, endDate: 1 });
pricingSettingSchema.index({ active: 1 });

module.exports = mongoose.model('PricingSetting', pricingSettingSchema);