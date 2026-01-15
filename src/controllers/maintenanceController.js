const Maintenance = require('../models/Maintenance');
const Room = require('../models/Room');
const AuditLog = require('../models/AuditLog');

exports.getAllMaintenance = async (req, res, next) => {
  try {
    const tasks = await Maintenance.find({})
      .populate('roomId', 'roomName roomType')
      .populate('assignTo', 'name email')
      .populate('createdBy', 'name')
      .sort({ nextDueDate: 1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMaintenanceById = async (req, res, next) => {
  try {
    const task = await Maintenance.findById(req.params.id)
      .populate('roomId', 'roomName')
      .populate('assignTo', 'name')
      .populate('createdBy', 'name');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Maintenance task not found' });
    }

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

exports.createMaintenance = async (req, res, next) => {
  try {
    const { roomId } = req.body;
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const task = new Maintenance({
      ...req.body,
      roomName: room.roomName,
      createdBy: req.user._id,
    });

    await task.save();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      activity: 'Created maintenance task',
      time: new Date().toISOString(),
      additionalData: { taskName: task.taskName, roomName: task.roomName },
    });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

exports.updateMaintenance = async (req, res, next) => {
  try {
    const task = await Maintenance.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('roomId', 'roomName')
      .populate('assignTo', 'name');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Maintenance task not found' });
    }

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      activity: 'Updated maintenance task',
      time: new Date().toISOString(),
      additionalData: { taskName: task.taskName },
    });

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

exports.completeMaintenance = async (req, res, next) => {
  try {
    const task = await Maintenance.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.status = 'completed';
    task.completedDate = new Date();
    await task.save();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      activity: 'Completed maintenance task',
      time: new Date().toISOString(),
      additionalData: { taskName: task.taskName, roomName: task.roomName },
    });

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

exports.deleteMaintenance = async (req, res, next) => {
  try {
    const task = await Maintenance.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Maintenance task not found' });
    }

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      activity: 'Deleted maintenance task',
      time: new Date().toISOString(),
      additionalData: { taskName: task.taskName },
    });

    res.status(200).json({ success: true, message: 'Maintenance task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getOverdueTasks = async (req, res, next) => {
  try {
    const overdue = await Maintenance.find({
      status: { $nin: ['completed'] },
      nextDueDate: { $lt: new Date() },
    })
      .populate('roomId', 'roomName')
      .sort({ nextDueDate: 1 });

    res.status(200).json({
      success: true,
      count: overdue.length,
      data: overdue,
    });
  } catch (error) {
    next(error);
  }
};