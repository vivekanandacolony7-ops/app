const express = require('express');
const router = express.Router();
const House = require('../models/House');
const Payment = require('../models/Payment');
const Collection = require('../models/Collection');
const auth = require('../middleware/auth');

// @route   GET api/houses/:id/ledger
// @desc    Get all financial history for a specific house
// @access  Private
router.get('/:id/ledger', auth, async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) {
      return res.status(404).json({ msg: 'House not found' });
    }

    // Fetch Maintenance/Temple Fund Payments
    const payments = await Payment.find({ house: req.params.id })
      .sort({ year: -1, date: -1 })
      .lean();

    // Fetch BMC Rent/Transfer Fee Collections
    const collections = await Collection.find({ house: req.params.id })
      .sort({ date: -1 })
      .lean();

    res.json({
      house,
      history: {
        payments,
        collections
      }
    });
  } catch (err) {
    console.error('Error fetching house ledger:', err);
    res.status(500).json({ msg: 'Server Error: ' + err.message });
  }
});

module.exports = router;
