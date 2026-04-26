const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  house: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  year: {
    type: String,
    required: true
  },
  paymentType: {
    type: String,
    default: 'Maintenance',
    required: true
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Bank'],
    required: true
  },
  transactionRef: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  },
  receiptNumber: {
      type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
