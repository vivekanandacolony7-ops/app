const express = require('express');
const router = express.Router();
const House = require('../models/House');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');

// @route   GET api/payments
// @desc    Get all payments
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const payments = await Payment.find().populate('house', ['houseNumber', 'ownerName']).sort({ date: -1 });
    res.json(payments);
  } catch (err) {
    console.error('Error in GET /api/payments:', err);
    res.status(500).json({ msg: 'Server Error: ' + err.message });
  }
});

// @route   GET api/payments/house/:houseId
// @desc    Get payments for a specific house
// @access  Private
router.get('/house/:houseId', auth, async (req, res) => {
  try {
    const payments = await Payment.find({ house: req.params.houseId }).sort({ date: -1 });
    res.json(payments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/payments
// @desc    Add new payment (Mark as Paid)
// @access  Private
router.post('/', auth, async (req, res) => {
  const { houseId, amount, year, paymentMode, transactionRef, paymentType, receiptNumber } = req.body;

  try {
    // Check if receipt number is provided
    if (!receiptNumber) {
      return res.status(400).json({ msg: 'Receipt number is required' });
    }

    // Check for duplicate receipt number
    const existingPayment = await Payment.findOne({ receiptNumber });
    if (existingPayment) {
      return res.status(400).json({ msg: 'Receipt number already exists. Please use a unique number.' });
    }

    const newPayment = new Payment({
      house: houseId,
      amount,
      year,
      paymentMode,
      transactionRef,
      paymentType: paymentType || 'Maintenance',
      receiptNumber: receiptNumber
    });

    const payment = await newPayment.save();

    // Update house status to Paid only if it's Maintenance
    // Note: The main status logic is now dynamic in routes/houses.js based on payments
    // But we keep this for any legacy checks or quick updates if needed
    if (!paymentType || paymentType === 'Maintenance') {
        await House.findByIdAndUpdate(houseId, { paymentStatus: 'Paid' });
    }

    res.json(payment);
  } catch (err) {
    console.error('Error in POST /api/payments:', err);
    res.status(500).json({ msg: 'Server Error: ' + err.message });
  }
});

// @route   DELETE api/payments/:id
// @desc    Delete payment (Mark as Unpaid if it's the latest for the year)
// @access  Private
// Note: This logic might need refinement depending on requirements, but for now allows deleting a payment entry.
// If we delete a payment, we should check if there are other payments for this year. If not, set status to Unpaid.
router.delete('/:id', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ msg: 'Payment not found' });

    const houseId = payment.house;
    const year = payment.year;

    await Payment.findByIdAndDelete(req.params.id);

    // Check if any other MAINTENANCE payments exist for this house for the same year
    const otherMaintenancePayments = await Payment.find({ 
        house: houseId, 
        year: year,
        $or: [ { paymentType: 'Maintenance' }, { paymentType: { $exists: false } } ]
    });
    
    if (otherMaintenancePayments.length === 0) {
       // No other maintenance payments for this year, mark as Unpaid
       await House.findByIdAndUpdate(houseId, { paymentStatus: 'Unpaid' });
    }

    res.json({ msg: 'Payment removed' });
  } catch (err) {
    console.error('Error in DELETE /api/payments:', err);
    res.status(500).json({ msg: 'Server Error: ' + err.message });
  }
});

module.exports = router;
