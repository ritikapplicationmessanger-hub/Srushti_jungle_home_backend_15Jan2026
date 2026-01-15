const Room = require('../models/Room');
const AuditLog = require('../models/AuditLog');

exports.getAllRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({});
    res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
};

exports.getRoomById = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    res.status(200).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

exports.createRoom = async (req, res, next) => {
  try {
    const room = new Room(req.body);
    await room.save();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      activity: 'Created new room',
      time: new Date().toISOString(),
      additionalData: { roomName: room.roomName },
    });

    res.status(201).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

exports.updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      activity: 'Updated room',
      time: new Date().toISOString(),
      additionalData: { roomName: room.roomName },
    });

    res.status(200).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

exports.deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      activity: 'Deleted room',
      time: new Date().toISOString(),
      additionalData: { roomName: room.roomName },
    });

    res.status(200).json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getRoomAvailability = async (req, res, next) => {
  try {
    const { checkIn, checkOut } = req.query;
    // Logic to check overlapping bookings will go in service layer later
    const rooms = await Room.find({ status: 'available' });
    res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
};