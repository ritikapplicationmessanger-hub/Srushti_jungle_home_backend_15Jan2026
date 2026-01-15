const express = require('express');
const router = express.Router();
const {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  checkIn,
  checkOut,
} = require('../controllers/bookingController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

router.use(auth);

router.get('/', roleAuth('admin', 'manager', 'staff'), getAllBookings);
router.get('/:id', roleAuth('admin', 'manager', 'staff'), getBookingById);
router.post('/', roleAuth('admin', 'manager', 'staff'), createBooking);
router.put('/:id', roleAuth('admin', 'manager', 'staff'), updateBooking);
router.delete('/:id', roleAuth('admin', 'manager'), deleteBooking);

// Special actions
router.post('/:id/checkin', roleAuth('admin', 'manager', 'staff'), checkIn);
router.post('/:id/checkout', roleAuth('admin', 'manager', 'staff'), checkOut);

module.exports = router;