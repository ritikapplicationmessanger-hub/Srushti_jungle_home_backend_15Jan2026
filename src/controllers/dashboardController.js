const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Room = require('../models/Room');
const Supply = require('../models/Supply');
const Maintenance = require('../models/Maintenance');
const NotificationSetting = require('../models/NotificationSetting');


// exports.getDashboardStats = async (req, res, next) => {
//   try {
//     // const stats = await Promise.all([
//     //   Booking.countDocuments(),
//     //   Booking.countDocuments({ status: 'check-in' }),
//     //   Booking.countDocuments({ status: 'confirmed-with-advance' }),
//     //   Room.countDocuments(),
//     //   Room.countDocuments({ status: 'occupied' }),
//     //   Room.countDocuments({ status: 'maintenance' }),
//     //   Payment.aggregate([{ $group: { _id: null, total: { $sum: '$paymentAmount' } } }]),
//     //   Payment.aggregate([
//     //     {
//     //       $match: {
//     //         createdAt: {
//     //           $gte: new Date(new Date().setHours(0, 0, 0, 0)),
//     //         },
//     //       },
//     //     },
//     //     { $group: { _id: null, today: { $sum: '$paymentAmount' } } },
//     //   ]),
//     //   Supply.countDocuments({ quantity: { $lte: '$minQuantity' } }),
//     //   Maintenance.countDocuments({
//     //     status: { $nin: ['completed'] },
//     //     nextDueDate: { $lt: new Date() },
//     //   }),
//     // ]);
//     const stats = await Promise.all([
//   Booking.countDocuments(),
//   Booking.countDocuments({ status: 'check-in' }),
//   Booking.countDocuments({ status: 'confirmed-with-advance' }), // or your upcoming logic
//   Room.countDocuments(),
//   Room.countDocuments({ status: 'occupied' }),
//   Room.countDocuments({ status: 'maintenance' }),
//   Payment.aggregate([{ $group: { _id: null, total: { $sum: '$paymentAmount' } } }]),
//   Payment.aggregate([
//     {
//       $match: {
//         createdAt: {
//           $gte: new Date(new Date().setHours(0, 0, 0, 0)),
//         },
//       },
//     },
//     { $group: { _id: null, today: { $sum: '$paymentAmount' } } },
//   ]),
//   // FIXED LINE BELOW
//   Supply.countDocuments({
//     $expr: { $lte: ['$quantity', '$minQuantity'] }
//   }),
//   Maintenance.countDocuments({
//     status: { $nin: ['completed'] },
//     nextDueDate: { $lt: new Date() },
//   }),
// ]);

//     const totalRevenue = stats[6][0]?.total || 0;
//     const todayRevenue = stats[7][0]?.today || 0;

//     res.status(200).json({
//       success: true,
//       data: {
//         totalBookings: stats[0],
//         currentGuests: stats[1],
//         upcomingBookings: stats[2],
//         totalRooms: stats[3],
//         occupiedRooms: stats[4],
//         maintenanceRooms: stats[5],
//         totalRevenue,
//         todayRevenue,
//         lowStockItems: stats[8],
//         overdueTasks: stats[9],
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalBookingsCount,
      currentGuestsCount,
      upcomingBookingsCount,
      totalRoomsCount,
      occupiedRoomsCount,
      maintenanceRoomsCount,
      totalRevenueResult,
      todayRevenueResult,
      lowStockResult,
      overdueTasksCount,
      allBookings // To calculate today check-ins, check-outs, and enquiries
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'check-in' }),
      Booking.countDocuments({
        status: { $in: ['confirmed-with-advance', 'confirmed-without-advance'] },
        checkedInDate: { $gt: new Date() }
      }),
      Room.countDocuments(),
      Room.countDocuments({ status: 'occupied' }),
      Room.countDocuments({ status: 'maintenance' }),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: '$paymentAmount' } } }]),
      Payment.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        },
        { $group: { _id: null, today: { $sum: '$paymentAmount' } } }
      ]),
      // Fixed low stock count using aggregation with $expr
      Supply.aggregate([
        { $match: { $expr: { $lte: ['$quantity', '$minQuantity'] } } },
        { $count: 'count' }
      ]),
      Maintenance.countDocuments({
        status: { $nin: ['completed'] },
        nextDueDate: { $lt: new Date() }
      }),
      Booking.find({}) // Fetch all bookings for date-based calculations
    ]);

    // Calculate today check-ins and check-outs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCheckIns = allBookings.filter(booking =>
      booking.checkedInDate &&
      new Date(booking.checkedInDate) >= today &&
      new Date(booking.checkedInDate) < tomorrow
    ).length;

    const todayCheckOuts = allBookings.filter(booking =>
      booking.checkOutDate &&
      new Date(booking.checkOutDate) >= today &&
      new Date(booking.checkOutDate) < tomorrow
    ).length;

    const enquiryBookings = allBookings.filter(booking => booking.status === 'enquiry').length;

    res.status(200).json({
      success: true,
      data: {
        totalBookings: totalBookingsCount,
        currentGuests: currentGuestsCount,
        upcomingBookings: upcomingBookingsCount,
        totalRooms: totalRoomsCount,
        occupiedRooms: occupiedRoomsCount,
        maintenanceRooms: maintenanceRoomsCount,
        totalRevenue: totalRevenueResult[0]?.total || 0,
        todayRevenue: todayRevenueResult[0]?.today || 0,
        lowStockItems: lowStockResult[0]?.count || 0,
        overdueTasks: overdueTasksCount,
        todayCheckIns,
        todayCheckOuts,
        enquiryBookings
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getOccupancyRate = async (req, res, next) => {
  try {
    const totalRooms = await Room.countDocuments();
    const occupied = await Room.countDocuments({ status: 'occupied' });

    const occupancyRate = totalRooms > 0 ? (occupied / totalRooms) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        occupied,
        total: totalRooms,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getRecentBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({})
      .populate('roomId', 'roomName')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
};

exports.getUpcomingCheckins = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcoming = await Booking.find({
      checkedInDate: { $gte: today, $lt: tomorrow },
      status: { $in: ['confirmed-with-advance', 'confirmed-without-advance'] },
    })
      .populate('roomId', 'roomName')
      .sort({ checkedInDate: 1 });

    res.status(200).json({ success: true, data: upcoming });
  } catch (error) {
    next(error);
  }
};

exports.getTodayNotifications = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch notification settings
    const settings = await NotificationSetting.findOne() || {
      newBookingNotification: true,
      upcomingCheckinReminders: true,
      paymentNotifications: true,
      maintenanceAlerts: true
    };

    const notifications = [];

    // 1. New Bookings Created Today (if enabled)
    if (settings.newBookingNotification) {
      const newBookings = await Booking.find({
        createdAt: { $gte: today, $lt: tomorrow }
      }).populate('roomId', 'roomName');

      if (newBookings.length > 0) {
        notifications.push({
          type: 'new_booking',
          title: 'New Bookings Today',
          count: newBookings.length,
          message: `${newBookings.length} new booking(s) received today`,
          details: newBookings.map(b => ({
            id: b._id,
            guestName: b.name,
            email: b.email,
            phone: b.phone,
            roomName: b.roomName || 'N/A',
            checkIn: b.checkedInDate,
            checkOut: b.checkOutDate,
            totalAmount: b.totalAmount,
            advancePaid: b.advancePaid,
            status: b.status
          }))
        });
      }
    }

    // 2. Today's Check-ins (if reminders enabled)
    if (settings.upcomingCheckinReminders) {
      const todayCheckIns = await Booking.find({
        checkedInDate: { $gte: today, $lt: tomorrow },
        status: { $in: ['confirmed-with-advance', 'confirmed-without-advance', 'enquiry'] }
      }).populate('roomId', 'roomName');

      if (todayCheckIns.length > 0) {
        notifications.push({
          type: 'today_checkin',
          title: 'Check-ins Today',
          count: todayCheckIns.length,
          message: `${todayCheckIns.length} guest(s) arriving today`,
          details: todayCheckIns.map(b => ({
            id: b._id,
            guestName: b.name,
            roomName: b.roomName || 'N/A',
            guests: b.guests,
            food: b.food,
            advancePaid: b.advancePaid,
            balance: b.balance,
            request: b.request || 'None'
          }))
        });
      }
    }

    // 3. Today's Check-outs with Balance (if payment notifications enabled)
    if (settings.paymentNotifications) {
      const todayCheckOuts = await Booking.find({
        checkOutDate: { $gte: today, $lt: tomorrow },
        status: 'check-in'
      }).populate('roomId', 'roomName');

      if (todayCheckOuts.length > 0) {
        notifications.push({
          type: 'today_checkout',
          title: 'Check-outs Today',
          count: todayCheckOuts.length,
          message: `${todayCheckOuts.length} guest(s) departing today`,
          details: todayCheckOuts.map(b => ({
            id: b._id,
            guestName: b.name,
            roomName: b.roomName || 'N/A',
            totalAmount: b.totalAmount,
            advancePaid: b.advancePaid,
            balance: b.balance,
            paymentStatus: b.balance > 0 ? 'Pending' : 'Cleared'
          }))
        });
      }
    }

    // 4. Current Enquiries (always show if exist)
    const enquiries = await Booking.find({ status: 'enquiry' });
    if (enquiries.length > 0) {
      notifications.push({
        type: 'enquiries',
        title: 'Pending Enquiries',
        count: enquiries.length,
        message: `${enquiries.length} enquiry(ies) awaiting response`,
        details: enquiries.map(e => ({
          id: e._id,
          guestName: e.name,
          email: e.email,
          phone: e.phone,
          requestedCheckIn: e.checkedInDate,
          requestedCheckOut: e.checkOutDate,
          guests: e.guests,
          request: e.request || 'No special request'
        }))
      });
    }

    res.status(200).json({
      success: true,
      data: {
        date: new Date().toISOString().split('T')[0],
        notifications
      }
    });

  } catch (error) {
    next(error);
  }
};