const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Auth Rate Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 login/register requests per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes'
});

// @route   GET api/auth/verify
// @desc    Verify user token
// @access  Private
router.get('/verify', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error('Error in GET /api/auth/verify:', err);
    res.status(500).json({ msg: 'Server error: ' + err.message });
  }
});

// @route   POST api/auth/create-user
// @desc    Create a new user (Admin only)
// @access  Private
router.post('/create-user', auth, async (req, res) => {
  const { username, password, role } = req.body;

  try {
    // Check if requester is admin
    const requester = await User.findById(req.user.id);
    if (requester.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied. Admin privileges required.' });
    }

    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({ 
        username, 
        password,
        role: role || 'viewer' 
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    res.json({ msg: 'User created successfully', user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/auth/update-profile
// @desc    Update user profile (username)
// @access  Private
router.put('/update-profile', auth, async (req, res) => {
  const { username } = req.body;
  try {
    let user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Check if username is taken
    if (username !== user.username) {
        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(400).json({ msg: 'Username already taken' });
        }
        user.username = username;
        await user.save();
    }

    res.json({ msg: 'Profile updated successfully', user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid current password' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ msg: 'Password updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/users
// @desc    Get all users (Admin only)
// @access  Private
router.get('/users', auth, async (req, res) => {
  try {
    const requester = await User.findById(req.user.id);
    if (requester.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }

    const users = await User.find().select('-password').sort({ username: 1 });
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/auth/users/:id
// @desc    Delete a user (Admin only)
// @access  Private
router.delete('/users/:id', auth, async (req, res) => {
  try {
    const requester = await User.findById(req.user.id);
    if (requester.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }

    // Prevent deleting yourself
    if (req.params.id === req.user.id) {
        return res.status(400).json({ msg: 'Cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: 'User removed' });
  } catch (err) {
    console.error('Error in DELETE /api/auth/users:', err);
    res.status(500).json({ msg: 'Server error: ' + err.message });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  try {
    let user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret',
      { expiresIn: 360000 },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error('Error in POST /api/auth/login:', err);
    res.status(500).json({ msg: 'Server error: ' + err.message });
  }
});

module.exports = router;
