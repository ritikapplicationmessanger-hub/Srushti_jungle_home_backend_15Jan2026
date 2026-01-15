const express = require('express');
const router = express.Router();
const {
  getPropertySettings,
  updatePropertySettings,
  getBookingSettings,
  updateBookingSettings,
  getAllPricingSettings,
  createPricingSetting,
  updatePricingSetting,
  deletePricingSetting,
  getNotificationSettings,
  updateNotificationSettings,
} = require('../controllers/settingController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

router.use(auth);
router.use(roleAuth('admin', 'manager')); // All settings require admin/manager

router.get('/property', getPropertySettings);
router.put('/property', updatePropertySettings);

router.get('/booking', getBookingSettings);
router.put('/booking', updateBookingSettings);

router.get('/pricing', getAllPricingSettings);
router.post('/pricing', createPricingSetting);
router.put('/pricing/:id', updatePricingSetting);
router.delete('/pricing/:id', deletePricingSetting);

router.get('/notifications', getNotificationSettings);
router.put('/notifications', updateNotificationSettings);

module.exports = router;