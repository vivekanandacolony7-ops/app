const mongoose = require('mongoose');

const HouseSchema = new mongoose.Schema({
  houseNumber: {
    type: String,
    required: true,
    unique: true
  },
  ownerName: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String
  },
  address: {
    type: String
  },
  // Tracks the status for the *current* financial year
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    default: 'Unpaid'
  }
}, { timestamps: true });

module.exports = mongoose.model('House', HouseSchema);
