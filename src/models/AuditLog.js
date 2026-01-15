const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  // {
  //   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
  //   userName: { type: String, required: false },
  //   date: { type: Date, default: Date.now },
  //   activity: { type: String, required: true, trim: true },
  //   time: { type: String, required: true },
  //   ipAddress: String,
  //   userAgent: String,
  //   additionalData: mongoose.Schema.Types.Mixed,
  // },
  // { timestamps: true }
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,    // ← Change from true to false
      index: true
    },
    userName: {
      type: String,
      required: false,    // ← Also make this optional (use email if no name)
      trim: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    activity: {
      type: String,
      required: true,
      trim: true
    },
    time: {
      type: String,
      required: true
    },
    ipAddress: String,
    userAgent: String,
    additionalData: mongoose.Schema.Types.Mixed
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ date: 1 });
auditLogSchema.index({ activity: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);