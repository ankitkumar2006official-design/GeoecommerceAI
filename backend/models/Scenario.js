const mongoose = require('mongoose');

const scenarioSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  parameters: {
    priceChangePct: { type: Number, default: 0 },
    inventoryChangePct: { type: Number, default: 0 },
    adSpendChangePct: { type: Number, default: 0 },
    targetRegion: { type: String, default: 'All' },
    targetCategory: { type: String, default: 'All' }
  },
  projectedMetrics: {
    projectedRevenue: Number,
    projectedProfit: Number,
    projectedUnits: Number,
    revenueChangePct: Number,
    profitChangePct: Number,
    estimatedStockRequired: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const MongooseScenario = mongoose.model('Scenario', scenarioSchema);
const { getModel } = require('./modelFactory');

module.exports = getModel('Scenario', MongooseScenario);
