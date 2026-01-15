const Booking = require('../models/Booking');
const Room = require('../models/Room');
const AuditLog = require('../models/AuditLog');
const Payment = require('../models/Payment');
const BookingSetting = require('../models/BookingSetting');
const PropertySetting = require('../models/PropertySetting');
const { sendCheckInEmail, sendCheckOutEmail } = require('../services/emailService');
const { createBooking, checkInBooking, checkOutBooking } = require('../services/bookingService');

exports.getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({})
      .populate('roomId', 'roomName roomType')
      .populate('createdBy', 'name email');
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
};

exports.getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('roomId', 'roomName')
      .populate('createdBy', 'name');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

exports.createBooking = async (req, res, next) => {
  try {
    const booking = await createBooking(req.body, req.user._id);

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

// exports.updateBooking = async (req, res, next) => {
//   try {
//     const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//       runValidators: true,
//     });

//     if (!booking) {
//       return res.status(404).json({ success: false, message: 'Booking not found' });
//     }

//     await AuditLog.create({
//       userId: req.user._id,
//       userName: req.user.name,
//       activity: 'Updated booking',
//       time: new Date().toISOString(),
//       additionalData: { bookingId: booking._id },
//     });

//     res.status(200).json({ success: true, data: booking });
//   } catch (error) {
//     next(error);
//   }
// };


// exports.updateBooking = async (req, res, next) => {
//   try {
//     const booking = await Booking.findById(req.params.id).populate('roomId');
//     if (!booking) {
//       return res.status(404).json({ success: false, message: 'Booking not found' });
//     }

//     const oldStatus = booking.status;
//     const updates = req.body;

//     // Apply updates
//     Object.keys(updates).forEach((key) => {
//       booking[key] = updates[key];
//     });

//     // Handle check-in
//     if (oldStatus !== 'check-in' && booking.status === 'check-in') {
//       booking.checkedInDate = new Date();
//       await Room.findByIdAndUpdate(booking.roomId._id, { status: 'occupied' });
//     }

//     // Handle check-out + Auto-payment for NO ADVANCE bookings
//     if (oldStatus !== 'check-out' && booking.status === 'check-out') {
//       booking.checkOutDate = new Date();
//       await Room.findByIdAndUpdate(booking.roomId._id, { status: 'available' });

//       // Auto-create FULL payment ONLY if no advance was paid and balance exists
//       if (booking.advancePaid === 0 && booking.balance > 0) {
//         const payment = new Payment({
//           customerId: booking.email,
//           roomId: booking.roomId._id,
//           totalAmount: booking.totalAmount,
//           paymentAmount: booking.totalAmount,        // Full amount paid now
//           paidAmount: booking.totalAmount,           // Total paid = full amount
//           advancePaid: 0,                            // No advance
//           paymentMethod: 'cash',                     // Default at checkout
//           notes: 'Full payment collected at check-out (no advance booking)',
//           status: 'paid',
//           bookingId: booking._id,
//           createdBy: req.user._id,
//         });

//         await payment.save();

//         // Clear balance
//         booking.balance = 0;

//         await AuditLog.create({
//           userId: req.user._id,
//           userName: req.user.name,
//           activity: 'Auto-collected full payment at check-out (no advance)',
//           time: new Date().toISOString(),
//           additionalData: {
//             bookingId: booking._id,
//             guestName: booking.name,
//             totalAmount: booking.totalAmount,
//           },
//         });
//       }
//     }

//     await booking.save();

//     await AuditLog.create({
//       userId: req.user._id,
//       userName: req.user.name,
//       activity: 'Updated booking',
//       time: new Date().toISOString(),
//       additionalData: { bookingId: booking._id, oldStatus, newStatus: booking.status },
//     });

//     res.status(200).json({ success: true, data: booking });
//   } catch (error) {
//     next(error);
//   }
// };




exports.updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('roomId');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const oldStatus = booking.status;
    const updates = req.body;

    // Apply updates
    Object.keys(updates).forEach((key) => {
      booking[key] = updates[key];
    });

    // Handle check-in
    if (oldStatus !== 'check-in' && booking.status === 'check-in') {
      booking.checkedInDate = new Date();
      await Room.findByIdAndUpdate(booking.roomId._id, { status: 'occupied' });

      // Send check-in email if enabled in settings
      const bookingSettings = await BookingSetting.findOne();
      if (bookingSettings?.checkinCheckoutEmail) {
        const property = await PropertySetting.findOne();
        await sendCheckInEmail(booking, property);
      }

      await AuditLog.create({
        userId: req.user._id,
        userName: req.user.name,
        activity: 'Checked in guest',
        time: new Date().toISOString(),
        additionalData: { bookingId: booking._id, guestName: booking.name },
      });
    }

    // Handle cancellation
if (oldStatus !== 'cancelled' && booking.status === 'cancelled') {
  // Free the room if it was occupied
  await Room.findByIdAndUpdate(booking.roomId._id, {
    status: 'available',
  });

  await AuditLog.create({
    userId: req.user._id,
    userName: req.user.name,
    activity: 'Cancelled booking',
    time: new Date().toISOString(),
    additionalData: {
      bookingId: booking._id,
      guestName: booking.name,
      oldStatus,
    },
  });
}

    // Handle check-out + Auto-payment for remaining balance
    if (oldStatus !== 'check-out' && booking.status === 'check-out') {
      booking.checkOutDate = new Date();
      await Room.findByIdAndUpdate(booking.roomId._id, { status: 'available' });

      // Auto-create payment for remaining balance at check-out
      if (booking.balance > 0) {
        const payment = new Payment({
          customerId: booking.email,
          roomId: booking.roomId._id,
          totalAmount: booking.totalAmount,
          paymentAmount: booking.balance,
          paidAmount: booking.advancePaid + booking.balance,
          advancePaid: booking.advancePaid,
          paymentMethod: 'cash',
          notes: 'Balance payment collected at check-out (auto-generated)',
          status: 'paid',
          bookingId: booking._id,
          createdBy: req.user._id,
        });

        await payment.save();
        booking.balance = 0;
      }

      // Send check-out email if enabled in settings
      const bookingSettings = await BookingSetting.findOne();
      if (bookingSettings?.checkinCheckoutEmail) {
        const property = await PropertySetting.findOne();
        const latestPayment = await Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 });
        await sendCheckOutEmail(booking, latestPayment || {}, property);
      }

      await AuditLog.create({
        userId: req.user._id,
        userName: req.user.name,
        activity: 'Checked out guest',
        time: new Date().toISOString(),
        additionalData: { bookingId: booking._id, guestName: booking.name },
      });
    }

    await booking.save();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      activity: 'Updated booking',
      time: new Date().toISOString(),
      additionalData: { bookingId: booking._id, oldStatus, newStatus: booking.status },
    });

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};


exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      activity: 'Deleted booking',
      time: new Date().toISOString(),
      additionalData: { bookingId: req.params.id },
    });

    // Update room status back to available if needed
    await Room.findByIdAndUpdate(booking.roomId, { status: 'available' });

    res.status(200).json({ success: true, message: 'Booking deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.checkIn = async (req, res, next) => {
  try {
    const booking = await checkInBooking(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

exports.checkOut = async (req, res, next) => {
  try {
    const booking = await checkOutBooking(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};