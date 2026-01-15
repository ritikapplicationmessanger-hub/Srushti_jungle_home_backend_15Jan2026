const Supply = require('../models/Supply');
const AuditLog = require('../models/AuditLog');

exports.getAllSupplies = async (req, res, next) => {
  try {
    const supplies = await Supply.find({}).sort({ name: 1 });
    res.status(200).json({
      success: true,
      count: supplies.length,
      data: supplies,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSupplyById = async (req, res, next) => {
  try {
    const supply = await Supply.findById(req.params.id);
    if (!supply) {
      return res.status(404).json({ success: false, message: 'Supply item not found' });
    }
    res.status(200).json({ success: true, data: supply });
  } catch (error) {
    next(error);
  }
};

exports.createSupply = async (req, res, next) => {
  try {
    const supply = new Supply(req.body);
    await supply.save();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      activity: 'Created new supply item',
      time: new Date().toISOString(),
      additionalData: { supplyName: supply.name, quantity: supply.quantity },
    });

    res.status(201).json({ success: true, data: supply });
  } catch (error) {
    next(error);
  }
};

exports.updateSupply = async (req, res, next) => {
  try {
    const supply = await Supply.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!supply) {
      return res.status(404).json({ success: false, message: 'Supply item not found' });
    }

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      activity: 'Updated supply item',
      time: new Date().toISOString(),
      additionalData: { supplyName: supply.name, supplyId: supply._id },
    });

    res.status(200).json({ success: true, data: supply });
  } catch (error) {
    next(error);
  }
};

exports.deleteSupply = async (req, res, next) => {
  try {
    const supply = await Supply.findByIdAndDelete(req.params.id);
    if (!supply) {
      return res.status(404).json({ success: false, message: 'Supply item not found' });
    }

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      activity: 'Deleted supply item',
      time: new Date().toISOString(),
      additionalData: { supplyName: supply.name },
    });

    res.status(200).json({ success: true, message: 'Supply item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// exports.getLowStockSupplies = async (req, res, next) => {
//   try {
//     const lowStock = await Supply.find({ quantity: { $lte: '$minQuantity' } });
//     res.status(200).json({
//       success: true,
//       count: lowStock.length,
//       data: lowStock,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

exports.getLowStockSupplies = async (req, res, next) => {
  try {
    const lowStock = await Supply.find({
      $expr: { $lte: ['$quantity', '$minQuantity'] }
    })
    .select('name category quantity minQuantity unit supplier notes')
    .sort({ quantity: 1 });

    res.status(200).json({
      success: true,
      count: lowStock.length,
      data: lowStock,
    });
  } catch (error) {
    next(error);
  }
};