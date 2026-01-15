const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

router.use(auth); // All user routes require authentication

router.get('/', roleAuth('admin', 'manager'), getAllUsers);
router.get('/:id', roleAuth('admin', 'manager'), getUserById);
router.post('/', roleAuth('admin'), createUser);
router.put('/:id', roleAuth('admin'), updateUser);
router.delete('/:id', roleAuth('admin'), deleteUser);

module.exports = router;