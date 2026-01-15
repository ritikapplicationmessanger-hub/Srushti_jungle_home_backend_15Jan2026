const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Payment = require('../models/Payment');
const BookingSetting = require('../models/BookingSetting');
const { sendBookingConfirmationEmail, sendCheckInEmail, sendCheckOutEmail } = require('./emailService');
const PropertySetting = require('../models/PropertySetting');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User')

// const createBooking = async (bookingData, userId) => {
//   const {
//     roomId,
//     checkedInDate,
//     checkOutDate,
//     guests,
//     extraBed = 0,
//     advancePaid = 0,
//   } = bookingData;

//   const room = await Room.findById(roomId);
//   if (!room) throw new Error('Room not found');

//   if (room.status !== 'available') {
//     throw new Error('Room is not available');
//   }

//   // Basic date validation
//   const checkIn = new Date(checkedInDate);
//   const checkOut = new Date(checkOutDate);
//   if (checkOut <= checkIn) {
//     throw new Error('Check-out date must be after check-in date');
//   }

//   const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
//   const totalAmount = room.price * nights + (extraBed * 500); // example extra bed charge
//   const balance = totalAmount - advancePaid;

//   const booking = new Booking({
//     ...bookingData,
//     roomName: room.roomName,
//     price: room.price,
//     basePrice: room.basePrice,
//     totalAmount,
//     advancePaid,
//     balance,
//     status: advancePaid > 0 ? 'confirmed-with-advance' : 'confirmed-without-advance',
//     createdBy: userId,
//   });

//   await booking.save();

//   // Create initial payment record
// //   if (advancePaid > 0) {
// //     await Payment.create({
// //       customerId: booking.email,
// //       roomId,
// //       totalAmount,
// //       paidAmount: advancePaid,
// //       advancePaid,
// //       paymentMethod: 'upi', // or from request
// //       status: 'paid',
// //       bookingId: booking._id,
// //       createdBy: userId,
// //     });
// //   }
// if (advancePaid > 0) {
//   await Payment.create({
//     customerId: booking.email,
//     roomId,
//     paymentAmount: advancePaid,                    // Required field
//     paidAmount: advancePaid,
//     advancePaid: advancePaid,
//     totalAmount,
//     paymentMethod: bookingData.paymentMethod || 'upi',
//     notes: bookingData.paymentNotes || '',
//     transactionId: bookingData.transactionId || '',
//     status: 'paid',
//     bookingId: booking._id,
//     createdBy: userId,
//   });
// }

//   // Update room status
//   await Room.findByIdAndUpdate(roomId, { status: 'occupied' });

//   // Send confirmation email if enabled
//   const settings = await BookingSetting.findOne();
//   if (settings?.sendEmailConfirmation) {
//     const property = await PropertySetting.findOne();
//     await sendBookingConfirmationEmail(booking, property);
//   }

//   await AuditLog.create({
//     userId,
//     userName: (await User.findById(userId)).name,
//     activity: 'Created new booking',
//     time: new Date().toISOString(),
//     additionalData: { bookingId: booking._id, roomName: room.roomName },
//   });

//   return booking;
// };


const createBooking = async (bookingData, userId) => {
  const {
    roomId,
    checkedInDate,
    checkOutDate,
    guests,
    extraBed = 0,
    advancePaid = 0,
  } = bookingData;

  const room = await Room.findById(roomId);
  if (!room) throw new Error('Room not found');

  if (room.status !== 'available') {
    throw new Error('Room is not available');
  }

  // Basic date validation
  const checkIn = new Date(checkedInDate);
  const checkOut = new Date(checkOutDate);
  if (checkOut <= checkIn) {
    throw new Error('Check-out date must be after check-in date');
  }

  // Check for overlapping bookings on the same room
  const existingBookings = await Booking.find({
    roomId: roomId,
    $or: [
      { checkedInDate: { $lte: checkOut }, checkOutDate: { $gte: checkIn } }
    ]
  });

  if (existingBookings.length > 0) {
    throw new Error('Room is already booked for the selected dates');
  }

  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  const totalAmount = room.price * nights + (extraBed * 500); // example extra bed charge
  const balance = totalAmount - advancePaid;

  const booking = new Booking({
    ...bookingData,
    roomName: room.roomName,
    price: room.price,
    basePrice: room.basePrice,
    totalAmount,
    advancePaid,
    balance,
    status: advancePaid > 0 ? 'confirmed-with-advance' : 'confirmed-without-advance',
    createdBy: userId,
  });

  await booking.save();

  // Create initial payment record
  if (advancePaid > 0) {
    await Payment.create({
      customerId: booking.email,
      roomId,
      paymentAmount: advancePaid,
      paidAmount: advancePaid,
      advancePaid: advancePaid,
      totalAmount,
      paymentMethod: bookingData.paymentMethod || 'upi',
      notes: bookingData.paymentNotes || '',
      transactionId: bookingData.transactionId || '',
      status: 'paid',
      bookingId: booking._id,
      createdBy: userId,
    });
  }

  // Only occupy room if check-in is TODAY
  const today = new Date();
  const isCheckInToday = 
    checkIn.getFullYear() === today.getFullYear() &&
    checkIn.getMonth() === today.getMonth() &&
    checkIn.getDate() === today.getDate();

  if (isCheckInToday) {
    await Room.findByIdAndUpdate(roomId, { status: 'occupied' });
  }
  // If check-in is in future → keep status as 'available' (no change)

  // Send confirmation email if enabled
  const settings = await BookingSetting.findOne();
  if (settings?.sendEmailConfirmation) {
    const property = await PropertySetting.findOne();
    await sendBookingConfirmationEmail(booking, property);
  }

  await AuditLog.create({
    userId,
    userName: (await User.findById(userId)).name,
    activity: 'Created new booking',
    time: new Date().toISOString(),
    additionalData: { bookingId: booking._id, roomName: room.roomName },
  });

  return booking;
};
const checkInBooking = async (bookingId, userId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error('Booking not found');

  if (booking.status.includes('check-in') || booking.status === 'check-out') {
    throw new Error('Booking already checked in or checked out');
  }

  booking.status = 'check-in';
  booking.checkedInDate = new Date();
  await booking.save();

  await Room.findByIdAndUpdate(booking.roomId, { status: 'occupied' });

  const settings = await BookingSetting.findOne();
  if (settings?.checkinCheckoutEmail) {
    const property = await PropertySetting.findOne();
    await sendCheckInEmail(booking, property);
  }

  await AuditLog.create({
    userId,
    userName: (await User.findById(userId)).name,
    activity: 'Checked in guest',
    time: new Date().toISOString(),
    additionalData: { bookingId, guestName: booking.name },
  });

  return booking;
};

const checkOutBooking = async (bookingId, userId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error('Booking not found');

  if (booking.status !== 'check-in') {
    throw new Error('Guest not checked in');
  }

  booking.status = 'check-out';
  booking.checkOutDate = new Date();
  await booking.save();

  await Room.findByIdAndUpdate(booking.roomId, { status: 'available' });

  const payment = await Payment.findOne({ bookingId });
  const settings = await BookingSetting.findOne();
  if (settings?.checkinCheckoutEmail) {
    const property = await PropertySetting.findOne();
    await sendCheckOutEmail(booking, payment || {}, property);
  }

  await AuditLog.create({
    userId,
    userName: (await User.findById(userId)).name,
    activity: 'Checked out guest',
    time: new Date().toISOString(),
    additionalData: { bookingId, guestName: booking.name },
  });

  return booking;
};

module.exports = {
  createBooking,
  checkInBooking,
  checkOutBooking,
};