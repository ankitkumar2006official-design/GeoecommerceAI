const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  datasetId: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  orderId: {
    type: String,
    required: true,
    trim: true
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
    trim: true,
    index: true
  },
  orderDate: {
    type: Date,
    required: true,
    index: true
  },
  pincode: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  city: {
    type: String,
    trim: true,
    default: 'Unknown'
  },
  district: {
    type: String,
    trim: true,
    default: 'Unknown'
  },
  state: {
    type: String,
    trim: true,
    default: 'Unknown',
    index: true
  },
  region: {
    type: String,
    trim: true,
    default: 'Other'
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  sellingPrice: {
    type: Number,
    required: true,
    default: 0
  },
  costPrice: {
    type: Number,
    default: 0
  },
  returnStatus: {
    type: String,
    default: 'No'
  },
  cancellationStatus: {
    type: String,
    default: 'No'
  },
  discount: {
    type: Number,
    default: 0
  },
  inventoryQuantity: {
    type: Number,
    default: 50
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  adSpend: {
    type: Number,
    default: 0
  },
  lat: {
    type: Number
  },
  lng: {
    type: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

saleSchema.index({ sellerId: 1, datasetId: 1, orderDate: 1 });
saleSchema.index({ sellerId: 1, datasetId: 1, city: 1 });
saleSchema.index({ sellerId: 1, datasetId: 1, state: 1, category: 1 });
saleSchema.index({ sellerId: 1, datasetId: 1, orderId: 1, productId: 1 });
saleSchema.index({ sellerId: 1, datasetId: 1, sellingPrice: 1 });
saleSchema.index({ sellerId: 1, orderDate: 1 });
saleSchema.index({ sellerId: 1, state: 1, category: 1 });
saleSchema.index({ sellerId: 1, orderId: 1, productId: 1 });

const MongooseSale = mongoose.model('Sale', saleSchema);
const { getModel } = require('./modelFactory');

module.exports = getModel('Sale', MongooseSale);
