const mongoose = require('mongoose');

const notificationSettingSchema = new mongoose.Schema(
  {
    newBookingNotification: { type: Boolean, required: true, default: true },
    upcomingCheckinReminders: { type: Boolean, required: true, default: true },
    paymentNotifications: { type: Boolean, required: true, default: true },
    maintenanceAlerts: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NotificationSetting', notificationSettingSchema);