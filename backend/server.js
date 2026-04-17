const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const dotenv   = require('dotenv');

// ── LOAD ENV VARIABLES (must be at top) ───────────────────────────
dotenv.config();

const app = express();

// ── MIDDLEWARE ─────────────────────────────────────────────────────
app.use(express.json());
app.use(cors());

// ── ROUTES ─────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/transactions',  require('./routes/transactions'));
app.use('/api/goals',         require('./routes/goals'));

// ── GLOBAL ERROR HANDLER ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ msg: 'Server error', error: err.message });
});

// ── DATABASE + START SERVER ────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running → http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Failed:', err.message);
    process.exit(1);
  });