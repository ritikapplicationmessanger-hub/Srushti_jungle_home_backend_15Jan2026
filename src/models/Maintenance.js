const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    roomName: { type: String, required: true },
    taskName: { type: String, required: true, trim: true },
    frequency: {
      type: String,
      enum: ['monthly', 'daily', 'weekly', 'bi-weekly', 'quarterly', 'yearly', 'one-time'],
      default: 'one-time',
    },
    priority: { type: String, enum: ['medium', 'low', 'high'], default: 'low' },
    nextDueDate: { type: Date, default: Date.now },
    assignTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    description: String,
    status: { type: String, enum: ['pending', 'in-progress', 'completed', 'overdue'], default: 'pending' },
    completedDate: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

maintenanceSchema.index({ roomId: 1 });
maintenanceSchema.index({ nextDueDate: 1 });
maintenanceSchema.index({ status: 1 });
maintenanceSchema.index({ priority: 1 });
maintenanceSchema.index({ assignTo: 1 });

module.exports = mongoose.model('Maintenance', maintenanceSchema);