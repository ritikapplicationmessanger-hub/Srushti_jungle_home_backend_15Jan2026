const express = require('express');
const router = express.Router();
const {
  getAllMaintenance,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  completeMaintenance,
  deleteMaintenance,
  getOverdueTasks,
} = require('../controllers/maintenanceController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

router.use(auth);

router.get('/', roleAuth('admin', 'manager', 'staff'), getAllMaintenance);
router.get('/overdue', roleAuth('admin', 'manager'), getOverdueTasks);
router.get('/:id', roleAuth('admin', 'manager', 'staff'), getMaintenanceById);
router.post('/', roleAuth('admin', 'manager'), createMaintenance);
router.put('/:id', roleAuth('admin', 'manager'), updateMaintenance);
router.post('/:id/complete', roleAuth('admin', 'manager', 'staff'), completeMaintenance);
router.delete('/:id', roleAuth('admin', 'manager'), deleteMaintenance);

module.exports = router;