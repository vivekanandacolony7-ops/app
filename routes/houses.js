const express = require('express');
const router = express.Router();
const House = require('../models/House');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');

// @route   GET api/houses
// @desc    Get all houses with payment status for a specific year
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let year = req.query.year;
    if (!year) {
        const currentYear = new Date().getFullYear();
        const endYearShort = (currentYear + 1).toString().slice(-2);
        year = `${currentYear}-${endYearShort}`;
    }
    
    // Get all houses
    let houses;
    try {
        houses = await House.find().collation({ locale: "en", numericOrdering: true }).sort({ houseNumber: 1 });
    } catch (collationErr) {
        console.warn('Collation not supported, falling back to basic sort');
        houses = await House.find().sort({ houseNumber: 1 });
    }
    
    // Get all payments for the specified year
    const payments = await Payment.find({ year: year });
    
    // Create a set of house IDs that have paid Maintenance
    const paidHouseIds = new Set(
        payments
            .filter(p => p.house && (!p.paymentType || p.paymentType === 'Maintenance'))
            .map(p => p.house.toString())
    );
    
    // Map houses to include dynamic payment status
    const housesWithStatus = houses.map(house => {
      const houseObj = house.toObject();
      houseObj.paymentStatus = paidHouseIds.has(house._id.toString()) ? 'Paid' : 'Unpaid';
      return houseObj;
    });

    res.json(housesWithStatus);
  } catch (err) {
    console.error('Error in GET /api/houses:', err);
    res.status(500).json({ msg: 'Server Error: ' + err.message });
  }
});

// @route   POST api/houses
// @desc    Add new house
// @access  Private
router.post('/', auth, async (req, res) => {
  const { houseNumber, ownerName, phoneNumber, address } = req.body;

  try {
    let house = await House.findOne({ houseNumber });
    if (house) {
      return res.status(400).json({ msg: 'House already exists' });
    }

    house = new House({
      houseNumber,
      ownerName,
      phoneNumber,
      address,
      paymentStatus: 'Unpaid'
    });

    const newHouse = await house.save();
    res.json(newHouse);
  } catch (err) {
    console.error('Error in POST /api/houses:', err);
    res.status(500).json({ msg: 'Server Error: ' + err.message });
  }
});

// @route   PUT api/houses/:id
// @desc    Update house
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const { houseNumber, ownerName, phoneNumber, address } = req.body;

  // Build house object
  const houseFields = {};
  if (houseNumber) houseFields.houseNumber = houseNumber;
  if (ownerName) houseFields.ownerName = ownerName;
  if (phoneNumber) houseFields.phoneNumber = phoneNumber;
  if (address) houseFields.address = address;

  try {
    let house = await House.findById(req.params.id);

    if (!house) return res.status(404).json({ msg: 'House not found' });

    house = await House.findByIdAndUpdate(
      req.params.id,
      { $set: houseFields },
      { new: true }
    );

    res.json(house);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/houses/:id
// @desc    Delete house
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    let house = await House.findById(req.params.id);

    if (!house) return res.status(404).json({ msg: 'House not found' });

    await House.findByIdAndDelete(req.params.id);
    
    // Also delete payments associated with this house
    await Payment.deleteMany({ house: req.params.id });

    res.json({ msg: 'House removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
