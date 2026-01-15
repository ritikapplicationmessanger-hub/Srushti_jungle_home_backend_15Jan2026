const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const userRoutes = require('./users');
const roomRoutes = require('./rooms');
const bookingRoutes = require('./bookings');
const paymentRoutes = require('./payments');
const settingRoutes = require('./settings');
const supplyRoutes = require('./supplies');
const maintenanceRoutes = require('./maintenance');
const dashboardRoutes = require('./dashboard'); // if separate

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/rooms', roomRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/settings', settingRoutes);
router.use('/supplies', supplyRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/dashboard', dashboardRoutes); // optional

module.exports = router;