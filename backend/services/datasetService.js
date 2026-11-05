const mongoose = require('mongoose');
const User = require('../models/User');
const Sale = require('../models/Sale');
const UploadLog = require('../models/UploadLog');
const { syncDerivedCollections, clearSellerCollections } = require('./syncService');

/**
 * Resolves the active dataset ID for a seller.
 * Ensures all queries strictly run against the active, verified dataset.
 */
async function resolveActiveDatasetId(sellerId) {
  if (!sellerId) return null;
  const sId = new mongoose.Types.ObjectId(sellerId);

  // 1. Check user record for explicit activeDatasetId
  const user = await User.findById(sId).select('activeDatasetId').lean();
  if (user && user.activeDatasetId) {
    // Verify records exist for this active dataset
    const count = await Sale.countDocuments({ sellerId: sId, datasetId: user.activeDatasetId });
    if (count > 0) {
      return user.activeDatasetId;
    }
  }

  // 2. Check latest active upload log
  const activeLog = await UploadLog.findOne({ sellerId: sId, isActive: true, status: { $ne: 'failed' } })
    .sort({ createdAt: -1 })
    .lean();
  if (activeLog && activeLog.datasetId) {
    await User.findByIdAndUpdate(sId, { activeDatasetId: activeLog.datasetId });
    return activeLog.datasetId;
  }

  // 3. Check most recent upload log regardless of active flag
  const recentLog = await UploadLog.findOne({ sellerId: sId, status: { $ne: 'failed' } })
    .sort({ createdAt: -1 })
    .lean();
  if (recentLog && recentLog.datasetId) {
    await User.findByIdAndUpdate(sId, { activeDatasetId: recentLog.datasetId });
    await UploadLog.findByIdAndUpdate(recentLog._id, { isActive: true });
    return recentLog.datasetId;
  }

  // 4. Check if sales exist with any datasetId
  const recentSale = await Sale.findOne({ sellerId: sId, datasetId: { $exists: true, $ne: null } })
    .sort({ createdAt: -1 })
    .lean();
  if (recentSale && recentSale.datasetId) {
    await User.findByIdAndUpdate(sId, { activeDatasetId: recentSale.datasetId });
    return recentSale.datasetId;
  }

  // 5. Check if legacy un-tagged sales exist, migrate them to an isolated legacy datasetId
  const legacyCount = await Sale.countDocuments({ sellerId: sId, $or: [{ datasetId: null }, { datasetId: { $exists: false } }] });
  if (legacyCount > 0) {
    const legacyDatasetId = `ds_legacy_${Date.now()}`;
    await Sale.updateMany(
      { sellerId: sId, $or: [{ datasetId: null }, { datasetId: { $exists: false } }] },
      { $set: { datasetId: legacyDatasetId } }
    );
    await User.findByIdAndUpdate(sId, { activeDatasetId: legacyDatasetId });
    return legacyDatasetId;
  }

  return null;
}

/**
 * Switch active dataset for a seller and resync derived analytics
 */
async function setActiveDataset(sellerId, datasetId) {
  const sId = new mongoose.Types.ObjectId(sellerId);
  const count = await Sale.countDocuments({ sellerId: sId, datasetId });
  if (count === 0) {
    throw new Error(`Dataset "${datasetId}" does not exist or contains no records for this seller.`);
  }

  await User.findByIdAndUpdate(sId, { activeDatasetId: datasetId });
  await UploadLog.updateMany({ sellerId: sId }, { $set: { isActive: false } });
  await UploadLog.updateMany({ sellerId: sId, datasetId }, { $set: { isActive: true } });

  // Resync derived collections (Product, Order, Inventory) for this active dataset
  const activeSales = await Sale.find({ sellerId: sId, datasetId }).lean();
  await clearSellerCollections(sId);
  await syncDerivedCollections(sId, activeSales);

  return { datasetId, recordCount: count };
}

/**
 * List all available datasets for a seller
 */
async function listSellerDatasets(sellerId) {
  const sId = new mongoose.Types.ObjectId(sellerId);
  const activeId = await resolveActiveDatasetId(sellerId);

  // Group sales by datasetId
  const datasetStats = await Sale.aggregate([
    { $match: { sellerId: sId } },
    {
      $group: {
        _id: '$datasetId',
        recordCount: { $sum: 1 },
        totalRevenue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } },
        totalUnits: { $sum: '$quantity' },
        distinctProducts: { $addToSet: '$productId' },
        distinctCities: { $addToSet: '$city' },
        firstDate: { $min: '$orderDate' },
        lastDate: { $max: '$orderDate' }
      }
    }
  ]);

  const logs = await UploadLog.find({ sellerId: sId }).sort({ createdAt: -1 }).lean();
  const logMap = new Map();
  logs.forEach((l) => {
    if (l.datasetId) logMap.set(l.datasetId, l);
  });

  return datasetStats.map((ds) => {
    const log = logMap.get(ds._id);
    return {
      datasetId: ds._id || 'legacy',
      filename: log ? log.filename : 'Uploaded Sales Dataset',
      recordCount: ds.recordCount,
      totalRevenue: Math.round(ds.totalRevenue),
      totalUnits: ds.totalUnits,
      productCount: ds.distinctProducts.length,
      cityCount: ds.distinctCities.length,
      dateRange: {
        from: ds.firstDate ? ds.firstDate.toISOString().split('T')[0] : null,
        to: ds.lastDate ? ds.lastDate.toISOString().split('T')[0] : null
      },
      isActive: ds._id === activeId,
      uploadedAt: log ? log.createdAt : null
    };
  });
}

module.exports = {
  resolveActiveDatasetId,
  setActiveDataset,
  listSellerDatasets
};

