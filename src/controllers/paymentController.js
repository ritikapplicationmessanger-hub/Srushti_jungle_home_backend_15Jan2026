const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLog');

exports.getAllPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({})
      .populate('bookingId', 'name email')
      .populate('createdBy', 'name');
    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};

exports.getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('bookingId', 'name totalAmount');
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

exports.createPayment = async (req, res, next) => {
  try {
    const payment = new Payment({
      ...req.body,
      createdBy: req.user._id,
    });
    await payment.save();

    // Update booking balance
    const booking = await Booking.findById(payment.bookingId);
    if (booking) {
      booking.advancePaid += payment.paymentAmount;
      booking.balance -= payment.paymentAmount;
      await booking.save();
    }

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      activity: 'Recorded payment',
      time: new Date().toISOString(),
      additionalData: { amount: payment.paymentAmount, bookingId: payment.bookingId },
    });

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

exports.updatePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};