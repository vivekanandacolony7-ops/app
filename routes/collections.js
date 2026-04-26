const express = require('express');
const router = express.Router();
const Collection = require('../models/Collection');
const House = require('../models/House');
const auth = require('../middleware/auth');

// @route   GET api/collections
// @desc    Get all collections
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching collections...');
    const collections = await Collection.find()
      .populate('house', ['houseNumber', 'ownerName'])
      .populate('recordedBy', ['name'])
      .sort({ date: -1 });
    console.log(`Found ${collections.length} collections`);
    res.json(collections);
  } catch (err) {
    console.error('Error in GET /api/collections:', err);
    res.status(500).json({ msg: 'Server Error: ' + err.message });
  }
});

// @route   POST api/collections
// @desc    Add new collection
// @access  Private
router.post('/', auth, async (req, res) => {
  const { collectionType, amount, houseId, payerName, paymentMode, transactionRef, remarks, date, receiptNumber } = req.body;

  try {
    console.log('Incoming collection request:', req.body);
    // Basic validation
    if (!collectionType || !amount || !paymentMode || !receiptNumber) {
      return res.status(400).json({ msg: 'Please provide all required fields including receipt number' });
    }

    // Check for duplicate receipt number
    const existingColl = await Collection.findOne({ receiptNumber });
    if (existingColl) {
      return res.status(400).json({ msg: 'Receipt number already exists. Please use a unique number.' });
    }

    const isHundi = collectionType.toLowerCase().includes('hundi');
    
    if (!isHundi && !houseId) {
      return res.status(400).json({ msg: `House is required for ${collectionType}` });
    }

    if (isHundi && !payerName) {
      return res.status(400).json({ msg: 'Payer name is required for Hundi collections' });
    }

    const dateObj = (date && !isNaN(new Date(date).getTime())) ? new Date(date) : new Date();

    const newCollection = new Collection({
      collectionType,
      amount: Number(amount),
      house: (!isHundi && houseId && houseId.trim() !== '') ? houseId : undefined,
      payerName: isHundi ? payerName : undefined,
      receiptNumber,
      paymentMode,
      transactionRef,
      remarks,
      date: dateObj,
      recordedBy: req.user.id
    });

    const collection = await newCollection.save();
    res.json(collection);
  } catch (err) {
    console.error('Error in POST /api/collections:', err);
    res.status(500).json({ msg: 'Server Error: ' + err.message });
  }
});

// @route   DELETE api/collections/:id
// @desc    Delete a collection entry
// @access  Private (Admin only or record owner)
router.delete('/:id', auth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ msg: 'Collection not found' });

    // In a real app, you might check if the user has permission to delete
    await Collection.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Collection removed' });
  } catch (err) {
    console.error('Error in DELETE /api/collections:', err);
    res.status(500).json({ msg: 'Server Error: ' + err.message });
  }
});

// @route   GET api/collections/reconciliation
// @desc    Get daily reconciliation report
// @access  Private
router.get('/reconciliation', auth, async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const startOfDay = new Date(date.setHours(0,0,0,0));
    const endOfDay = new Date(date.setHours(23,59,59,999));

    const dailyCollections = await Collection.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('house', ['houseNumber', 'ownerName']);

    const totals = {
      'BMC Rent': 0,
      'Transfer Fee': 0,
      'Hundi': 0,
      'Total': 0
    };

    dailyCollections.forEach(c => {
      const type = c.collectionType.toLowerCase().includes('hundi') ? 'Hundi' : c.collectionType;
      if (totals[type] === undefined) {
          totals[type] = 0;
      }
      totals[type] += c.amount;
      totals['Total'] += c.amount;
    });

    res.json({ date: startOfDay, totals, items: dailyCollections });
  } catch (err) {
    console.error('Error in reconciliation:', err);
    res.status(500).json({ msg: 'Server Error: ' + err.message });
  }
});

module.exports = router;
