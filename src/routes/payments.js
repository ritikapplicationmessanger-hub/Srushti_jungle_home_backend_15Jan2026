const express = require('express');
const router = express.Router();
const {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
} = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

router.use(auth);

router.get('/', roleAuth('admin', 'manager'), getAllPayments);
router.get('/:id', roleAuth('admin', 'manager'), getPaymentById);
router.post('/', roleAuth('admin', 'manager', 'staff'), createPayment);
router.put('/:id', roleAuth('admin', 'manager'), updatePayment);

module.exports = router;