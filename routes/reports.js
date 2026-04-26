const express = require('express');
const router = express.Router();
const House = require('../models/House');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');

// @route   GET api/reports/:year
// @desc    Get Paid and Unpaid houses for a specific year
// @access  Private
router.get('/:year', auth, async (req, res) => {
  try {
    const year = req.params.year;
    if (!year) {
      return res.status(400).json({ msg: 'Invalid year' });
    }

    // 1. Get all houses
    const allHouses = await House.find().collation({ locale: "en", numericOrdering: true }).sort({ houseNumber: 1 }).lean();

    const type = req.query.type || 'Maintenance';
    const monthParam = req.query.month;
    const monthNum = monthParam ? parseInt(monthParam, 10) : null;
    
    const query = { year: year };
    
    if (type === 'Maintenance') {
        query.$or = [ { paymentType: 'Maintenance' }, { paymentType: { $exists: false } } ];
    } else if (type !== 'All') {
        query.paymentType = type;
    }
    
    let payments = await Payment.find(query).lean();
    if (monthNum && monthNum >= 1 && monthNum <= 12) {
        payments = payments.filter(p => {
            if (!p.date) return false;
            const d = new Date(p.date);
            return d.getMonth() + 1 === monthNum;
        });
    }

    // 3. Create a set of house IDs that have paid
    const paidHouseIds = new Set(payments.map(p => p.house.toString()));

    // 4. Filter houses into Paid and Unpaid arrays
    const paidHouses = [];
    const unpaidHouses = [];

    // Helper to format house for response
    const formatHouse = (house, payment = null) => ({
      _id: house._id,
      houseNumber: house.houseNumber,
      ownerName: house.ownerName,
      phoneNumber: house.phoneNumber,
      paymentDate: payment ? payment.date : null,
      amount: payment ? payment.amount : null,
      paymentType: payment ? (payment.paymentType || 'Maintenance') : null,
      receiptNumber: payment ? payment.receiptNumber : null
    });

    // Create a map of payments by house ID for quick access
    const paymentMap = {};
    payments.forEach(p => {
        paymentMap[p.house.toString()] = p;
    });

    allHouses.forEach(house => {
      if (paidHouseIds.has(house._id.toString())) {
        paidHouses.push(formatHouse(house, paymentMap[house._id.toString()]));
      } else {
        unpaidHouses.push(formatHouse(house));
      }
    });

    // Custom sorting for house numbers (handling mixed alpha-numeric like "12A")
    const houseSorter = (a, b) => {
        const numA = parseInt(a.houseNumber.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.houseNumber.replace(/\D/g, '')) || 0;
        if (numA === numB) {
            return a.houseNumber.localeCompare(b.houseNumber);
        }
        return numA - numB;
    };

    paidHouses.sort(houseSorter);
    unpaidHouses.sort(houseSorter);

    res.json({
      year,
      stats: {
        total: allHouses.length,
        paid: paidHouses.length,
        unpaid: unpaidHouses.length
      },
      paid: paidHouses,
      unpaid: unpaidHouses
    });

  } catch (err) {
    console.error('Error in GET /api/reports:', err);
    res.status(500).json({ msg: 'Server Error: ' + err.message });
  }
});

module.exports = router;
