const PropertySetting = require('../models/PropertySetting');
const BookingSetting = require('../models/BookingSetting');
const PricingSetting = require('../models/PricingSetting');
const NotificationSetting = require('../models/NotificationSetting');
const AuditLog = require('../models/AuditLog');
const Room = require('../models/Room');

exports.getPropertySettings = async (req, res, next) => {
  try {
    const settings = await PropertySetting.findOne();
    res.status(200).json({ success: true, data: settings || {} });
  } catch (error) {
    next(error);
  }
};

exports.updatePropertySettings = async (req, res, next) => {
  try {
    const settings = await PropertySetting.findOneAndUpdate({}, req.body, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      activity: 'Updated property settings',
      time: new Date().toISOString(),
    });

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// Similar pattern for other settings
exports.getBookingSettings = async (req, res, next) => {
  try {
    const settings = await BookingSetting.findOne();
    res.status(200).json({ success: true, data: settings || {} });
  } catch (error) {
    next(error);
  }
};

exports.updateBookingSettings = async (req, res, next) => {
  try {
    const settings = await BookingSetting.findOneAndUpdate({}, req.body, {
      upsert: true,
      new: true,
    });

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

exports.getAllPricingSettings = async (req, res, next) => {
  try {
    const pricings = await PricingSetting.find({}).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: pricings });
  } catch (error) {
    next(error);
  }
};

exports.createPricingSetting = async (req, res, next) => {
  try {
    const pricing = new PricingSetting(req.body);
    await pricing.save();
    res.status(201).json({ success: true, data: pricing });
  } catch (error) {
    next(error);
  }
};

// exports.updatePricingSetting = async (req, res, next) => {
//   try {
//     const pricing = await PricingSetting.findByIdAndUpdate(req.params.id, req.body, { new: true });
//     if (!pricing) return res.status(404).json({ success: false, message: 'Not found' });
//     res.status(200).json({ success: true, data: pricing });
//   } catch (error) {
//     next(error);
//   }
// };

exports.updatePricingSetting = async (req, res, next) => {
  try {
    const pricing = await PricingSetting.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!pricing) {
      return res.status(404).json({ success: false, message: 'Pricing setting not found' });
    }

    // Check if 'active' field was updated in this request
    if (req.body.active !== undefined) {
      const isNowActive = pricing.active; // new value after update

      // Fetch all rooms
      const rooms = await Room.find({});

      if (isNowActive) {
        // Apply seasonal percentage increase/decrease
        const percent = pricing.seasonPricePercent || 0; // e.g. 20 or -15
        const multiplier = 1 + percent / 100;

        for (const room of rooms) {
          if (room.basePrice) {
            room.price = Math.round(room.basePrice * multiplier);
            await room.save();
          }
        }
      } else {
        // Revert all rooms to their original basePrice
        for (const room of rooms) {
          if (room.basePrice && room.price !== room.basePrice) {
            room.price = room.basePrice;
            await room.save();
          }
        }
      }
    }

    res.status(200).json({ success: true, data: pricing });
  } catch (error) {
    next(error);
  }
};

exports.deletePricingSetting = async (req, res, next) => {
  try {
    await PricingSetting.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Pricing rule deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getNotificationSettings = async (req, res, next) => {
  try {
    const settings = await NotificationSetting.findOne();
    res.status(200).json({ success: true, data: settings || {} });
  } catch (error) {
    next(error);
  }
};

exports.updateNotificationSettings = async (req, res, next) => {
  try {
    const settings = await NotificationSetting.findOneAndUpdate({}, req.body, {
      upsert: true,
      new: true,
    });
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};