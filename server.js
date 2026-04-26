const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const Expense = require('./models/Expense');
const dotenv = require('dotenv');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

// Security Middleware
app.use(helmet()); // Set security headers
// app.use(mongoSanitize()); // Prevent NoSQL injection - Incompatible with Express 5
// app.use(xss()); // Prevent XSS attacks - Incompatible with Express 5
app.use(hpp()); // Prevent HTTP Param Pollution

// Rate Limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);

// Middleware
app.use(bodyParser.json());
app.use(cors()); // Configure this if you have specific allowed origins

// Global Cache Control Middleware to prevent caching
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// Static folder
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    // Disable caching for all static files to ensure updates are seen immediately
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
}));

// DB Connection
const db = process.env.MONGO_URI;

if (!db && process.env.NODE_ENV === 'production') {
  console.error('CRITICAL: MONGO_URI is not defined in environment variables!');
}

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;

  try {
    await mongoose.connect(db || 'mongodb://localhost:27017/vivekananda_colony', {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      bufferCommands: false, // Disable buffering to see real errors immediately
    });
    console.log('MongoDB Connected');
  } catch (err) {
    console.error(`MongoDB Connection Error: ${err.message}`);
  }
};

// Middleware to ensure DB is connected before processing any request
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/houses', require('./routes/houses'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/ledger', require('./routes/ledger'));

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
}

module.exports = app;
