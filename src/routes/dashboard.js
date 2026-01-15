const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getOccupancyRate,
  getRecentBookings,
  getUpcomingCheckins,
  getTodayNotifications,
} = require('../controllers/dashboardController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

router.use(auth);

router.get('/stats', roleAuth('admin', 'manager', 'staff'), getDashboardStats);
router.get('/occupancy', roleAuth('admin', 'manager', 'staff'), getOccupancyRate);
router.get('/recent-bookings', roleAuth('admin', 'manager', 'staff'), getRecentBookings);
router.get('/upcoming-checkins', roleAuth('admin', 'manager', 'staff'), getUpcomingCheckins);
router.get('/notifications',roleAuth('admin', 'manager', 'staff'), getTodayNotifications);

module.exports = router;