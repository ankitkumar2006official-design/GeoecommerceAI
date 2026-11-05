const mongoose = require('mongoose');
const { getModel } = require('./modelFactory');

const orderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  category: { type: String, default: 'General' },
  quantity: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true, default: 0 },
  cost: { type: Number, default: 0 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  orderId: {
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
    default: 'Unknown'
  },
  district: {
    type: String,
    default: 'Unknown'
  },
  state: {
    type: String,
    default: 'Unknown',
    index: true
  },
  region: {
    type: String,
    default: 'Other'
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  adSpend: {
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

orderSchema.index({ sellerId: 1, orderId: 1 }, { unique: true });
orderSchema.index({ sellerId: 1, orderDate: -1 });
orderSchema.index({ sellerId: 1, state: 1 });

const MongooseOrder = mongoose.model('Order', orderSchema);
module.exports = getModel('Order', MongooseOrder);

