const mongoose = require('mongoose');
const { getModel } = require('./modelFactory');

const productSchema = new mongoose.Schema({
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
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  costPrice: {
    type: Number,
    default: 0
  },
  sellingPrice: {
    type: Number,
    required: true,
    default: 0
  },
  inventoryQuantity: {
    type: Number,
    default: 50
  },
  leadTimeDays: {
    type: Number,
    default: 7
  },
  safetyStock: {
    type: Number,
    default: 10
  },
  reorderPoint: {
    type: Number,
    default: 25
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

productSchema.index({ sellerId: 1, productId: 1 }, { unique: true });
productSchema.index({ sellerId: 1, category: 1 });

const MongooseProduct = mongoose.model('Product', productSchema);
module.exports = getModel('Product', MongooseProduct);

