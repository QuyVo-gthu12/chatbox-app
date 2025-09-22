// app.js
const express = require('express');
const bodyParser = require('body-parser');
const mediaRoutes = require('./routes/media.routes');

const app = express();

// ✅ Danh sách origin được phép
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173'];

// ✅ Middleware CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Nếu là preflight request (OPTIONS) → trả về 200 luôn
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ✅ Body-parser config
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ✅ Routes
app.use('/media', mediaRoutes);

// ✅ Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    message: 'Internal Server Error',
    error: err.message || 'Unknown error'
  });
});

module.exports = app;
