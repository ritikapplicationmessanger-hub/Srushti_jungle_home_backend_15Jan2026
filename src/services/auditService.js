const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

const logActivity = async (userId, activity, additionalData = {}) => {
  const user = await User.findById(userId);
  if (!user) return;

  await AuditLog.create({
    userId,
    userName: user.name,
    activity,
    time: new Date().toISOString(),
    additionalData,
  });
};

module.exports = { logActivity };