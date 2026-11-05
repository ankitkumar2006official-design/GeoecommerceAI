const mongoose = require('mongoose');

const uploadLogSchema = new mongoose.Schema({
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
  datasetName: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  filename: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    default: 0
  },
  totalRows: {
    type: Number,
    default: 0
  },
  validRows: {
    type: Number,
    default: 0
  },
  invalidRows: {
    type: Number,
    default: 0
  },
  duplicateRows: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['completed', 'failed', 'partial'],
    default: 'completed'
  },
  errors: [
    {
      row: Number,
      reason: String,
      dataSnippet: Object
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { suppressReservedKeysWarning: true });

const MongooseUploadLog = mongoose.model('UploadLog', uploadLogSchema);
const { getModel } = require('./modelFactory');

module.exports = getModel('UploadLog', MongooseUploadLog);
