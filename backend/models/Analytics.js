const mongoose = require('mongoose');
const { getModel } = require('./modelFactory');

const analyticsSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  snapshotDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  period: {
    type: String,
    default: 'ALL_TIME'
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  totalUnits: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  grossProfit: {
    type: Number,
    default: 0
  },
  profitMarginPct: {
    type: Number,
    default: 0
  },
  topStates: [
    {
      state: String,
      units: Number,
      revenue: Number
    }
  ],
  topProducts: [
    {
      productId: String,
      productName: String,
      units: Number,
      revenue: Number
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

analyticsSchema.index({ sellerId: 1, snapshotDate: -1 });
analyticsSchema.index({ sellerId: 1, period: 1 });

const MongooseAnalytics = mongoose.model('Analytics', analyticsSchema);
module.exports = getModel('Analytics', MongooseAnalytics);

