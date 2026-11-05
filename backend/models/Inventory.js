const mongoose = require('mongoose');
const { getModel } = require('./modelFactory');

const inventorySchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  productId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  currentStock: {
    type: Number,
    required: true,
    default: 0
  },
  safetyStock: {
    type: Number,
    default: 10
  },
  reorderPoint: {
    type: Number,
    default: 25
  },
  unitCost: {
    type: Number,
    default: 0
  },
  unitPrice: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Optimal', 'Low Stock', 'Critical', 'Overstocked'],
    default: 'Optimal',
    index: true
  },
  lastRestockedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

inventorySchema.index({ sellerId: 1, productId: 1 }, { unique: true });
inventorySchema.index({ sellerId: 1, status: 1 });

const MongooseInventory = mongoose.model('Inventory', inventorySchema);
module.exports = getModel('Inventory', MongooseInventory);

