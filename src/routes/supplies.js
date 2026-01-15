const express = require('express');
const router = express.Router();
const {
  getAllSupplies,
  getSupplyById,
  createSupply,
  updateSupply,
  deleteSupply,
  getLowStockSupplies,
} = require('../controllers/supplyController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

router.use(auth);

router.get('/', roleAuth('admin', 'manager', 'staff'), getAllSupplies);
router.get('/low-stock', roleAuth('admin', 'manager'), getLowStockSupplies);
router.get('/:id', roleAuth('admin', 'manager'), getSupplyById);
router.post('/', roleAuth('admin', 'manager'), createSupply);
router.put('/:id', roleAuth('admin', 'manager'), updateSupply);
router.delete('/:id', roleAuth('admin', 'manager'), deleteSupply);

module.exports = router;