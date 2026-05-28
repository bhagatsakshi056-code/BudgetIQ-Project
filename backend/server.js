// 1. Imports
const express  = require('express');
const mongoose = require('mongoose');
const dotenv   = require('dotenv');
const path     = require('path');
const cors     = require('cors');

dotenv.config();

// 2. Initialize app
const app = express();

// 3. Middlewares
app.use(express.json());

// ✅ CORS — allows your frontend to call the API from any origin
app.use(cors({
  origin: '*',          // allow all origins (safe for local dev)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 4. Routes
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/goals',        require('./routes/goals'));
app.use('/api/ai',           require('./routes/ai'));

// 5. Global error handler — catches any unhandled route errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ msg: 'Internal server error' });
});

// 6. Database connection + start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    app.listen(5000, () => {
      console.log('🚀 Server running on http://localhost:5000');
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);   // stop server if DB can't connect — prevents silent failures
  });