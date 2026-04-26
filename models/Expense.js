const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  voucherNumber: {
    type: String,
    required: true
  },
  paidTo: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Bank', 'Cheque', 'UPI', 'Other'],
    default: 'Cash'
  },
  referenceNumber: {
    type: String
  },
  category: {
    type: String,
    required: true
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', ExpenseSchema);
