const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-otp -password');
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-otp -password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const user = new User(req.body);
    await user.save();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      activity: 'Created new user',
      time: new Date().toISOString(),
      additionalData: { newUserId: user._id, role: user.role },
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select('-otp -password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      activity: 'Updated user',
      time: new Date().toISOString(),
      additionalData: { updatedUserId: user._id },
    });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      activity: 'Deleted user',
      time: new Date().toISOString(),
      additionalData: { deletedUserId: req.params.id },
    });

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};