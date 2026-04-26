const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Expense = require('../models/Expense');

// @route   GET api/expenses
// @desc    Get all expenses
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ paymentDate: -1 });
    res.json(expenses);
  } catch (err) {
    console.error('Error in GET /api/expenses:', err);
    res.status(500).json({ msg: 'Server error: ' + err.message });
  }
});

// @route   POST api/expenses
// @desc    Record a new expense
// @access  Private
router.post('/', auth, async (req, res) => {
  const { paidTo, amount, description, paymentDate, paymentMode, referenceNumber, category, voucherNumber } = req.body;

  if (!voucherNumber) {
    return res.status(400).json({ msg: 'Voucher number is required' });
  }

  try {
    const existingExpense = await Expense.findOne({ voucherNumber });
    if (existingExpense) {
      return res.status(400).json({ msg: 'Voucher number already exists. Please use a unique number.' });
    }

    const effectiveDate = paymentDate ? new Date(paymentDate) : new Date();

    const newExpense = new Expense({
      voucherNumber,
      paidTo,
      amount,
      description,
      paymentDate: effectiveDate,
      paymentMode,
      referenceNumber,
      category,
      recordedBy: req.user.id
    });

    const expense = await newExpense.save();
    return res.json(expense);
  } catch (err) {
    console.error('Error in POST /api/expenses:', err);
    return res.status(500).json({ msg: 'Server error while recording expense: ' + err.message });
  }
});

// @route   DELETE api/expenses/:id
// @desc    Delete an expense
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ msg: 'Expense not found' });

    await Expense.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Expense removed' });
  } catch (err) {
    console.error('Error in DELETE /api/expenses:', err);
    res.status(500).json({ msg: 'Server error: ' + err.message });
  }
});

module.exports = router;
