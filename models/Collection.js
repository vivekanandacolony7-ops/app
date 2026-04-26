const mongoose = require('mongoose');

const CollectionSchema = new mongoose.Schema({
  collectionType: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  house: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House',
    required: function() {
      return this.collectionType !== 'Hundi' && this.collectionType !== 'Hundi Collection';
    }
  },
  payerName: {
    type: String,
    required: function() {
      return this.collectionType === 'Hundi' || this.collectionType === 'Hundi Collection';
    }
  },
  receiptNumber: {
    type: String,
    required: true
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Bank', 'UPI'],
    required: true
  },
  transactionRef: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  remarks: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Collection', CollectionSchema);
