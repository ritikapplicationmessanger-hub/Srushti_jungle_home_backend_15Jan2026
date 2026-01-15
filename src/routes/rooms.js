const express = require('express');
const router = express.Router();
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomAvailability,
} = require('../controllers/roomController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

router.use(auth);

router.get('/', getAllRooms);
router.get('/availability', getRoomAvailability); // Public or staff+
router.get('/:id', getRoomById);
router.post('/', roleAuth('admin', 'manager'), createRoom);
router.put('/:id', roleAuth('admin', 'manager'), updateRoom);
router.delete('/:id', roleAuth('admin', 'manager'), deleteRoom);

module.exports = router;